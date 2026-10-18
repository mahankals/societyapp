import React, { useState } from 'react';

export default function Counter({ initialCount = 0, title = 'Interactive Counter Island' }) {
  const [count, setCount] = useState(Number(initialCount));

  return (
    <div className="glass-panel p-4 rounded-xl border border-white/10 bg-surface-900/40 text-white flex items-center justify-between gap-4 max-w-sm">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-200/60">{title}</h4>
        <p className="text-2xl font-bold font-heading text-brand-400 mt-1">{count}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setCount((c) => Math.max(0, c - 1))}
          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-sm font-bold text-surface-200 transition-colors"
          aria-label="Decrease"
        >
          -
        </button>
        <button
          type="button"
          onClick={() => setCount((c) => c + 1)}
          className="w-8 h-8 rounded-lg bg-brand-500/20 hover:bg-brand-500/30 border border-brand-500/30 flex items-center justify-center text-sm font-bold text-brand-300 transition-colors"
          aria-label="Increase"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => setCount(0)}
          className="text-xs text-surface-200/50 hover:text-white px-2 py-1 rounded transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
