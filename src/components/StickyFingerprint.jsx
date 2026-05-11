import React, { useMemo, useRef, useEffect, useLayoutEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import FingerprintGrid from './FingerprintGrid';
import {
  BASE_BARS,
  NEW_BARS,
  INFERRED_BARS,
  SUPPRESSED_IDS,
  GENERALIZED_IDS,
  NOISE_IDS,
  PATTERN_A_ID,
  PATTERN_B_ID,
  REID_IDS,
} from '../data/bars';

// ─── Bar state derivation ─────────────────────────────────────────────────────

const DEID_GRAY = '#9EAAB5';
const BAR_HEIGHT = 16;
const BAR_SCALE = 0.82; // shrink rendered width so labels fit beside bars

const GENERALIZED_SHADES = { dob: '#c2cdd6', zip: '#8a9aa4', diagnosis: '#5c6e78' };


function shiftHue(hex, degrees) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  const s = max === 0 ? 0 : d / max, v = max;
  h = (h + degrees / 360 + 1) % 1;
  const i = Math.floor(h * 6), f = h * 6 - i;
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  const [nr, ng, nb] = [[v,t,p],[q,v,p],[p,v,t],[p,q,v],[t,p,v],[v,p,q]][i % 6];
  const x = n => Math.round(n * 255).toString(16).padStart(2, '0');
  return `#${x(nr)}${x(ng)}${x(nb)}`;
}

const NOISE_HUE_SHIFTS = { labs: -40, wearable: 30 };

function applyDeId(bar, { suppression = true, generalization = true } = {}) {
  if (suppression && SUPPRESSED_IDS.includes(bar.id)) {
    return { visible: false, opacity: 0, width: 0 };
  }
  const overrides = {};
  if (generalization && GENERALIZED_IDS.includes(bar.id)) {
    overrides.isGeneralized = true;
    overrides.rangeMin = Math.max(5, bar.baseWidth - 20);
    overrides.rangeMax = Math.min(97, bar.baseWidth + 20);
  }
  return overrides;
}

function deriveBars(step, prevStep, subStep) {
  const showNew = step >= 2 || prevStep >= 2;
  const showInferred = step >= 7 || prevStep >= 7;
  const allBars = [
    ...(showInferred ? INFERRED_BARS : []),
    ...BASE_BARS,
    ...(showNew ? NEW_BARS : []),
  ];

  return allBars.map((bar, i) => {
    const base = {
      ...bar,
      visible: true,
      width: bar.baseWidth,
      opacity: 1,
      color: bar.color,
      glow: null,
      pulse: false,
      scanDelay: i * 80,
    };

    // Inferred bars: appear at step 7, protected at step 8
    if (bar.section === 'inferred') {
      const c = bar.color;
      if (step < 7 && prevStep < 7) return { ...base, visible: false, opacity: 0 };
      if (step === 7) return { ...base, color: c, glow: c, isDrawing: true, enterDelay: 500 };
      if (step === 8) return {
        ...base, color: c, glow: c,
        isProtected: true,
        scrambleDelay: i * 28,
        flashColors: Array.from({ length: 4 }, () => `hsl(${Math.floor(Math.random() * 360)}, 40%, 52%)`),
      };
      if (step < 7 && prevStep >= 7) return { ...base, color: c, isExiting: true, enterDelay: 0 };
      return { ...base, color: c, glow: c };
    }

    // New bars: handle enter/exit before step logic
    if (bar.section === 'new') {
      const newIdx = NEW_BARS.findIndex(b => b.id === bar.id);
      if (step === 2) {
        return { ...base, glow: bar.color, isEntering: true, enterDelay: newIdx * 150 };
      }
      if (step < 2 && prevStep >= 2) {
        return { ...base, glow: bar.color, isExiting: true, enterDelay: (NEW_BARS.length - 1 - newIdx) * 150 };
      }
      if (step < 2) {
        return { ...base, visible: false, opacity: 0 };
      }
      // step > 2: fall through to normal de-id logic
    }

    if (step === 0) return { ...base, pulse: true };
    if (step === 1) return base;
    if (step === 2) return base;

    // ── Step 3: Vulnerabilities — full record, re-id fields highlighted ──────
    // Shows which fields carry the most re-identification weight before
    // de-identification is applied, motivating the protections in step 4.
    if (step === 3) {
      if (REID_IDS.includes(bar.id)) {
        return { ...base, glow: '#a90533', color: '#a90533', opacity: 1 };
      }
      return base;
    }

    // ── Step 4: scroll-driven de-identification (accumulates per subStep) ────
    if (step === 4) {
      const s = subStep ?? 0;

      if (s >= 0 && SUPPRESSED_IDS.includes(bar.id)) {
        return { ...base, isSuppressedGhost: true };
      }
      if (s >= 1 && GENERALIZED_IDS.includes(bar.id)) {
        return {
          ...base,
          isGeneralized: true,
          rangeMin: Math.max(5, bar.baseWidth - 20),
          rangeMax: Math.min(97, bar.baseWidth + 20),
        };
      }
      if (s >= 2 && NOISE_IDS.includes(bar.id)) {
        return {
          ...base,
          color: shiftHue(bar.color, NOISE_HUE_SHIFTS[bar.id] ?? 0),
        };
      }
      return base;
    }

    // ── Steps 5+: full de-id applied; bar-level changes (suppression,
    //   generalization, noise) communicate de-id without a global grey wash.
    if (step >= 5) {
      const deId = applyDeId(bar);
      if (deId.visible === false) return { ...base, ...deId };
      Object.assign(base, deId);
    }

    if (step === 5) return base;

    // Step 6: pattern highlighting — two bars signal a treatment response
    if (step === 6) {
      if (bar.id === PATTERN_A_ID) return { ...base, color: '#7ab832', opacity: 1, glow: '#7ab832' };
      if (bar.id === PATTERN_B_ID) return { ...base, color: '#026CAC', opacity: 1, glow: '#026CAC' };
      if (!base.visible) return base;
      return { ...base, opacity: 0.25 };
    }

    return base;
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// anchorRect: DOMRect of the tapped bar — when provided the popover renders via
// a portal at position:fixed so it escapes any overflow:hidden / zoom ancestor.
function BarPopover({ bar, description, onClose, anchorRect }) {
  const ref = useRef(null);

  useEffect(() => {
    function onTouchOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    function onEscape(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('touchstart', onTouchOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('touchstart', onTouchOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [onClose]);

  const fixedStyle = anchorRect ? {
    position: 'fixed',
    top: 'calc(28vh + 28px)',
    bottom: '60px',
    left: '16px',
    right: '16px',
    width: 'auto',
    maxHeight: 'none',
    overflowY: 'auto',
    zIndex: 1000,
  } : {};

  const node = (
    <div ref={ref} className="bar-popover" role="dialog" aria-label={bar.label} style={{ borderLeftColor: bar.color, ...fixedStyle }}>
      <div className="bar-popover__header">
        <span className="bar-popover__label" style={{ color: bar.color }}>{bar.label}</span>
        <button className="bar-popover__close" onClick={onClose} aria-label="Close">×</button>
      </div>
      <p className="bar-popover__desc">{description}</p>
      {bar.why && (
        <div className="bar-popover__why">
          <span className="bar-popover__why-label">Why it's collected</span>
          <p>{bar.why}</p>
        </div>
      )}
    </div>
  );

  return anchorRect ? ReactDOM.createPortal(node, document.body) : node;
}

function FingerprintBar({ bar, stepIndex, vertical = false, onBarSelect }) {
  const [hovered, setHovered] = useState(false);
  const [open, setOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState(null);
  const outerRef = useRef(null);
  const canOpen = bar.visible && bar.description;

  function handleMouseEnter() { setHovered(true);  if (canOpen) setOpen(true); }
  function handleMouseLeave() { setHovered(false); if (canOpen) setOpen(false); }
  function handleFocus()      { setHovered(true); }
  function handleBlur()       { setHovered(false); if (!anchorRect) setOpen(false); }
  function handleKeyDown(e) {
    if (!canOpen) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (open) { setOpen(false); setAnchorRect(null); }
      else { setOpen(true); }
    }
    if (e.key === 'Escape') { setOpen(false); setAnchorRect(null); }
  }
  function handleTouchStart(e) {
    if (!canOpen) return;
    e.preventDefault();
    if (onBarSelect) {
      onBarSelect(bar);
      return;
    }
    if (open) {
      setOpen(false);
      setAnchorRect(null);
    } else {
      setAnchorRect(outerRef.current?.getBoundingClientRect() ?? null);
      setOpen(true);
    }
  }

  if (bar.isSuppressedGhost) {
    return (
      <div
        style={vertical ? {
          flex: '1 1 0%',
          minWidth: '3px',
          height: '100%',
          padding: '2pt',
          minHeight: '4px',
          borderRadius: '10px',
          border: `1.5px dashed ${bar.color}55`,
          backgroundColor: 'transparent',
          transition: 'height 500ms ease, opacity 500ms ease',
        } : {
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '0',
        }}
        role="img"
        aria-label={`${bar.label} (removed)`}
      >
        {!vertical && (
          <span className="bar-label bar-label--suppressed">{bar.label}</span>
        )}
        {!vertical && (
          <div style={{
            width: `${bar.width * BAR_SCALE}%`,
            height: `${BAR_HEIGHT}px`,
            borderRadius: '1px',
            border: `1.5px dashed ${bar.color}55`,
            backgroundColor: 'transparent',
            flexShrink: 0,
            transition: 'width 500ms ease, opacity 500ms ease',
          }} />
        )}
      </div>
    );
  }

  const genColor = bar.isGeneralized ? (GENERALIZED_SHADES[bar.id] ?? DEID_GRAY) : null;
  const boxShadow = bar.glow ? `0 0 10px 3px ${bar.glow}55, 0 0 2px 1px ${bar.glow}88` : 'none';
  const keyframeActive = bar.isEntering || bar.isExiting || bar.isDrawing;

  const baseColor = genColor ?? bar.color;

  const flashVars = bar.flashColors ? {
    '--flash-c1': bar.flashColors[0],
    '--flash-c2': bar.flashColors[1],
    '--flash-c3': bar.flashColors[2],
    '--flash-c4': bar.flashColors[3],
  } : {};

  const barStyle = vertical ? {
    '--bar-color': baseColor,
    ...flashVars,
    width: '100%',
    height: '100%',
    ...(!keyframeActive && { opacity: bar.visible ? bar.opacity : 0 }),
    backgroundColor: baseColor,
    boxShadow: 'none',
    filter: 'none',
    borderRadius: '8px',
    transition: 'opacity 400ms ease, background-color 500ms ease',
    position: 'relative',
    cursor: canOpen ? 'pointer' : 'default',
  } : {
    '--bar-color': baseColor,
    ...flashVars,
    width: bar.visible ? `${bar.width * BAR_SCALE}%` : '0%',
    ...(!keyframeActive && { opacity: bar.visible ? bar.opacity : 0 }),
    backgroundColor: baseColor,
    boxShadow,
    filter: 'none',
    height: `${BAR_HEIGHT}px`,
    borderRadius: '2px',
    outline: open ? `2px solid ${baseColor}` : 'none',
    outlineOffset: '2px',
    transition: 'opacity 400ms ease, background-color 500ms ease, box-shadow 500ms ease',
    position: 'relative',
    flexShrink: 0,
    cursor: canOpen ? 'pointer' : 'default',
  };

  const classes = ['fingerprint-bar'];
  if (stepIndex === 0 && bar.pulse) classes.push('bar-scan');
  if (!vertical && bar.isEntering) classes.push('bar-enter');
  if (!vertical && bar.isExiting)  classes.push('bar-exit');
  if (bar.isProtected) classes.push('bar-flash');
  if (bar.isDrawing)  classes.push(vertical ? 'bar-draw--vertical' : 'bar-draw');

  const animDelay = keyframeActive
    ? `${bar.enterDelay}ms`
    : bar.isProtected
    ? `${bar.scrambleDelay ?? 0}ms`
    : stepIndex === 0
    ? `${bar.scanDelay}ms`
    : '0ms';

  return (
    <div
      ref={outerRef}
      data-bar-id={bar.id}
      style={vertical ? {
          position: 'relative',
          flex: '1 1 0%',
          minWidth: '3px',
          height: '100%',
          padding: '2pt',
          minHeight: '4px',
          borderRadius: '10px',
          transition: 'height 500ms ease',
        } : {
          position: 'relative',
          marginBottom: '1px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      role={canOpen ? 'button' : 'img'}
      tabIndex={canOpen ? 0 : -1}
      aria-label={bar.isGeneralized ? `${bar.label} (generalized)` : bar.label}
      aria-expanded={canOpen ? open : undefined}
    >
      {!vertical && bar.visible && (
        <span
          className="bar-label"
          style={bar.glow ? { color: bar.glow, fontWeight: 600 } : undefined}
        >
          {bar.label}
        </span>
      )}

      <div
        className={classes.join(' ')}
        style={{ ...barStyle, animationDelay: animDelay }}
      />
      {hovered && bar.visible && !open && vertical && (
        <span className="bar-tooltip">{bar.label}</span>
      )}
      {open && canOpen && !onBarSelect && (
        <BarPopover bar={bar} description={bar.description} onClose={() => { setOpen(false); setAnchorRect(null); }} anchorRect={anchorRect} />
      )}
    </div>
  );
}

function FingerprintCore({ bars, stepIndex, dimmed = false, vertical = false, onBarSelect }) {
  return (
    <div
      className={`fingerprint-core${vertical ? ' fingerprint-core--vertical' : ''}`}
      style={{ opacity: dimmed ? 0.22 : 1, position: 'relative' }}
    >
      {bars.map(bar => (
        <FingerprintBar key={bar.id} bar={bar} stepIndex={stepIndex} vertical={vertical} onBarSelect={onBarSelect} />
      ))}
    </div>
  );
}



// ─── Per-step caption ─────────────────────────────────────────────────────────

function getCaption(step, subStep) {
  if (step === 4) {
    const sub = [
      'Direct identifiers are removed entirely.',
      'Quasi-identifiers are blurred into ranges.',
      'Lab values are shifted so exact record matching fails.',
      'Your record is legally de-identified.',
    ];
    return sub[subStep ?? 0] ?? sub[0];
  }
  const captions = {
    0: 'These bars represent your health record. Each one is a data field.',
    1: "Your record only gets involved in the trial after you consent to join.",
    2: 'Once you\'re enrolled, new data streams are recorded for your record.',
    3: 'These red fields are the easiest to trace back to you.',
    5: 'Your de-identified record joins a shared research dataset.',
    6: 'AI scans for patterns across the full pool.',
    7: 'Models can surface attributes that were never recorded.',
    8: 'Advanced techniques can protect what de-identification alone cannot.',
    9: 'Every question here has a real answer. Ask before you sign.',
  };
  return captions[step] ?? '';
}

// ─── Main component ───────────────────────────────────────────────────────────

const ANIM_MS = 520;
const EXIT_MS = 380;

export default function StickyFingerprint({ step, subStep, vertical = false, onBarSelect }) {
  const prevStepRef = useRef(step);
  const prevStep = prevStepRef.current;
  useEffect(() => { prevStepRef.current = step; });

  // Grid shown at pool (5) and pattern-finding (6) steps
  const showGrid = step === 5 || step === 6;

  const [displayMode, setDisplayMode] = useState(() => showGrid ? 'grid' : 'single');
  const isFirstRender = useRef(true);
  const growFromRef = useRef(null);
  const [growStyle, setGrowStyle] = useState({});

  const wrapperRef = useRef(null);
  const singleElRef = useRef(null);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }

    if (showGrid) {
      setDisplayMode('to-grid');
      const t = setTimeout(() => setDisplayMode('grid'), ANIM_MS);
      return () => clearTimeout(t);
    } else {
      // Measure user cell position before grid exits so grow-in animates from
      // the exact cell size and location.
      const userCell = wrapperRef.current?.querySelector('.mini-fp--user');
      const stageEl  = wrapperRef.current?.querySelector('.fp-stage');
      if (userCell && stageEl) {
        const cellRect  = userCell.getBoundingClientRect();
        const stageRect = stageEl.getBoundingClientRect();
        growFromRef.current = {
          dx:    (cellRect.left  + cellRect.width  / 2) - (stageRect.left  + stageRect.width  / 2),
          dy:    (cellRect.top   + cellRect.height / 2) - (stageRect.top   + stageRect.height / 2),
          scale: cellRect.width / stageRect.width,
        };
      }
      setDisplayMode('grid-exit');
      let t2;
      const t1 = setTimeout(() => {
        setDisplayMode('to-single');
        t2 = setTimeout(() => setDisplayMode('single'), ANIM_MS);
      }, EXIT_MS);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [showGrid]); // eslint-disable-line react-hooks/exhaustive-deps

  // When the single element mounts in to-single mode, snap it to the measured
  // cell position then animate to natural size/position.
  useLayoutEffect(() => {
    if (displayMode === 'single') { setGrowStyle({}); return; }
    if (displayMode !== 'to-single') return;
    if (!growFromRef.current) return;
    const { dx, dy, scale } = growFromRef.current;
    setGrowStyle({ transform: `translate(${dx}px, ${dy}px) scale(${scale})`, transition: 'none' });
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setGrowStyle({ transform: 'none', transition: `transform ${ANIM_MS}ms cubic-bezier(0.2,0,0.4,1)` });
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [displayMode]);

  const bars = useMemo(
    () => deriveBars(step, prevStep, subStep),
    [step, prevStep, subStep],
  );

  const gridBars = useMemo(
    () => deriveBars(5, prevStep, null),
    [prevStep],
  );

  const showSingle = displayMode === 'single' || displayMode === 'to-grid' || displayMode === 'to-single';
  const showGridEl = displayMode === 'grid' || displayMode === 'to-grid' || displayMode === 'grid-exit';
  const gridStyle  = displayMode === 'to-grid' ? { visibility: 'hidden', pointerEvents: 'none' } : {};

  const isLocked = step === 1;


  return (
    <div ref={wrapperRef} className="fingerprint-wrapper">
      <h3 className="fingerprint-title">Health Data Fingerprint</h3>

      {step === 0 && (
        <div className="fp-onboard">
          <p className="fp-onboard__intro">
            Like a fingerprint, the combination of fields in your health record is uniquely yours.
            Each bar below is one data field — hover or tap to see what it contains and why it's collected.
          </p>
        </div>
      )}

      <div className="fp-stage">
        {showSingle && (
          <div
            className="fp-stage__single"
            ref={singleElRef}
            style={{ ...(displayMode === 'to-single' ? growStyle : {}), zIndex: displayMode === 'to-single' ? 2 : 1 }}
          >
            <div className={isLocked ? 'fp-bars-locked' : ''} style={vertical && !showGrid ? { height: '100%' } : {}}>
              <FingerprintCore bars={bars} stepIndex={step} vertical={vertical && !showGrid} onBarSelect={onBarSelect} />
            </div>
          </div>
        )}
        {showGridEl && (
          <div className="fp-stage__grid" style={gridStyle}>
            <FingerprintGrid
              key={displayMode === 'to-grid' ? 'hidden' : 'visible'}
              bars={gridBars}
              step={step}
              isExiting={displayMode === 'grid-exit'}
              isPreExit={false}
              entryDelay={0}
            />
          </div>
        )}
      </div>

      <p className="fingerprint-caption" aria-live="polite">{getCaption(step, subStep)}</p>
      <p className="fingerprint-hint" />


      <p className="fp-lock-label" style={{ opacity: isLocked ? 1 : 0 }}>Your record is unchanged</p>
    </div>
  );
}
