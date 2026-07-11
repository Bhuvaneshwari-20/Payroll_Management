import { createContext, useContext, useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Vertex Bank — Theme Context
// Wrap your app with <ThemeProvider> (e.g. in main.jsx, around <App />).
// Any component can then do: const { theme, toggleTheme } = useTheme();
//
// This sets data-theme="light" | "dark" on <html>, and CSS variables
// (defined in Topbar.jsx's global style block) respond to that attribute.
// The choice is remembered in localStorage across visits.
// ---------------------------------------------------------------------------

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('vb-theme');
    if (saved) return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vb-theme', theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}