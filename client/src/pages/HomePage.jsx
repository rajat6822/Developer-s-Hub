import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import PageContainer from '../components/ui/PageContainer'

export default function HomePage({ navigate }) {
  return (
    <PageContainer className="home-page" navigate={navigate}>
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Collaborative Code Editor</p>
          <h1>CodeRoom</h1>
          <p className="hero-description">
            Create a focused coding room, invite teammates, and edit the same document together in
            real time.
          </p>
          <div className="hero-actions">
            <Button onClick={() => navigate('/create')}>Create Room</Button>
            <Button onClick={() => navigate('/join')} variant="secondary">
              Join Room
            </Button>
          </div>
        </div>

        <Card className="preview-card">
          <div className="preview-toolbar">
            <span />
            <span />
            <span />
          </div>
          <pre aria-label="CodeRoom preview">
            <code>{`function pairProgram(room) {
  room.connect('team')
  room.syncChanges()
  return 'ship together'
}`}</code>
          </pre>
        </Card>
      </section>
    </PageContainer>
  )
}
