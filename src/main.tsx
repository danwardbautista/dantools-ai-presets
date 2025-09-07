import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './tailwind.css';

// enable memory monitoring in development
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
  import('./utils/memoryManager').then(({ memoryMonitor }) => {
    memoryMonitor.startMonitoring();
  });
}

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
