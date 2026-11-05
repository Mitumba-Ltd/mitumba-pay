import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { SessionApp } from './SessionApp'

// Bridge V2 (session-driven) is selected by a ?session= param on the hosted URL;
// everything else falls back to the legacy V1 App during the rollout window.
const hasSession = new URLSearchParams(window.location.search).has('session')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {hasSession ? <SessionApp /> : <App />}
  </StrictMode>,
)
