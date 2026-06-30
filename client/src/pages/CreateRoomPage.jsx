import { useState } from 'react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import ErrorMessage from '../components/ui/ErrorMessage'
import Input from '../components/ui/Input'
import PageContainer from '../components/ui/PageContainer'
import { createRoom, getFriendlyApiError } from '../utils/api'
import { saveRoomUsername } from '../utils/session'

export default function CreateRoomPage({ navigate }) {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const trimmedUsername = username.trim()

    if (!trimmedUsername) {
      setError('Username is required.')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      const result = await createRoom(trimmedUsername)
      saveRoomUsername(result.roomCode, trimmedUsername)
      navigate(`/room/${encodeURIComponent(result.roomCode)}`)
    } catch (apiError) {
      setError(getFriendlyApiError(apiError, 'Unable to create a room right now.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageContainer className="form-page" navigate={navigate}>
      <Card className="form-card">
        <p className="eyebrow">Start a session</p>
        <h1>Create Room</h1>
        <p className="page-description">
          Choose the name your teammates will see, then create a fresh collaborative room.
        </p>

        <form className="stacked-form" onSubmit={handleSubmit}>
          <Input
            autoComplete="name"
            error={error === 'Username is required.' ? error : ''}
            id="create-username"
            label="Username"
            onChange={setUsername}
            placeholder="Alex"
            value={username}
          />
          <ErrorMessage>{error !== 'Username is required.' ? error : ''}</ErrorMessage>
          <Button isLoading={isSubmitting} type="submit">
            {isSubmitting ? 'Creating room' : 'Create Room'}
          </Button>
        </form>
      </Card>
    </PageContainer>
  )
}
