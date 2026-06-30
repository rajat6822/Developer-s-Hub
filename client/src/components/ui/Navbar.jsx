import Button from './Button'

export default function Navbar({ navigate }) {
  return (
    <header className="navbar">
      <button aria-label="Go to CodeRoom home" className="brand" onClick={() => navigate('/')} type="button">
        <span className="brand-mark" aria-hidden="true">
          <span className="brand-bracket">&lt;</span>
          <span className="brand-core">
            <span />
            <span />
          </span>
          <span className="brand-bracket">/&gt;</span>
        </span>
      </button>
      <nav aria-label="Primary navigation">
        <Button onClick={() => navigate('/join')} variant="ghost">
          Join
        </Button>
        <Button onClick={() => navigate('/create')} variant="secondary">
          Create
        </Button>
      </nav>
    </header>
  )
}
