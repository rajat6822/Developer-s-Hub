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
  const confirmedDocumentRef = useRef('')
  const documentVersionRef = useRef(null)
  const pendingDeltaRef = useRef(null)
  const queuedDocumentRef = useRef(null)
  const joinRequestRef = useRef(0)
  const joinInFlightRef = useRef(false)
  const hasJoinedRef = useRef(false)
  const lastTypingEmitRef = useRef(0)
  const stopTypingTimerRef = useRef(null)

  const setDocumentSnapshot = useCallback((nextDocument) => {
    documentRef.current = nextDocument
    setDocumentText(nextDocument)
  }, [])

  const setConfirmedSnapshot = useCallback(
    (nextDocument, nextVersion) => {
      confirmedDocumentRef.current = nextDocument
      documentVersionRef.current = nextVersion
      setDocumentSnapshot(nextDocument)
      setDocumentVersion(nextVersion)
    },
    [setDocumentSnapshot],
  )

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
        pendingDeltaRef.current = null
        queuedDocumentRef.current = null
        setConfirmedSnapshot(response.document, response.documentVersion)
        setHostUsername(response.hostUsername || null)
        setIsHost(Boolean(response.isHost))
        setStatus(nextStatus === 'recovering' ? 'sync-recovered' : 'synced')
      })
    },
    [roomId, setConfirmedSnapshot, username],
  )

  useEffect(() => {
    function handleReceiveDelta(delta) {
      const nextConfirmedDocument = applyDelta(confirmedDocumentRef.current, delta)
      confirmedDocumentRef.current = nextConfirmedDocument
      documentVersionRef.current = delta.updatedDocumentVersion
      setDocumentVersion(delta.updatedDocumentVersion)

      if (pendingDeltaRef.current) {
        const nextDocument = applyDelta(documentRef.current, delta)
        setDocumentSnapshot(nextDocument)

        if (queuedDocumentRef.current !== null) {
          queuedDocumentRef.current = applyDelta(queuedDocumentRef.current, delta)
        }

        return
      }

      setDocumentSnapshot(nextConfirmedDocument)
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
  }, [joinRoom, setConfirmedSnapshot, setDocumentSnapshot, username])

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

      emitTyping()
      setDocumentSnapshot(nextDocument)

      if (pendingDeltaRef.current) {
        queuedDocumentRef.current = nextDocument
        return
      }

      const sendDocument = (documentToSend) => {
        const baseDocument = confirmedDocumentRef.current
        const baseDocumentVersion = documentVersionRef.current
        const delta = generateDelta(baseDocument, documentToSend)

        if (!delta) {
          queuedDocumentRef.current = null
          setStatus('synced')
          return
        }

        pendingDeltaRef.current = delta
        setStatus('saving')

        socket.emit('send-delta', { roomId, baseDocumentVersion, ...delta }, (response) => {
          pendingDeltaRef.current = null

          if (!response?.ok) {
            queuedDocumentRef.current = null

            if (typeof response?.document === 'string') {
              setConfirmedSnapshot(response.document, response.documentVersion)
              setStatus('sync-recovered')
              return
            }

            setStatus('recovering')
            joinRoom('recovering')
            return
          }

          if (typeof response.document === 'string') {
            confirmedDocumentRef.current = response.document
          } else {
            confirmedDocumentRef.current = documentToSend
          }

          documentVersionRef.current = response.updatedDocumentVersion
          setDocumentVersion(response.updatedDocumentVersion)

          const queuedDocument = queuedDocumentRef.current
          queuedDocumentRef.current = null

          if (queuedDocument !== null && queuedDocument !== confirmedDocumentRef.current) {
            sendDocument(queuedDocument)
            return
          }

          setDocumentSnapshot(confirmedDocumentRef.current)
          setStatus('synced')
        })
      }

      sendDocument(nextDocument)
    },
    [emitTyping, joinRoom, roomId, setConfirmedSnapshot, setDocumentSnapshot, status],
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
