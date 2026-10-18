import React from 'react';
import { createRoot } from 'react-dom/client';
import Counter from './components/Counter.jsx';

/**
 * SocietyApp React Island Hydrator
 * Mounts interactive client-side React components only into explicit DOM nodes.
 * Does not replace server-rendered Twig HTML.
 */
function mountReactIslands() {
  // 1. Mount Counter Islands
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
  document.addEventListener('DOMContentLoaded', mountReactIslands);
} else {
  mountReactIslands();
}

export { mountReactIslands };
