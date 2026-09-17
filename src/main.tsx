window.onerror = function(msg, url, line) {
  document.body.innerHTML = '<pre style="color:red;padding:20px;font-size:16px;">Error: ' + msg + '\nAt: ' + line + '</pre>';
};
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { handleGoogleRedirect } from './lib/googleAuth';

handleGoogleRedirect();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
