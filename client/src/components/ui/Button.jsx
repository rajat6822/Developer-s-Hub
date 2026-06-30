export default function Button({
  children,
  className = '',
  disabled = false,
  isLoading = false,
  onClick,
  type = 'button',
  variant = 'primary',
  ...props
}) {
  return (
    <button
      className={`button button-${variant} ${className}`.trim()}
      disabled={disabled || isLoading}
      onClick={onClick}
      type={type}
      {...props}
    >
      {isLoading ? <span className="button-loader" aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  )
}
