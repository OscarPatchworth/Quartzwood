import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthProvider.tsx'
// Self-hosted fonts (no request to Google Fonts): Sen for text (Inter as fallback), Amaranth for headings. See index.css
import '@fontsource-variable/inter'
import '@fontsource/amaranth/400.css'
//import '@fontsource/amaranth/700.css'
import '@fontsource-variable/sen'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)