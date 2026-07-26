import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ButceApp from './ButceApp.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ButceApp />
  </StrictMode>,
)
