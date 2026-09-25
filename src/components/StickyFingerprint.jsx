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
  INK,
  IDENTIFIER_GRAY,
  ACCENT,
  RIDGE_ORDER,
} from '../data/bars';
import { ridgePoint as sharedRidgePoint, ridgePathD as sharedRidgePathD, RIDGE_VARIANTS } from '../utils/ridgeGeometry';

// ─── Ridge geometry ───────────────────────────────────────────────────────────
// Each field maps to one concentric arch/loop ridge: two vertical legs plus a
// large arc over the top, nested at decreasing radius toward the center — a
// hand-drawn technical-blueprint take on a fingerprint loop pattern.

const RIDGE_VIEW_W = 520;
const RIDGE_VIEW_H = 500;
const RIDGE_CX = RIDGE_VIEW_W * 0.5;
const RIDGE_LEG_BOTTOM = RIDGE_VIEW_H - 18;
const RIDGE_MAX_R = 226;
const RIDGE_MIN_R = 46;
// "Shoulder line" — every ring's leg meets its arc at theta=180deg/0deg, where
// sin(theta)=0, so this y-coordinate is identical for every ring regardless
// of radius. That shared height is what keeps the leg-to-arc joint a clean
// 90-degree corner instead of a kink.
const RIDGE_CY = RIDGE_LEG_BOTTOM - (RIDGE_LEG_BOTTOM - RIDGE_MAX_R) * 0.62;

// Point/path builders bound to this view's center and leg baseline — thin
// wrappers over the shared, scale-independent formulas in utils/ridgeGeometry
// so the mini prints in the crowd grid can reuse the exact same math.
function ridgePoint(r, thetaDeg) {
  return sharedRidgePoint(RIDGE_CX, RIDGE_CY, r, thetaDeg);
}
function ridgePathD(r, shape) {
  return sharedRidgePathD(RIDGE_CX, RIDGE_CY, RIDGE_LEG_BOTTOM, r, shape);
}

function ridgeGeometry(id) {
  const idx = Math.max(0, RIDGE_ORDER.indexOf(id));
  const n = RIDGE_ORDER.length - 1;
  const t = n > 0 ? idx / n : 0;
  const r = RIDGE_MAX_R - t * (RIDGE_MAX_R - RIDGE_MIN_R);
  const strokeWidth = 3.4 - t * 2.1; // thicker outer, thinner inner
  const shape = RIDGE_VARIANTS[idx % RIDGE_VARIANTS.length];
  const d = ridgePathD(r, shape);
  // Topmost point of the ring (theta=90deg) — used for the red callout dot / badge.
  const apex = ridgePoint(r, 90);
  return { d, strokeWidth, apex, r };
}

// Irregular, non-repeating dash rhythm — signals "this ridge encodes
// distinguishing data," deliberately not a uniform repeating pattern.
const IRREGULAR_DASH = '3 11 6 2 9 4 12 3 5 10 2 7';

function RidgeItem({ bar, onBarSelect }) {
  const [open, setOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState(null);
  const closeTimer = useRef(null);
  const canOpen = bar.visible && bar.description;
  const { d, strokeWidth, apex } = ridgeGeometry(bar.id);

  // "Active" = this step's content is actively discussing this field — the
  // solid ink ridge crossfades to a dashed version of itself, same color,
  // same position. Never rendered in red; red stays a sparing accent.
  const isActive = !!bar.glow && bar.visible;
  const showAccentDot = isActive && bar.color === ACCENT;
  const keyframeActive = bar.isEntering || bar.isExiting || bar.isDrawing;

  // Hover-driven, not click-driven: the popover appears as soon as the
  // pointer enters the ridge's hit target and disappears as soon as it
  // leaves. A short close delay lets the pointer cross the small gap onto
  // the popover itself (e.g. to read a longer "why it's collected" note)
  // without it vanishing mid-travel. Touch devices have no hover, so tap
  // still opens/toggles it there.
  function clearCloseTimer() {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  }
  function handleEnter(e) {
    if (!canOpen || onBarSelect) return;
    clearCloseTimer();
    setAnchorRect(e.currentTarget.getBoundingClientRect());
    setOpen(true);
  }
  function handleLeave() {
    if (!canOpen || onBarSelect) return;
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }
  function handleClick(e) {
    if (!canOpen) return;
    if (onBarSelect) { onBarSelect(bar); return; }
    setAnchorRect(e.currentTarget.getBoundingClientRect());
    setOpen(o => !o);
  }

  useEffect(() => () => clearCloseTimer(), []);

  if (!bar.visible) return null;

  const classes = ['ridge'];
  if (keyframeActive) classes.push('ridge-draw');
  if (bar.isSuppressedGhost) classes.push('ridge-suppressed');

  return (
    <g
      className={classes.join(' ')}
      data-bar-id={bar.id}
      style={{ '--ridge-delay': `${bar.enterDelay ?? bar.scanDelay ?? 0}ms`, opacity: bar.isSuppressedGhost ? 0.3 : (bar.opacity ?? 1) }}
    >
      {/* Wide invisible hit target for hover/click/tap */}
      {canOpen && (
        <path d={d} fill="none" stroke="transparent" strokeWidth={strokeWidth + 16}
          style={{ cursor: 'pointer' }}
          onMouseEnter={handleEnter} onMouseLeave={handleLeave} onClick={handleClick} />
      )}
      <path
        d={d}
        className="ridge-solid"
        fill="none"
        stroke="var(--ink)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        pathLength={keyframeActive ? 1 : undefined}
        style={{
          opacity: isActive ? 0 : 1,
          strokeDasharray: bar.isSuppressedGhost ? '2 4' : (keyframeActive ? 1 : 'none'),
          strokeDashoffset: keyframeActive ? 1 : 0,
        }}
      />
      <path
        d={d}
        className="ridge-dashed"
        fill="none"
        stroke="var(--ink)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={IRREGULAR_DASH}
        style={{ opacity: isActive ? 1 : 0 }}
      />
      {showAccentDot && (
        <circle className="ridge-accent-dot" cx={apex.x} cy={apex.y} r={4.5} fill="var(--red)" />
      )}
      {open && canOpen && !onBarSelect && (
        <BarPopover
          bar={bar}
          description={bar.description}
          onClose={() => setOpen(false)}
          anchorRect={anchorRect}
          variant="compact"
          onMouseEnter={clearCloseTimer}
          onMouseLeave={handleLeave}
        />
      )}
    </g>
  );
}

function FingerprintRidgeField({ bars, stepIndex, onBarSelect }) {
  return (
    <svg
      className="fingerprint-ridges"
      viewBox={`0 0 ${RIDGE_VIEW_W} ${RIDGE_VIEW_H}`}
      preserveAspectRatio="xMidYMax meet"
      role="img"
      aria-label="Fingerprint-style visualization of your health record fields"
    >
      {bars.map(bar => <RidgeItem key={bar.id} bar={bar} onBarSelect={onBarSelect} />)}
    </svg>
  );
}

// ─── Bar state derivation ─────────────────────────────────────────────────────

const DEID_GRAY = IDENTIFIER_GRAY;
const BAR_HEIGHT = 28;
const BAR_SCALE = 1.0;

// Tonal ramp off the shared ink/gray system, not a separate palette.
const GENERALIZED_SHADES = { dob: IDENTIFIER_GRAY, zip: '#6b6157', diagnosis: '#4a4038' };


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
        // Flicker between the established palette, not random full-spectrum hues.
        flashColors: [ACCENT, INK, IDENTIFIER_GRAY, ACCENT],
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
        return { ...base, glow: ACCENT, color: ACCENT, opacity: 1 };
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
          color: IDENTIFIER_GRAY,
          isNoised: true,
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
      if (bar.id === PATTERN_A_ID) return { ...base, color: ACCENT, opacity: 1, glow: ACCENT };
      if (bar.id === PATTERN_B_ID) return { ...base, color: ACCENT, opacity: 1, glow: ACCENT };
      if (!base.visible) return base;
      return { ...base, opacity: 0.25 };
    }

    return base;
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// anchorRect: DOMRect of the tapped/hovered bar — when provided the popover
// renders via a portal at position:fixed so it escapes any overflow:hidden /
// zoom ancestor (and, for ridges, the SVG coordinate space, which can't host
// an arbitrary HTML div directly).
//
// variant: 'compact' (used by the desktop ridge hover popover) sizes and
// anchors a small grey box right next to the hovered element, flipping side
// / clamping to the viewport rather than ever spanning most of the screen.
// Omitted (FingerprintBar's existing mobile tap-to-open sheet) keeps its
// original full-width bottom-sheet layout — untouched.
function BarPopover({ bar, description, onClose, anchorRect, variant, onMouseEnter, onMouseLeave }) {
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

  let fixedStyle = {};
  if (variant === 'compact' && anchorRect) {
    const PAD = 12;
    const WIDTH = 260;
    let left = anchorRect.right + PAD;
    if (left + WIDTH + PAD > window.innerWidth) left = anchorRect.left - WIDTH - PAD;
    left = Math.max(PAD, Math.min(left, window.innerWidth - WIDTH - PAD));
    const top = Math.max(PAD, Math.min(anchorRect.top, window.innerHeight - PAD - 220));
    fixedStyle = {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${WIDTH}px`,
      maxHeight: `min(280px, calc(100vh - ${PAD * 2}px))`,
      overflowY: 'auto',
      zIndex: 1000,
    };
  } else if (anchorRect) {
    fixedStyle = {
      position: 'fixed',
      top: 'calc(28vh + 28px)',
      bottom: '60px',
      left: '16px',
      right: '16px',
      width: 'auto',
      maxHeight: 'none',
      overflowY: 'auto',
      zIndex: 1000,
    };
  }

  // bar.color carries the field's identity tint for the ridge itself, but
  // that's `INK` for most fields — which now equals this popover's own dark
  // background, making an inline-styled label/border invisible-on-invisible.
  // Only defer to bar.color when it's a genuine accent (gray/red); otherwise
  // fall back to the popover's own readable foreground.
  const accentColor = (bar.color === IDENTIFIER_GRAY || bar.color === ACCENT) ? bar.color : 'var(--ink)';

  const node = (
    <div
      ref={ref}
      className={`bar-popover${variant === 'compact' ? ' bar-popover--compact' : ''}`}
      role="dialog"
      aria-label={bar.label}
      style={{ borderLeftColor: accentColor, ...fixedStyle }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="bar-popover__header">
        <span className="bar-popover__label" style={{ color: accentColor }}>{bar.label}</span>
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
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          marginLeft: '7.5rem',
          marginBottom: '5px',
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
          marginBottom: '5px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          marginLeft: '7.5rem',
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
  if (!vertical) {
    return (
      <div className="fingerprint-core fingerprint-core--ridges" style={{ opacity: dimmed ? 0.22 : 1, position: 'relative' }}>
        <FingerprintRidgeField bars={bars} stepIndex={stepIndex} onBarSelect={onBarSelect} />
      </div>
    );
  }
  return (
    <div
      className="fingerprint-core fingerprint-core--vertical"
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

  // Retrigger the scan animation each time step 0 is entered (including initial load
  // and the first scroll down, where activeStep is already 0 so React skips re-render).
  const [scanKey, setScanKey] = useState(0);
  useEffect(() => {
    if (step === 0) setScanKey(k => k + 1);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <div className="fp-stage">
        {showSingle && (
          <div
            className="fp-stage__single"
            ref={singleElRef}
            style={{ ...(displayMode === 'to-single' ? growStyle : {}), zIndex: displayMode === 'to-single' ? 2 : 1 }}
          >
            <div className={isLocked ? 'fp-bars-locked' : ''} style={vertical && !showGrid ? { height: '100%' } : {}}>
              <FingerprintCore key={step === 0 ? `scan-${scanKey}` : 'core'} bars={bars} stepIndex={step} vertical={vertical && !showGrid} onBarSelect={onBarSelect} />
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


     
    </div>
  );
}
