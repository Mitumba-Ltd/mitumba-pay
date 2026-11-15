import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { LinkApp, linkTokenFromPath } from './LinkApp'
import { SessionApp } from './SessionApp'

// A payment link (/i/<token>) is a page of its own. Otherwise Bridge V2 (session-driven) is selected
// by a ?session= param on the hosted URL, and everything else falls back to the legacy V1 App.
const linkToken = linkTokenFromPath(window.location.pathname)
const hasSession = new URLSearchParams(window.location.search).has('session')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {linkToken ? <LinkApp token={linkToken} /> : hasSession ? <SessionApp /> : <App />}
  </StrictMode>,
)
