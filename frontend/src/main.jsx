import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
// 1. Importamos el proveedor de autenticación
import { AuthProvider } from './context/AuthContext' 

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* 2. Envolvemos App con AuthProvider */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)