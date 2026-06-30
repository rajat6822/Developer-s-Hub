export default function ErrorMessage({ children, id }) {
  if (!children) {
    return null
  }

  return (
    <p className="error-message" id={id} role="alert">
      {children}
    </p>
  )
}
