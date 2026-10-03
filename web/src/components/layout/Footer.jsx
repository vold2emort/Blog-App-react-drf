import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t-2 border-ink mt-10">
      <div className="mx-auto w-full max-w-4xl px-4 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="pixel-label text-ink-muted">Blog // monochrome</p>
        <nav className="flex items-center gap-4" aria-label="Footer">
          <Link to="/" className="link-quiet text-sm">
            Home
          </Link>
          <Link to="/categories" className="link-quiet text-sm">
            Categories
          </Link>
          <Link to="/posts/new" className="link-quiet text-sm">
            Write
          </Link>
        </nav>
      </div>
    </footer>
  );
}