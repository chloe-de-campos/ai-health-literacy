
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

const PATTERN_A_ID = 'diagnosis';
const PATTERN_B_ID = 'wearable';

// Step 8: bars highlighted green in each lit cell
const STEP8_IDS = ['zip', 'wearable'];

const GENERALIZED_SHADES = { dob: '#c2cdd6', zip: '#8a9aa4', diagnosis: '#5c6e78' };

// Muted palette for crowd bars — grey, green, red, blue, purple
const CROWD_PALETTE = ['#9EAAB5', '#6a9068', '#C45E38', '#5a6e98', '#7a5a90', '#3A9A8F','#8B3A2A'];

function crowdBarColor(cellIdx, barIdx) {
  const h = (((cellIdx * 2654435761) ^ (barIdx * 2246822519)) >>> 0);
  return CROWD_PALETTE[h % CROWD_PALETTE.length];
}

function MiniBar({ color, highlighted, dimmed }) {
  const opacity = dimmed ? 0.15 : highlighted ? 1 : 0.65;
  return (
    <div
      style={{
        width: '100%',
        height: '4px',
        borderRadius: '0',
        marginBottom: '1px',
        backgroundColor: color,
        opacity,
        boxShadow: 'none',
        transition: 'opacity 500ms ease, box-shadow 500ms ease, background-color 500ms ease',
        flexShrink: 0,
      }}
    />
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

  return (
    <div
      className={`mini-fp${isUser ? ' mini-fp--user' : ''}`}
      style={{
        opacity: cellOpacity,
        transition: 'opacity 500ms ease',
        animation,
      }}
    >
      {bars.map((bar, barIdx) => {
        if (!bar.visible) return null;

        const isUserCell = cellIdx === USER_CELL;
        let color = isUserCell ? bar.color : crowdBarColor(cellIdx, barIdx);
        let highlighted = false;
        let dimmed = false;

        if (isPreExit) {
          dimmed = true;
        } else if (step === 9) {
          if (!isLit) {
            dimmed = true;
          } else if (STEP8_IDS.includes(bar.id)) {
            color = '#7ab832';
            highlighted = true;
          } else {
            dimmed = true;
          }
        } else if (step === 6) {
          if (isPattern) {
            if (bar.id === PATTERN_A_ID) { color = '#7ab832'; highlighted = true; }
            else if (bar.id === PATTERN_B_ID) { color = '#026CAC'; highlighted = true; }
            else dimmed = true;
          } else {
            dimmed = true;
          }
        }

        if (bar.isGeneralized && !highlighted) {
          color = GENERALIZED_SHADES[bar.id] ?? color;
        }

        return (
          <MiniBar
            key={bar.id}
            color={color}
            highlighted={highlighted}
            dimmed={dimmed}
          />
        );
      })}
    </div>
  );
}

export default function FingerprintGrid({ bars, step, entryDelay, isExiting, isPreExit }) {
  const visibleBars = bars.filter(b => b.visible);

  return (
    <div className="fp-grid">
      {Array.from({ length: GRID_SIZE }, (_, i) => (
        <MiniFingerprint
          key={i}
          bars={visibleBars}
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
