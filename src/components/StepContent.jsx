import React, { useState, useRef, useEffect } from 'react';
import CitationPopover from './CitationPopover';

function QuestionHint({ hint }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="step-question__hint-wrapper">
      <button
        className="step-question__hint-toggle"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        How to evaluate this answer
        <svg viewBox="0 0 10 6" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transition: 'transform 200ms ease', transform: open ? 'rotate(180deg)' : 'none' }}>
          <polyline points="1 1 5 5 9 1" />
        </svg>
      </button>
      {open && <p className="step-question__hint">{hint}</p>}
    </div>
  );
}

// The question reads as the reader's own line of dialogue: an open rule with
// a speech-bubble tail, a gap, and a dot, instead of a boxed callout.
function CoordinatorQuestion({ question, hint }) {
  return (
    <div className="step-question">
      <svg className="step-question__tail" width="31" height="22" viewBox="0 0 31 22" aria-hidden="true">
        <path d="M31 0.75 H10 L1 21" stroke="var(--red)" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
      </svg>
      <span className="step-question__line" aria-hidden="true" />
      <span className="step-question__dot" aria-hidden="true" />
      <span className="step-question__end" aria-hidden="true" />
      <div className="step-question__label">Ask your coordinator</div>
      <p className="step-question__text">{parseBody(question)}</p>
      {hint && <QuestionHint hint={hint} />}
    </div>
  );
}

function GlossaryTerm({ term, definition }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

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

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline' }}>
      <span
        className="glossary-term"
        role="button"
        tabIndex={0}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); }
          if (e.key === 'Escape') setOpen(false);
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {term}
      </span>
      {open && (
        <span className="citation-popover" role="dialog" aria-label={`Definition of ${term}`}>
          {definition}
        </span>
      )}
    </span>
  );
}

// Emphasize the last word of a step headline in the red accent — "one
// emphasized word per headline," per the design direction.
export function renderHeading(text) {
  const words = text.split(' ');
  const last = words.pop();
  return (
    <>
      {words.length > 0 ? words.join(' ') + ' ' : ''}
      <em>{last}</em>
    </>
  );
}

export function parseBody(text) {
  const parts = [];
  const regex = /\[(\d+)\]|\[\[([^\]|]+)\|([^\]]+)\]\]/g;
  let last = 0, match, key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[1]) {
      parts.push(<CitationPopover key={key++} id={Number(match[1])} />);
    } else {
      parts.push(<GlossaryTerm key={key++} term={match[2]} definition={match[3]} />);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function renderParagraphs(text, className, trailing = null) {
  const paragraphs = text.split(/\n\n|<br\s*\/?>/).map(p => p.trim()).filter(Boolean);
  return paragraphs.map((para, i) => {
    const isBullet = para.startsWith('•');
    const cls = isBullet ? `${className} step-body--bullet` : className;
    return (
      <p key={i} className={cls}>
        {parseBody(isBullet ? para.slice(1).trim() : para)}
        {i === paragraphs.length - 1 && trailing}
      </p>
    );
  });
}

export default function StepContent({ step, subStep, techniqueOnly = false, introOnly = false, hideQuestion = false }) {
  // Step 4 has sub-steps: sticky header stays fixed, only technique block scrolls
  if (step.subSteps) {
    // Mobile: just the heading + intro paragraph, no technique yet
    if (introOnly) {
      return (
        <div className="step-content">
          <div className="step-number">{String(step.step + 1).padStart(2, '0')}</div>
          <h2 className="step-heading fly-in">{renderHeading(step.heading)}</h2>
          <p className="step-body step-body--intro">{parseBody(step.intro)}</p>
          {step.question && (
            <CoordinatorQuestion question={step.question} />
          )}
        </div>
      );
    }

    const sub = step.subSteps[subStep ?? 0];
    const techniqueCount = step.subSteps.filter(s => !s.isOutro).length;

    if (techniqueOnly) {
      return (
        <div className="step-technique step-technique--scroll" key={subStep}>
          <div className="step-technique__label">
            {sub.technique}
            {!sub.isOutro && (
              <span className="step-technique__counter"> · {(subStep ?? 0) + 1} of {techniqueCount}</span>
            )}
          </div>
          <p className="step-body">{parseBody(sub.body)}
            {sub.citationIds?.map(id => <CitationPopover key={id} id={id} />)}
          </p>
        </div>
      );
    }
    return (
      <div className="step-content">
        <div className="step-number">{String(step.step + 1).padStart(2, '0')}</div>
        <h2 className="step-heading fly-in">{renderHeading(step.heading)}</h2>
        <p className="step-body step-body--intro">{parseBody(step.intro)}</p>
        <div className="step-technique" key={subStep}>
          <div className="step-technique__label">
            {sub.technique}
            {!sub.isOutro && (
              <span className="step-technique__counter"> · {(subStep ?? 0) + 1} of {techniqueCount}</span>
            )}
          </div>
          <p className="step-body">{parseBody(sub.body)}
            {sub.citationIds?.map(id => <CitationPopover key={id} id={id} />)}
          </p>
        </div>
        {step.question && (
          <CoordinatorQuestion question={step.question} hint={step.questionHint} />
        )}
      </div>
    );
  }

  return (
    <div className="step-content">
      <div className="step-number">{String(step.step + 1).padStart(2, '0')}</div>
      <h2 className="step-heading fly-in">{renderHeading(step.heading)}</h2>
      {renderParagraphs(step.body, 'step-body')}
      {!hideQuestion && step.question && (
        <CoordinatorQuestion question={step.question} hint={step.questionHint} />
      )}
    </div>
  );
}
