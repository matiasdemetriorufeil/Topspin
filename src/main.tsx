import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App'
import './index.css'
import ProveedorActualizacion from './pwa/ProveedorActualizacion'

// Pide que el navegador no borre IndexedDB ante falta de espacio.
// Si el navegador lo rechaza, la app sigue funcionando igual.
navigator.storage?.persist?.().catch(() => {})

// En GitHub Pages la app vive en "/<repo>/"; BASE_URL viene de `base` en vite.config.ts
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProveedorActualizacion>
      <BrowserRouter basename={basename}>
        <App />
      </BrowserRouter>
    </ProveedorActualizacion>
  </StrictMode>,
)
