import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import PageContainer from '../components/ui/PageContainer'

export default function NotFoundPage({ navigate }) {
  return (
    <PageContainer className="form-page" navigate={navigate}>
      <Card className="form-card not-found-card motion-in">
        <p className="eyebrow">404</p>
        <h1>Room not found</h1>
        <p className="page-description">
          This page does not exist. Return home or join with a valid room code.
        </p>
        <div className="hero-actions compact-actions">
          <Button onClick={() => navigate('/')}>Go Home</Button>
          <Button onClick={() => navigate('/join')} variant="secondary">
            Join Room
          </Button>
        </div>
      </Card>
    </PageContainer>
  )
}
