import Button from './Button'

export default function Modal({ children, isOpen, onClose, title }) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-modal="true" className="modal" role="dialog">
        <header className="modal-header">
          <h2>{title}</h2>
          <Button aria-label="Close dialog" onClick={onClose} variant="ghost">
            Close
          </Button>
        </header>
        {children}
      </section>
    </div>
  )
}
