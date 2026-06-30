import { useState } from 'react'
import Editor from '../components/Editor'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import PageContainer from '../components/ui/PageContainer'
import { getRoomUsername, saveRoomUsername } from '../utils/session'

export default function RoomPage({ navigate, roomId }) {
  const [username, setUsername] = useState(() => getRoomUsername(roomId))
  const [draftUsername, setDraftUsername] = useState(() => getRoomUsername(roomId))
  const [error, setError] = useState('')

  function handleContinue(event) {
    event.preventDefault()
    const trimmedUsername = draftUsername.trim()

    if (!trimmedUsername) {
      setError('Username is required.')
      return
    }

    saveRoomUsername(roomId, trimmedUsername)
    setUsername(trimmedUsername)
    setError('')
  }

  if (!username) {
    return (
      <PageContainer className="form-page" navigate={navigate}>
        <Card className="form-card motion-in">
          <p className="eyebrow">Almost there</p>
          <h1>Enter your name</h1>
          <p className="page-description">
            CodeRoom needs a username before connecting you to room <code>{roomId}</code>.
          </p>
          <form className="stacked-form" onSubmit={handleContinue}>
            <Input
              autoComplete="name"
              error={error}
              id="room-username"
              label="Username"
              onChange={setDraftUsername}
              placeholder="Jordan"
              value={draftUsername}
            />
            <Button type="submit">Continue to Editor</Button>
          </form>
        </Card>
      </PageContainer>
    )
  }

  return <Editor navigate={navigate} roomId={roomId} username={username} />
}
