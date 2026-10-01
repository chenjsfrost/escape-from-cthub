import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { demoState } from './lib/demo'
import './styles.css'

// `?demo` loads the CT Hub demo, handy for sharing a link.
if (new URLSearchParams(location.search).has('demo')) {
  try {
    localStorage.setItem('efc:state:v1', JSON.stringify(demoState()))
  } catch {}
  history.replaceState(null, '', location.pathname)
}

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
