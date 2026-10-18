import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import Counter from './components/Counter.jsx';

/**
 * SocietyApp React Entrypoint
 * 1. Mounts full Single Page Application (SPA) into #root
 * 2. Mounts individual islands if present on hybrid pages
 */
function initReact() {
  const rootElement = document.getElementById('root');
  if (rootElement && !rootElement._reactRootMounted) {
    rootElement._reactRootMounted = true;
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    return;
  }

  // Island fallback
  const counterElements = document.querySelectorAll('[data-react-island="counter"], #react-counter-island');
  counterElements.forEach((el) => {
    if (el._reactRootMounted) return;
    el._reactRootMounted = true;
    const initialCount = el.getAttribute('data-initial-count') || 0;
    const title = el.getAttribute('data-title') || 'Interactive Island';
    const root = createRoot(el);
    root.render(<Counter initialCount={initialCount} title={title} />);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initReact);
} else {
  initReact();
}

export { initReact };
