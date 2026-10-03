export function Spinner({ label = "Loading" }) {
  return (
    <div className="flex items-center gap-3 text-ink-muted" role="status">
      <span className="pixel-label animate-pulse">{label}</span>
    </div>
  );
}

export function LoadingBlock({ label = "Loading" }) {
  return (
    <div className="panel p-8">
      <Spinner label={label} />
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="panel-inset p-8 text-center">
      <p className="pixel-label text-ink-muted">{title}</p>
      {children ? <div className="mt-4 text-ink-muted">{children}</div> : null}
    </div>
  );
}

export function ErrorState({ title = "Something broke", onRetry }) {
  return (
    <div className="panel p-8" role="alert">
      <p className="pixel-label">{title}</p>
      {onRetry && (
        <button type="button" className="btn btn-sm mt-4" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}