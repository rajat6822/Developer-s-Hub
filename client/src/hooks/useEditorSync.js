import { useCallback, useEffect, useRef, useState } from 'react'
import { applyDelta, generateDelta } from '../utils/delta'
import { socket } from '../utils/socket'

export function useEditorSync(roomId, username) {
  const [documentText, setDocumentText] = useState('')
  const [status, setStatus] = useState('connecting')
  const [documentVersion, setDocumentVersion] = useState(null)
  const [participants, setParticipants] = useState([])
  const [typingUsers, setTypingUsers] = useState([])
  const [hostUsername, setHostUsername] = useState(null)
  const [isHost, setIsHost] = useState(false)
  const documentRef = useRef('')
  const joinRequestRef = useRef(0)
  const joinInFlightRef = useRef(false)
  const hasJoinedRef = useRef(false)
  const lastTypingEmitRef = useRef(0)
  const stopTypingTimerRef = useRef(null)

  const setDocumentSnapshot = useCallback((nextDocument) => {
    documentRef.current = nextDocument
    setDocumentText(nextDocument)
  }, [])

  const joinRoom = useCallback(
    (nextStatus = 'connecting') => {
      if (!roomId || !username || joinInFlightRef.current) {
        return
      }

      const requestId = joinRequestRef.current + 1
      joinRequestRef.current = requestId
      joinInFlightRef.current = true
      setStatus(nextStatus)

      socket.timeout(5000).emit('join-document', { roomId, username }, (error, response) => {
        if (joinRequestRef.current !== requestId) {
          return
        }

        joinInFlightRef.current = false

        if (error || !response?.ok) {
          hasJoinedRef.current = false
          setStatus(response?.reason || (nextStatus === 'reconnecting' ? 'reconnect-failed' : 'sync-failed'))
          return
        }

        hasJoinedRef.current = true
        setDocumentSnapshot(response.document)
        setDocumentVersion(response.documentVersion)
        setHostUsername(response.hostUsername || null)
        setIsHost(Boolean(response.isHost))
        setStatus(nextStatus === 'recovering' ? 'sync-recovered' : 'synced')
      })
    },
    [roomId, setDocumentSnapshot, username],
  )

  useEffect(() => {
    function handleReceiveDelta(delta) {
      setDocumentSnapshot(applyDelta(documentRef.current, delta))
      setDocumentVersion(delta.updatedDocumentVersion)
    }

    function handleParticipantList(nextParticipants = []) {
      const seen = new Set()
      const uniqueParticipants = nextParticipants.filter((participant) => {
        const participantName = participant?.username

        if (!participantName || seen.has(participantName)) {
          return false
        }

        seen.add(participantName)
        return true
      })

      setParticipants(uniqueParticipants)
    }

    function handleTyping({ username: typingUsername } = {}) {
      if (!typingUsername || typingUsername === username) {
        return
      }

      setTypingUsers((currentUsers) => {
        if (currentUsers.includes(typingUsername)) {
          return currentUsers
        }

        return [...currentUsers, typingUsername]
      })
    }

    function handleStopTyping({ username: typingUsername } = {}) {
      if (!typingUsername) {
        return
      }

      setTypingUsers((currentUsers) => currentUsers.filter((currentUsername) => currentUsername !== typingUsername))
    }

    function handleRoomClosed() {
      hasJoinedRef.current = false
      joinInFlightRef.current = false
      setParticipants([])
      setTypingUsers([])
      setStatus('room-closed')
    }

    function handleKicked() {
      hasJoinedRef.current = false
      joinInFlightRef.current = false
      setStatus('kicked')
      socket.disconnect()
    }

    function handleConnect() {
      joinRoom(hasJoinedRef.current ? 'reconnecting' : 'connecting')
    }

    function handleDisconnect() {
      if (hasJoinedRef.current) {
        setStatus('offline')
      }
    }

    function handleConnectError() {
      setStatus(hasJoinedRef.current ? 'reconnect-failed' : 'offline')
    }

    socket.on('receive-delta', handleReceiveDelta)
    socket.on('participant-list', handleParticipantList)
    socket.on('typing', handleTyping)
    socket.on('stopTyping', handleStopTyping)
    socket.on('room-closed', handleRoomClosed)
    socket.on('kicked', handleKicked)
    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleConnectError)

    if (socket.connected) {
      joinRoom('connecting')
    } else {
      socket.connect()
    }

    return () => {
      joinRequestRef.current += 1
      joinInFlightRef.current = false
      window.clearTimeout(stopTypingTimerRef.current)
      socket.off('receive-delta', handleReceiveDelta)
      socket.off('participant-list', handleParticipantList)
      socket.off('typing', handleTyping)
      socket.off('stopTyping', handleStopTyping)
      socket.off('room-closed', handleRoomClosed)
      socket.off('kicked', handleKicked)
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleConnectError)
    }
  }, [joinRoom, setDocumentSnapshot, username])

  const emitTyping = useCallback(() => {
    if (!socket.connected || status === 'room-closed' || status === 'kicked') {
      return
    }

    const now = Date.now()
    if (now - lastTypingEmitRef.current > 1200) {
      socket.emit('typing', { roomId, username })
      lastTypingEmitRef.current = now
    }

    window.clearTimeout(stopTypingTimerRef.current)
    stopTypingTimerRef.current = window.setTimeout(() => {
      socket.emit('stopTyping', { roomId, username })
      lastTypingEmitRef.current = 0
    }, 1400)
  }, [roomId, status, username])

  const updateDocument = useCallback(
    (nextDocument) => {
      if (status === 'room-closed' || status === 'kicked') {
        return
      }

      const previousDocument = documentRef.current
      const delta = generateDelta(documentRef.current, nextDocument)
      if (!delta) {
        return
      }

      emitTyping()
      setDocumentSnapshot(nextDocument)
      setStatus('saving')

      socket.emit('send-delta', { roomId, ...delta }, (response) => {
        if (!response?.ok) {
          if (typeof response?.document === 'string') {
            setDocumentSnapshot(response.document)
            setDocumentVersion(response.documentVersion)
            setStatus('sync-recovered')
            return
          }

          setDocumentSnapshot(previousDocument)
          setStatus('recovering')
          joinRoom('recovering')
          return
        }

        setDocumentVersion(response.updatedDocumentVersion)
        setStatus('synced')
      })
    },
    [emitTyping, joinRoom, roomId, setDocumentSnapshot, status],
  )

  const leaveRoom = useCallback(
    () =>
      new Promise((resolve) => {
        setStatus('leaving')

        function finish() {
          window.clearTimeout(stopTypingTimerRef.current)
          joinRequestRef.current += 1
          joinInFlightRef.current = false
          hasJoinedRef.current = false
          socket.disconnect()
          resolve()
        }

        if (!socket.connected) {
          finish()
          return
        }

        socket.timeout(3000).emit('leave-room', { roomId }, () => {
          finish()
        })
      }),
    [roomId],
  )

  const closeRoom = useCallback(
    () =>
      new Promise((resolve) => {
        if (!socket.connected) {
          resolve({
            ok: false,
            reason: 'Server offline. Please reconnect before closing the room.',
          })
          return
        }

        socket.timeout(5000).emit('close-room', { roomId }, (error, response) => {
          if (error) {
            resolve({
              ok: false,
              reason: 'Unable to close room. Please try again.',
            })
            return
          }

          resolve(response)
        })
      }),
    [roomId],
  )

  return {
    closeRoom,
    documentText,
    documentVersion,
    hostUsername,
    isHost,
    leaveRoom,
    participants,
    status,
    typingUsers,
    updateDocument,
  }
}
