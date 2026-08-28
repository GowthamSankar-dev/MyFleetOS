import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem('fleetos_theme')
    if (savedTheme) {
      return savedTheme === 'dark'
    }
    // Default to dark mode instead of system preference
    return true
  })

  useEffect(() => {
    // Apply theme to document
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('fleetos_theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('fleetos_theme', 'light')
    }
  }, [isDarkMode])

  const [mapTheme, setMapTheme] = useState(() => {
    let saved = localStorage.getItem('fleetos_map_theme') || 'Satellite'
    if (saved === 'OpenStreetMap') saved = 'Light Mode'
    return saved
  })

  useEffect(() => {
    localStorage.setItem('fleetos_map_theme', mapTheme)
  }, [mapTheme])

  const toggleTheme = () => setIsDarkMode(prev => !prev)

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, mapTheme, setMapTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
