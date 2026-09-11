/**
 * React boot entry.
 * Functions: creates the React root and renders App inside StrictMode.
 * Dependencies: React, react-dom/client, src/App.tsx, src/index.css, theme index CSS files, shared theme polish, and selectable bubble skins.
 * Maintenance note: keep this file tiny; route feature work through App or future routed modules.
 */
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './themes/pastel/index.css';
import './themes/gothic/index.css';
import './themes/guofeng/index.css';
import './themes/celtic-paladin/index.css';
import './themes/status-terminal/index.css';
import './themes/selected-concepts/index.css';
import './themes/polish/index.css';
import './themes/bubbles/index.css';
import './themes/identity/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
