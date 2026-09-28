import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import STEPS from '../data/steps';

const QUESTIONS = STEPS
  .filter(s => s.question)
  .map(s => ({ heading: s.heading, question: s.question }));

// Printed on paper, not read on the dark page — kept light/print-friendly
// rather than matching the site's aubergine theme.
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
    <div className="zoom-out-modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checklist-title"
        tabIndex={-1}
        className="zoom-out-modal"
        onClick={e => e.stopPropagation()}
      >
        <div className="zoom-out-modal__header">
          <div>
            <div className="zoom-out__label">Before you consent</div>
            <h3 id="checklist-title" className="zoom-out-modal__title">Questions to ask your coordinator</h3>
          </div>
          <button onClick={onClose} aria-label="Close" className="bar-popover__close zoom-out-modal__close">×</button>
        </div>

        <div className="zoom-out-modal__list">
          {QUESTIONS.map(({ question }, i) => (
            <div key={i} className="zoom-out-modal__item">
              <p>{question}</p>
            </div>
          ))}
        </div>

        <button onClick={printQuestions} className="zoom-out__button">
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
      {/* Same rule-and-dot motif as "Ask your coordinator" (.step-question),
          with a plain (not bold/red) note in place of a question — this is
          a description of what follows, not something to ask out loud. */}
      <div className="step-question zoom-out__intro">
        <svg className="step-question__tail" width="31" height="22" viewBox="0 0 31 22" aria-hidden="true">
          <path d="M31 0.75 H10 L1 21" stroke="var(--red)" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
        </svg>
        <span className="step-question__line" aria-hidden="true" />
        <span className="step-question__dot" aria-hidden="true" />
        <span className="step-question__end" aria-hidden="true" />
        <div className="zoom-out__label">Before you sign</div>
        <p className="zoom-out__note">Ten questions — one for each step. The answers tell you whether the trial has thought carefully about your data, or hasn't.</p>
      </div>
      <button onClick={() => setModalOpen(true)} className="zoom-out__button">
        View all questions <span aria-hidden="true">→</span>
      </button>

      {modalOpen && <Modal onClose={() => setModalOpen(false)} />}
    </div>
  );
}
