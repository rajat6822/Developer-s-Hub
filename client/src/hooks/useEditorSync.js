import { useCallback, useEffect, useRef, useState } from 'react'
import { applyDelta, generateDelta } from '../utils/delta'
import { socket } from '../utils/socket'

export function useEditorSync(roomId) {
  const [documentText, setDocumentText] = useState('')
  const [status, setStatus] = useState('connecting')
  const [documentVersion, setDocumentVersion] = useState(null)
  const documentRef = useRef('')

  const setDocumentSnapshot = useCallback((nextDocument) => {
    documentRef.current = nextDocument
    setDocumentText(nextDocument)
  }, [])

  useEffect(() => {
    function handleReceiveDelta(delta) {
      setDocumentSnapshot(applyDelta(documentRef.current, delta))
      setDocumentVersion(delta.updatedDocumentVersion)
    }

    socket.connect()
    socket.emit('join-document', { roomId }, (response) => {
      if (!response?.ok) {
        setStatus(response?.reason || 'sync-failed')
        return
      }

      setDocumentSnapshot(response.document)
      setDocumentVersion(response.documentVersion)
      setStatus('synced')
    })

    socket.on('receive-delta', handleReceiveDelta)
    socket.on('connect_error', () => setStatus('offline'))

    return () => {
      socket.off('receive-delta', handleReceiveDelta)
      socket.off('connect_error')
    }
  }, [roomId, setDocumentSnapshot])

  const updateDocument = useCallback(
    (nextDocument) => {
      const delta = generateDelta(documentRef.current, nextDocument)
      if (!delta) {
        return
      }

      setDocumentSnapshot(nextDocument)
      setStatus('saving')

      socket.emit('send-delta', { roomId, ...delta }, (response) => {
        if (!response?.ok) {
          setStatus(response?.reason || 'save-failed')
          return
        }

        setDocumentVersion(response.updatedDocumentVersion)
        setStatus('synced')
      })
    },
    [roomId, setDocumentSnapshot],
  )

  return {
    documentText,
    documentVersion,
    status,
    updateDocument,
  }
}
