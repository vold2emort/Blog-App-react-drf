/**
 * Wraps a control with its label, optional hint and error message. The error is
 * wired up with aria-describedby / aria-invalid so react-hook-form output is
 * announced rather than just coloured red (there is no red here).
 */
export default function Field({ id, label, error, hint, children, className = "" }) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className={className}>
      <label htmlFor={id} className="pixel-label block text-ink-muted mb-2">
        {label}
      </label>
      {children({
        id,
        "aria-invalid": error ? "true" : undefined,
        "aria-describedby": error ? errorId : hint ? hintId : undefined,
      })}
      {hint && !error && (
        <p id={hintId} className="mt-2 text-sm text-ink-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-2 text-sm text-ink">
          <span className="pixel-label">error:</span> {error}
        </p>
      )}
    </div>
  );
}