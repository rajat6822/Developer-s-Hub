import { useMemo } from 'react'
import { useEditorSync } from '../hooks/useEditorSync'

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

export default function Editor() {
  const roomId = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('roomId') || params.get('room') || 'DEMO'
  }, [])

  const { documentText, documentVersion, status, updateDocument } = useEditorSync(roomId)

  return (
    <main className="editor-shell">
      <header className="editor-header">
        <div>
          <p className="eyebrow">CodeRoom</p>
          <h1>Shared Editor</h1>
        </div>
        <dl className="sync-meta" aria-label="Document sync status">
          <div>
            <dt>Room</dt>
            <dd>{roomId}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{status}</dd>
          </div>
          <div>
            <dt>Version</dt>
            <dd>{formatVersion(documentVersion)}</dd>
          </div>
        </dl>
      </header>

      <textarea
        className="shared-editor"
        value={documentText}
        onChange={(event) => updateDocument(event.target.value)}
        spellCheck="false"
        aria-label="Shared code editor"
        placeholder="Start typing code..."
      />
    </main>
  )
}
