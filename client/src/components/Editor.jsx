import { useState } from 'react'
import { useEditorSync } from '../hooks/useEditorSync'
import Button from './ui/Button'
import ErrorMessage from './ui/ErrorMessage'
import LoadingSpinner from './ui/LoadingSpinner'
import Modal from './ui/Modal'

function formatVersion(documentVersion) {
  if (!documentVersion) {
    return 'No version yet'
  }

  return new Date(documentVersion).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function getStatusLabel(status) {
  if (status === 'connecting') return 'Connecting'
  if (status === 'reconnecting') return 'Reconnecting'
  if (status === 'recovering') return 'Recovering'
  if (status === 'sync-recovered') return 'Recovered'
  if (status === 'saving') return 'Saving'
  if (status === 'synced') return 'Synced'
  if (status === 'offline') return 'Server offline'
  if (status === 'leaving') return 'Leaving'
  if (status === 'reconnect-failed') return 'Reconnect failed'
  if (status === 'room-closed') return 'Room closed'
  if (status === 'kicked') return 'Removed'
  return status
}

function getStatusError(status) {
  if (status === 'Room not found.') {
    return 'Room not found. Check the code or create a new room.'
  }

  if (status === 'offline') {
    return 'Connection failed. Please confirm the server is online.'
  }

  if (status === 'reconnect-failed') {
    return 'Reconnect failed. Check your connection and refresh if needed.'
  }

  if (status === 'room-closed') {
    return 'This room has been closed by the host. Editing is disabled.'
  }

  if (status === 'kicked') {
    return 'You were removed from this room.'
  }

  if (status === 'sync-recovered') {
    return 'The editor recovered from a rejected change and synced the latest server document.'
  }

  if (status === 'sync-failed' || status === 'save-failed') {
    return 'Unexpected sync error. Please refresh and try again.'
  }

  return ''
}

export default function Editor({ navigate, roomId, username }) {
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false)
  const [hostActionError, setHostActionError] = useState('')
  const {
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
  } = useEditorSync(roomId, username)
  const isConnecting = status === 'connecting' || status === 'reconnecting' || status === 'recovering'
  const isLeaving = status === 'leaving'
  const isRoomClosed = status === 'room-closed' || status === 'kicked'
  const statusError = getStatusError(status)
  const hasParticipants = participants.length > 0
  const typingLabel = typingUsers.length === 0
    ? ''
    : typingUsers.length === 1
      ? `${typingUsers[0]} is typing...`
      : `${typingUsers.join(', ')} are typing...`

  async function handleLeave() {
    await leaveRoom()
    navigate('/join')
  }

  async function handleCloseRoom() {
    setHostActionError('')
    const response = await closeRoom()

    if (!response?.ok) {
      setHostActionError(response?.reason || 'Unable to close room.')
      return
    }

    setIsCloseModalOpen(false)
  }

  return (
    <main className="editor-shell motion-in">
      <header className="editor-header">
        <div>
          <p className="eyebrow">CodeRoom / Live Build</p>
          <h1>Shared Editor</h1>
          <p className="editor-subtitle">Editing as {username}</p>
        </div>
        <div className="editor-actions">
          {isHost && !isRoomClosed ? (
            <Button onClick={() => setIsCloseModalOpen(true)} variant="secondary">
              Close Room
            </Button>
          ) : null}
          <Button isLoading={isLeaving} onClick={handleLeave} variant="ghost">
            {isLeaving ? 'Leaving' : 'Leave'}
          </Button>
        </div>
        <dl className="sync-meta" aria-label="Document sync status">
          <div>
            <dt>Room</dt>
            <dd>{roomId}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{getStatusLabel(status)}</dd>
          </div>
          <div>
            <dt>Version</dt>
            <dd>{formatVersion(documentVersion)}</dd>
          </div>
        </dl>
      </header>

      {isConnecting ? (
        <div className="editor-loading">
          <LoadingSpinner label="Connecting to room" />
        </div>
      ) : null}

      <ErrorMessage>{statusError}</ErrorMessage>

      {isRoomClosed ? (
        <section className="room-closed-panel" aria-live="assertive">
          <div>
            <p className="eyebrow">Session ended</p>
            <h2>Room Closed</h2>
            <p>The shared document is now read-only. Return home or create another room.</p>
          </div>
          <Button onClick={() => navigate('/')}>Return Home</Button>
        </section>
      ) : null}

      <section className="editor-stage">
        <aside className="editor-sidebar" aria-label="Room controls">
          <div>
            <p className="mn">Current room</p>
            <strong>{roomId}</strong>
            <span>{getStatusLabel(status)}</span>
          </div>

          <section className="participants-panel" aria-label="Live participants">
            <div className="panel-heading">
              <p className="mn">Participants</p>
              <small>{participants.length}</small>
            </div>
            {hasParticipants ? (
              <ul>
                {participants.map((participant) => (
                  <li key={participant.username}>
                    <span className="online-dot" aria-hidden="true" />
                    <span>{participant.username}</span>
                    {participant.username === hostUsername ? <em>Host</em> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">Waiting for teammates to join.</p>
            )}
          </section>

          <section className="typing-panel" aria-live="polite">
            <p className="mn">Presence</p>
            <p>{typingLabel || 'No one is typing right now.'}</p>
          </section>
        </aside>
        <div className="editor-window">
          <div className="preview-toolbar editor-toolbar">
            <span />
            <span />
            <span />
            <p>{username}.js</p>
          </div>
          <textarea
            className="shared-editor"
            disabled={isConnecting || isRoomClosed}
            value={documentText}
            onChange={(event) => updateDocument(event.target.value)}
            spellCheck="false"
            aria-label="Shared code editor"
            placeholder="Start typing code..."
          />
        </div>
      </section>

      <Modal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        title="Close this room?"
      >
        <div className="modal-body">
          <p>Everyone in this room will be moved into a read-only closed state and new joins will be blocked.</p>
          <ErrorMessage>{hostActionError}</ErrorMessage>
          <div className="modal-actions">
            <Button onClick={() => setIsCloseModalOpen(false)} variant="ghost">
              Cancel
            </Button>
            <Button onClick={handleCloseRoom} variant="secondary">
              Close Room
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  )
}
