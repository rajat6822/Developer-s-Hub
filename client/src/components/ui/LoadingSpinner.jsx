export default function LoadingSpinner({ label = 'Loading' }) {
  return (
    <span className="loading-spinner" role="status">
      <span aria-hidden="true" />
      <span>{label}</span>
    </span>
  )
}
