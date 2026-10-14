import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/fonts'
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'
import './styles/clock.css'
import './styles/app.css'
import { App } from './app/App'
import { initStore } from './services/store'

void initStore().then(() => {
  createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
})
