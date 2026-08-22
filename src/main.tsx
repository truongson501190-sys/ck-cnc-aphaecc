// src/main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import './index.css';
// import './styles.css';  // Tạm thời comment

console.log('📍 Application starting...');

const rootElement = document.getElementById('root');

// ✅ Lấy Client ID từ environment variable
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

if (!CLIENT_ID) {
  console.warn('⚠️ VITE_GOOGLE_CLIENT_ID not found in environment');
}

if (!rootElement) {
  console.error('❌ Root element not found!');
} else {
  console.log('✅ Root element found, rendering App...');
  createRoot(rootElement).render(
    <React.StrictMode>
      <GoogleOAuthProvider clientId={CLIENT_ID}>
        <App />
      </GoogleOAuthProvider>
    </React.StrictMode>
  );
}