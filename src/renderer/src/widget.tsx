import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/fonts'
import './styles/tokens.css'
import './styles/base.css'
import './styles/clock.css'
import './styles/widget.css'
import { WidgetApp } from './widget/WidgetApp'
import { initStore } from './services/store'

void initStore().then(() => {
  createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
      <WidgetApp />
    </StrictMode>
  )
})
