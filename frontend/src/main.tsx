import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, useTheme } from '@adarsh_goswami/design'
import './index.css'
import App from './App'

function ThemeSync() {
  const { theme } = useTheme()
  useEffect(() => { localStorage.setItem('theme', theme) }, [theme])
  return null
}

const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider defaultTheme={storedTheme ?? 'light'}>
        <ThemeSync />
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
)
