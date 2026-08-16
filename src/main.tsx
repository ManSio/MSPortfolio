import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ui/ErrorBoundary.tsx'
import { LangProvider } from './i18n/LangContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LangProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </LangProvider>
  </StrictMode>,
)
