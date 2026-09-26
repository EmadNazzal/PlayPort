import { Buffer } from 'buffer';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles.css';

// @solana/web3.js uses Node's Buffer when serialising transactions.
(globalThis as unknown as { Buffer?: typeof Buffer }).Buffer ??= Buffer;

const root = document.getElementById('root');
if (!root) throw new Error('Root element missing');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
