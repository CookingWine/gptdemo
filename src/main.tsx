import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ChatProvider } from './state/ChatProvider'
import { SettingsProvider } from './state/SettingsProvider'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <SettingsProvider>
      <ChatProvider>
        <App />
      </ChatProvider>
    </SettingsProvider>
  </React.StrictMode>,
)
