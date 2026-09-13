import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx' // Make sure this points to your file
import './index.css'
import { GoogleOAuthProvider } from '@react-oauth/google'

// Set VITE_GOOGLE_CLIENT_ID in Frontend/.env to enable the Google Sign-In
// button (see Backend/.env.example for how to create one). Passing an
// empty client ID is safe — the provider just won't be able to render a
// working button until it's set.
const GOOGLE_CLIENT_ID = import.meta.env?.VITE_GOOGLE_CLIENT_ID || ''

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
)
