import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

import Footer from "./Footer";
import Header from "./Header";

export default function Layout() {
  const { pathname } = useLocation();

  // Long posts should start at the top when you navigate to them.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-svh flex-col bg-canvas text-ink">
      <a
        href="#main"
        className="pixel-label sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-invert focus:text-invert-ink focus:px-3 focus:py-2 focus:border-2 focus:border-ink"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-10">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}