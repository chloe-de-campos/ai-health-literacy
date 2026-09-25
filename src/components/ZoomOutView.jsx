import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import STEPS from '../data/steps';

const QUESTIONS = STEPS
  .filter(s => s.question)
  .map(s => ({ heading: s.heading, question: s.question }));

function printQuestions() {
  const w = window.open('', '_blank', 'width=700,height=900');
  if (!w) return;
  w.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Questions for Your Trial Coordinator</title>
  <style>
    body { font-family: Georgia, serif; max-width: 580px; margin: 48px auto; color: #1a2b38; line-height: 1.65; }
    h1 { font-family: sans-serif; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #8896a3; margin-bottom: 28px; }
    .q { margin-bottom: 22px; padding-left: 14px; border-left: 2px solid #c8c0b0; }
    p { font-style: italic; font-size: 0.9rem; color: #1a2b38; margin: 0; }
  </style>
</head>
<body>
  <h1>Questions to ask your coordinator</h1>
  ${QUESTIONS.map(q => `<div class="q"><p>${q.question}</p></div>`).join('')}
</body>
</html>`);
  w.document.close();
  w.print();
}

function Modal({ onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(10,20,30,0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        animation: 'fade-in 180ms ease both',
      }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checklist-title"
        tabIndex={-1}
        style={{
          background: '#fdfaf6',
          border: '1px solid #e0d6c8',
          borderRadius: '6px',
          padding: '28px',
          maxWidth: '520px',
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto',
          outline: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '0',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ fontFamily: 'IBM Plex Mono, ui-monospace, monospace', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8896a3', marginBottom: '4px' }}>
              Before you consent
            </div>
            <h3 id="checklist-title" style={{ fontFamily: 'Archivo, sans-serif', fontStretch: 'condensed', textTransform: 'uppercase', fontSize: '1.05rem', fontWeight: 800, color: '#1a2b38', margin: 0 }}>
              Questions to ask your coordinator
            </h3>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: '1px solid #c8c0b0', borderRadius: '0', color: '#4a6478', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '3px 7px', marginLeft: '16px', flexShrink: 0 }}>×</button>
        </div>

        {/* Questions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
          {QUESTIONS.map(({ question }, i) => (
            <div key={i} style={{ borderLeft: '2px solid #c8c0b0', paddingLeft: '14px', paddingTop: '2px', paddingBottom: '2px' }}>
              <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '0.9rem', color: '#1a2b38', fontStyle: 'italic', lineHeight: 1.55, margin: 0 }}>
                {question}
              </p>
            </div>
          ))}
        </div>

        {/* Print button */}
        <button
          onClick={printQuestions}
          style={{
            alignSelf: 'flex-start',
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'none', border: '1px solid #a90533',
            borderRadius: '0', padding: '8px 14px',
            color: '#a90533', fontSize: '0.72rem',
            fontFamily: 'IBM Plex Mono, ui-monospace, monospace',
            fontWeight: 600, letterSpacing: '0.04em',
            cursor: 'pointer', transition: 'background 150ms ease',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#fbe9e6'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="1" width="10" height="10" rx="1" />
            <path d="M3 8H1.5A1.5 1.5 0 0 0 0 9.5v3A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-3A1.5 1.5 0 0 0 14.5 8H13" />
            <path d="M5 12h6M5 14.5h6" />
          </svg>
          Print / Save as PDF
        </button>
      </div>
    </div>,
    document.body
  );
}

export default function ZoomOutView() {
  const [modalOpen, setModalOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ opacity: visible ? 1 : 0, transition: 'opacity 300ms ease' }}>
      <div style={{ fontFamily: 'IBM Plex Mono, ui-monospace, monospace', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8896a3', marginBottom: '6px' }}>
        Before you sign
      </div>
      <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '0.88rem', color: '#4a6478', lineHeight: 1.55, margin: '0 0 16px' }}>
        Ten questions — one for each step. The answers tell you whether the trial has thought carefully about your data, or hasn't.
      </p>
      <button
        onClick={() => setModalOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'none', border: '1px solid #a90533',
          borderRadius: '0', padding: '9px 14px',
          color: '#a90533', fontSize: '0.72rem',
          fontFamily: 'IBM Plex Mono, ui-monospace, monospace',
          fontWeight: 600, letterSpacing: '0.04em',
          cursor: 'pointer', transition: 'background 150ms ease',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#fbe9e6'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
      >
        View all questions <span aria-hidden="true">→</span>
      </button>

      {modalOpen && <Modal onClose={() => setModalOpen(false)} />}
    </div>
  );
}
