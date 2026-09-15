import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { DeckProvider } from './contexts/DeckContext'
import { LanguageProvider, applyLocaleToDocument, getInitialLocale } from './i18n/LanguageContext'

// Apply the persisted locale before first paint (no lang flash).
applyLocaleToDocument(getInitialLocale());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <DeckProvider>
          <App />
        </DeckProvider>
      </AuthProvider>
    </LanguageProvider>
  </StrictMode>,
)
