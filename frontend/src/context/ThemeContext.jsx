import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Check localStorage first, default to 'dark'
    const saved = localStorage.getItem('theme');
    return saved || 'dark';
  });

  useEffect(() => {
    // Update document classes when theme changes
    const root = document.documentElement;
    const body = document.body;

    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      body.classList.add('dark');
      body.classList.remove('light');
      // Update theme-color meta tag
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#1F2937');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      body.classList.remove('dark');
      body.classList.add('light');
      // Update theme-color meta tag
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#F3F4F6');
    }

    // Save to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const value = {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark',
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
