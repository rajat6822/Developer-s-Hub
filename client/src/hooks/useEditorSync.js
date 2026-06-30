import { useCallback, useEffect, useRef, useState } from 'react'
import { applyDelta, generateDelta } from '../utils/delta'
import { socket } from '../utils/socket'

export function useEditorSync(roomId, username) {
  const [documentText, setDocumentText] = useState('')
  const [status, setStatus] = useState('connecting')
  const [documentVersion, setDocumentVersion] = useState(null)
  const documentRef = useRef('')
  const joinRequestRef = useRef(0)
  const joinInFlightRef = useRef(false)
  const hasJoinedRef = useRef(false)

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
      socket.off('receive-delta', handleReceiveDelta)
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleConnectError)
    }
  }, [joinRoom, setDocumentSnapshot])

  const updateDocument = useCallback(
    (nextDocument) => {
      const previousDocument = documentRef.current
      const delta = generateDelta(documentRef.current, nextDocument)
      if (!delta) {
        return
      }

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
    [joinRoom, roomId, setDocumentSnapshot],
  )

  const leaveRoom = useCallback(
    () =>
      new Promise((resolve) => {
        setStatus('leaving')

        function finish() {
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

  return {
    documentText,
    documentVersion,
    leaveRoom,
    status,
    updateDocument,
  }
}
