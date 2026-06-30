export default function Input({
  autoComplete,
  error,
  id,
  label,
  onChange,
  placeholder,
  value,
}) {
  const errorId = error ? `${id}-error` : undefined

  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input
        aria-describedby={errorId}
        aria-invalid={Boolean(error)}
        autoComplete={autoComplete}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
      {error ? (
        <span className="field-error" id={errorId}>
          {error}
        </span>
      ) : null}
    </label>
  )
}
