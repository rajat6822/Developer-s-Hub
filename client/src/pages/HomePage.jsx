import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import PageContainer from '../components/ui/PageContainer'

export default function HomePage({ navigate }) {
  return (
    <PageContainer className="home-page" navigate={navigate}>
      <section className="hero-section">
        <div className="hero-copy motion-in">
          <h1>
            CodeRoom
            <span>builds</span>
          </h1>
          <div className="hero-actions hero-actions-floating">
            <Button onClick={() => navigate('/create')}>Create Room</Button>
            <Button onClick={() => navigate('/join')} variant="secondary">
              Join Room
            </Button>
          </div>
        </div>

        <Card className="preview-card hero-code-card motion-in">
          <div className="preview-toolbar">
            <span />
            <span />
            <span />
            <p>room/ALPHA</p>
          </div>
          <pre aria-label="CodeRoom preview">
            <code>{`const room = await coderoom.create({
  host: 'Arun',
  mode: 'collaborative'
})

room.on('delta', patch => {
  editor.apply(patch)
  presence.update()
})`}</code>
          </pre>
          <div className="preview-status">
            <span />
            <p>3 teammates editing now</p>
          </div>
        </Card>
        <div className="hero-footer-line motion-in">
          <p className="mn">Collaborative Code Editor</p>
          <p className="mn">Delta sync / Live rooms / Clean review flow</p>
        </div>
      </section>

      <section className="hero-img-holder motion-in" aria-label="CodeRoom workspace preview">
        <div className="hero-img">
          <div className="workspace-frame">
            <div className="workspace-rail">
              <span />
              <span />
              <span />
            </div>
            <div className="workspace-grid">
              <div className="workspace-panel tall">
                <p>session.js</p>
                <strong>Presence online</strong>
              </div>
              <div className="workspace-panel">
                <p>sync</p>
                <strong>4ms patch</strong>
              </div>
              <div className="workspace-panel accent">
                <p>review</p>
                <strong>Ship together</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="featured-work" aria-label="CodeRoom features">
        <div className="featured-titles motion-in">
          <div className="featured-title-wrapper">
            <h1 className="featured-title">Live Workspace</h1>
          </div>
          <div className="featured-title-wrapper">
            <h1 className="featured-title">Focused Rooms</h1>
          </div>
          <div className="featured-title-wrapper">
            <h1 className="featured-title">Delta Sync</h1>
          </div>
          <div className="featured-title-wrapper">
            <h1 className="featured-title">Shared Review</h1>
          </div>
        </div>
        <div className="featured-work-footer">
          <p className="mn">Workspace System [ 4 ]</p>
          <p className="mn">///////////////////</p>
          <p className="mn">Code / Learn / Build / Repeat</p>
        </div>
      </section>

      <section className="feature-grid services" aria-label="CodeRoom details">
        <Card className="feature-card service-card card-yellow motion-in">
          <span className="feature-index">01</span>
          <h2>Create focused rooms</h2>
          <p>Spin up a room, share the code, and start with a clean document.</p>
        </Card>
        <Card className="feature-card service-card card-blue motion-in">
          <span className="feature-index">02</span>
          <h2>Sync real edits</h2>
          <p>Send compact text deltas instead of replacing the whole document.</p>
        </Card>
        <Card className="feature-card service-card card-cream motion-in">
          <span className="feature-index">03</span>
          <h2>Stay present</h2>
          <p>Keep the session readable with room status, identity, and connection feedback.</p>
        </Card>
      </section>
    </PageContainer>
  )
}
