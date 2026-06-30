import { useState } from 'react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import ErrorMessage from '../components/ui/ErrorMessage'
import Input from '../components/ui/Input'
import PageContainer from '../components/ui/PageContainer'
import { getFriendlyApiError, joinRoom } from '../utils/api'
import { saveRoomUsername } from '../utils/session'

export default function JoinRoomPage({ navigate }) {
  const [username, setUsername] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const trimmedUsername = username.trim()
    const trimmedRoomCode = roomCode.trim()
    const nextErrors = {}

    if (!trimmedUsername) {
      nextErrors.username = 'Username is required.'
    }

    if (!trimmedRoomCode) {
      nextErrors.roomCode = 'Room code is required.'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setFormError('')
    setIsSubmitting(true)

    try {
      await joinRoom(trimmedRoomCode, trimmedUsername)
      saveRoomUsername(trimmedRoomCode, trimmedUsername)
      navigate(`/room/${encodeURIComponent(trimmedRoomCode)}`)
    } catch (apiError) {
      setFormError(getFriendlyApiError(apiError, 'Unable to join that room.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageContainer className="form-page" navigate={navigate}>
      <section className="auth-layout">
        <div className="auth-copy motion-in">
          <p className="eyebrow">Enter a room</p>
          <h1>Join Room</h1>
          <p className="page-description">
            Paste your teammate's room code and enter with a name the team can recognize.
          </p>
          <div className="auth-note">
            <span />
            <p>Room codes are case-insensitive and cleaned before joining.</p>
          </div>
        </div>

        <Card className="form-card motion-in">
          <form className="stacked-form" onSubmit={handleSubmit}>
            <Input
              autoComplete="name"
              error={errors.username}
              id="join-username"
              label="Username"
              onChange={setUsername}
              placeholder="Sam"
              value={username}
            />
            <Input
              autoComplete="off"
              error={errors.roomCode}
              id="join-room-code"
              label="Room Code"
              onChange={(value) => setRoomCode(value.toUpperCase())}
              placeholder="ROOM123"
              value={roomCode}
            />
            <ErrorMessage>{formError}</ErrorMessage>
            <Button isLoading={isSubmitting} type="submit">
              {isSubmitting ? 'Joining room' : 'Join Room'}
            </Button>
          </form>
        </Card>
      </section>
    </PageContainer>
  )
}
