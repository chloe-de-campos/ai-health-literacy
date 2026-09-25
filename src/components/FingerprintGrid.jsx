import { IDENTIFIER_GRAY, ACCENT } from '../data/bars';
import { ridgePoint, ridgePathD, RIDGE_VARIANTS, hashInt } from '../utils/ridgeGeometry';

// 6×5 grid layout
//  0  1  2  3  4  5
//  6  7  8  9 10 11
// 12 13 14 15 16 17
// 18 19 20 21 22 23
// 24 25 26 27 28 29
const GRID_SIZE = 30;
const COLS = 6;
const USER_CELL = 9; // row 1 col 3 — upper-center

// Step 6: cells where the shared pattern lights up (includes user's cell)
const PATTERN_CELLS = new Set([0, 5, 9, 13, 17, 18, 23, 24, 29]);

// ─── Mini ridge print ───────────────────────────────────────────────────────
// Each grid cell renders a small stamp-sized version of the same concentric
// arch/loop print used in the main view — nested rings, legs meeting the arc
// at theta=180/0deg — not a separate bar-chart visual system.

const MINI_VIEW = 64;
const MINI_CX = MINI_VIEW / 2;
const MINI_LEG_BOTTOM = MINI_VIEW - 4;
const MINI_MAX_R = 26;
const MINI_MIN_R = 7;
const MINI_CY = MINI_LEG_BOTTOM - (MINI_LEG_BOTTOM - MINI_MAX_R) * 0.62;
const MINI_RINGS = 4;

// Deterministic per-cell variant offset so cells vary which rings are
// full/partial/stub, evoking "similar but unique" prints without per-render
// randomness.
function ringVariantFor(cellIdx, ringIdx) {
  const h = hashInt(cellIdx * 31 + ringIdx * 7 + 1);
  return RIDGE_VARIANTS[h % RIDGE_VARIANTS.length];
}

function miniRidgeGeometry(cellIdx, ringIdx) {
  const t = MINI_RINGS > 1 ? ringIdx / (MINI_RINGS - 1) : 0;
  const r = MINI_MAX_R - t * (MINI_MAX_R - MINI_MIN_R);
  const strokeWidth = 2.2 - t * 1.3;
  const shape = ringVariantFor(cellIdx, ringIdx);
  const d = ridgePathD(MINI_CX, MINI_CY, MINI_LEG_BOTTOM, r, shape);
  const apex = ridgePoint(MINI_CX, MINI_CY, r, 90);
  return { d, strokeWidth, apex };
}

function MiniPrint({ cellIdx, color, accentColor, opacity, ringHighlights }) {
  return (
    <svg
      className="mini-fp-print"
      viewBox={`0 0 ${MINI_VIEW} ${MINI_VIEW}`}
      preserveAspectRatio="xMidYMax meet"
      style={{ opacity, transition: 'opacity 500ms ease' }}
      aria-hidden="true"
    >
      {Array.from({ length: MINI_RINGS }, (_, ringIdx) => {
        const { d, strokeWidth, apex } = miniRidgeGeometry(cellIdx, ringIdx);
        const isHighlighted = ringHighlights && ringHighlights.has(ringIdx);
        return (
          <g key={ringIdx}>
            <path
              d={d}
              fill="none"
              stroke={isHighlighted ? accentColor : color}
              strokeWidth={isHighlighted ? strokeWidth + 0.5 : strokeWidth}
              strokeLinecap="round"
            />
            {isHighlighted && (
              <circle cx={apex.x} cy={apex.y} r={2} fill={accentColor} />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function MiniFingerprint({ bars, cellIdx, step, entryDelay, isExiting, isPreExit, isLit, suppressEntry }) {
  const isUser = cellIdx === USER_CELL;
  const isPattern = PATTERN_CELLS.has(cellIdx);

  // Step 5: user cell bright, everyone else faded
  // Step 6: pattern cells light up selected bars, others dim
  const cellOpacity = step === 5 ? (isUser ? 1 : 0.38) : 1;

  const col = cellIdx % COLS;
  const dist = Math.abs(cellIdx - USER_CELL);

  let animation;
  if (suppressEntry) {
    animation = 'none';
  } else if (isExiting && !isUser) {
    const exitAnim = col < COLS / 2 ? 'cell-fly-out-left' : 'cell-fly-out-right';
    animation = `${exitAnim} 380ms cubic-bezier(0.4,0,0.6,1) ${dist * 20}ms both`;
  } else {
    const flyAnim = col < COLS / 2 ? 'cell-fly-left' : 'cell-fly-right';
    const staggerDelay = (entryDelay ?? 0) + dist * 28;
    animation = `${flyAnim} 420ms cubic-bezier(0.22,1,0.36,1) ${staggerDelay}ms both`;
  }

  // Derive this cell's print color + which rings (if any) should read as
  // "highlighted" — mirrors the old per-bar highlight/dim logic, just
  // applied to ring positions instead of stacked bars.
  let printOpacity = 1;
  let printColor = isUser ? 'var(--ink)' : IDENTIFIER_GRAY;
  const ringHighlights = new Set();

  if (isPreExit) {
    printOpacity = 0.4;
  } else if (step === 9) {
    printOpacity = isLit ? 1 : 0.3;
    if (isLit) {
      // Two rings stand in for the STEP8_IDS fields being called out.
      ringHighlights.add(1);
      ringHighlights.add(3);
    }
  } else if (step === 6) {
    if (isPattern) {
      ringHighlights.add(1); // stands in for PATTERN_A_ID
      ringHighlights.add(3); // stands in for PATTERN_B_ID
      printOpacity = 1;
    } else {
      printOpacity = 0.3;
    }
  }

  if (!isUser) {
    printColor = isPattern && step === 6 ? IDENTIFIER_GRAY : '#7a7062';
  }

  return (
    <div
      className={`mini-fp${isUser ? ' mini-fp--user' : ''}`}
      style={{
        opacity: cellOpacity,
        transition: 'opacity 500ms ease',
        animation,
      }}
    >
      <MiniPrint
        cellIdx={cellIdx}
        color={printColor}
        accentColor={ACCENT}
        opacity={printOpacity}
        ringHighlights={ringHighlights}
      />
    </div>
  );
}

export default function FingerprintGrid({ bars, step, entryDelay, isExiting, isPreExit }) {
  return (
    <div className="fp-grid">
      {Array.from({ length: GRID_SIZE }, (_, i) => (
        <MiniFingerprint
          key={i}
          bars={bars}
          cellIdx={i}
          step={step}
          entryDelay={entryDelay}
          isExiting={isExiting}
          isPreExit={isPreExit}
          isLit={false}
          suppressEntry={false}
        />
      ))}
    </div>
  );
}
