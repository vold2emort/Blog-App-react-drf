import ButtonLink from "@/components/ui/8bit/ButtonLink";

export default function NotFoundPage() {
  return (
    <div className="panel p-8 sm:p-12 text-center">
      <p className="pixel-label text-ink-muted">Error 404</p>
      <h1 className="pixel-title text-base mt-4">Page not found</h1>
      <p className="mt-4 text-ink-muted">That page does not exist.</p>
      <div className="mt-6 flex justify-center">
        <ButtonLink to="/" variant="primary" size="sm">
          Back to home
        </ButtonLink>
      </div>
    </div>
  );
}