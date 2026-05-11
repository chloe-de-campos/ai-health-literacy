import React, { useState, useRef, useEffect } from 'react';
import SOURCES from '../data/sources';

export default function CitationPopover({ id }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const source = SOURCES.find(s => s.id === id);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  if (!source) return <sup>[{id}]</sup>;

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); }
    if (e.key === 'Escape') setOpen(false);
  }

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline' }}>
      <sup
        className="citation-sup"
        role="button"
        tabIndex={0}
        onClick={() => setOpen(o => !o)}
        onKeyDown={handleKeyDown}
        aria-label={`Citation ${id}`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        [{id}]
      </sup>
      {open && (
        <span className="citation-popover" role="dialog" aria-label={`Citation ${id} details`}>
          <strong>{source.authors}</strong> ({source.year}).{' '}
          <em>{source.title}</em>.{' '}
          {source.url && (
            <a href={source.url} target="_blank" rel="noopener noreferrer">
              View source ↗<span className="sr-only"> (opens in new tab)</span>
            </a>
          )}
        </span>
      )}
    </span>
  );
}
