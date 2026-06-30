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
  if (status === 'saving') return 'Saving'
  if (status === 'synced') return 'Synced'
  if (status === 'offline') return 'Server offline'
  return status
}

function getStatusError(status) {
  if (status === 'Room not found.') {
    return 'Room not found. Check the code or create a new room.'
  }

  if (status === 'offline') {
    return 'Connection failed. Please confirm the server is online.'
  }

  if (status === 'sync-failed' || status === 'save-failed') {
    return 'Unexpected sync error. Please refresh and try again.'
  }

  return ''
}

export default function Editor({ navigate, roomId, username }) {
  const { documentText, documentVersion, status, updateDocument } = useEditorSync(roomId, username)
  const isConnecting = status === 'connecting'
  const statusError = getStatusError(status)

  return (
    <main className="editor-shell">
      <header className="editor-header">
        <div>
          <p className="eyebrow">CodeRoom</p>
          <h1>Shared Editor</h1>
          <p className="editor-subtitle">Editing as {username}</p>
        </div>
        <Button onClick={() => navigate('/join')} variant="ghost">
          Leave
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

      <textarea
        className="shared-editor"
        disabled={isConnecting}
        value={documentText}
        onChange={(event) => updateDocument(event.target.value)}
        spellCheck="false"
        aria-label="Shared code editor"
        placeholder="Start typing code..."
      />
    </main>
  )
}
