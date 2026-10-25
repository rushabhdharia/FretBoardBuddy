import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './ErrorBoundary.tsx'
import { migrateBrowserData } from './migrate.ts'
import { initStore } from './store.ts'

const root = createRoot(document.getElementById('root')!)

try {
  await initStore()
  await migrateBrowserData()
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  )
} catch (e) {
  root.render(
    <main>
      <h1>FretBoardBuddy</h1>
      <p className="error">Cannot reach the FretBoardBuddy server ({(e as Error).message}).</p>
      <p>Start the app with <code>npm run dev</code> (or <code>npm start</code>), open <code>http://localhost:5173/</code> (or <code>:4173</code> for <code>npm start</code>), and reload.</p>
    </main>,
  )
}
