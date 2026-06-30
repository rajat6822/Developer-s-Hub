import Button from './Button'

export default function Navbar({ navigate }) {
  return (
    <header className="navbar">
      <button className="brand" onClick={() => navigate('/')} type="button">
        <span className="brand-mark" aria-hidden="true">C ✦ R</span>
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
