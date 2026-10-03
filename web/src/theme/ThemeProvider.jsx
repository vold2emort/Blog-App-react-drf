import { useCallback, useEffect, useState } from "react";

import { ThemeContext } from "./theme-context";

const STORAGE_KEY = "blog:theme";

function currentTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
}

export default function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(currentTheme);

  // Keep other tabs of the same site in step.
  useEffect(() => {
    function onStorage(event) {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      const next = event.newValue === "dark" ? "dark" : "light";
      document.documentElement.dataset.theme = next;
      setTheme(next);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((previous) => {
      const next = previous === "dark" ? "light" : "dark";
      applyTheme(next);
      return next;
    });
  }, []);

  return (
    <ThemeContext value={{ theme, toggleTheme, isDark: theme === "dark" }}>
      {children}
    </ThemeContext>
  );
}