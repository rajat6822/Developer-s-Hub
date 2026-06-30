import { useEditorSync } from '../hooks/useEditorSync'
import Button from './ui/Button'
import ErrorMessage from './ui/ErrorMessage'
import LoadingSpinner from './ui/LoadingSpinner'

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

  if (status === 'sync-recovered') {
    return 'The editor recovered from a rejected change and synced the latest server document.'
  }

  if (status === 'sync-failed' || status === 'save-failed') {
    return 'Unexpected sync error. Please refresh and try again.'
  }

  return ''
}

export default function Editor({ navigate, roomId, username }) {
  const { documentText, documentVersion, leaveRoom, status, updateDocument } = useEditorSync(roomId, username)
  const isConnecting = status === 'connecting' || status === 'reconnecting' || status === 'recovering'
  const isLeaving = status === 'leaving'
  const statusError = getStatusError(status)

  async function handleLeave() {
    await leaveRoom()
    navigate('/join')
  }

  return (
    <main className="editor-shell motion-in">
      <header className="editor-header">
        <div>
          <p className="eyebrow">CodeRoom / Live Build</p>
          <h1>Shared Editor</h1>
          <p className="editor-subtitle">Editing as {username}</p>
        </div>
        <Button isLoading={isLeaving} onClick={handleLeave} variant="ghost">
          {isLeaving ? 'Leaving' : 'Leave'}
        </Button>
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

      <section className="editor-stage">
        <aside className="editor-sidebar" aria-label="Room controls">
          <p className="mn">Current room</p>
          <strong>{roomId}</strong>
          <span>{getStatusLabel(status)}</span>
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
            disabled={isConnecting}
            value={documentText}
            onChange={(event) => updateDocument(event.target.value)}
            spellCheck="false"
            aria-label="Shared code editor"
            placeholder="Start typing code..."
          />
        </div>
      </section>
    </main>
  )
}
