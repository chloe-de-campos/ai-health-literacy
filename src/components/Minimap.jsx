import React from 'react';
import STEPS from '../data/steps';

// Precompute the first flat .scroll-step index for each step in STEPS.
// Step 4 has 4 sub-steps, so it occupies 4 scroll positions instead of 1.
const STEP_MAP = (() => {
  let flat = 0;
  return STEPS.map(s => {
    const firstIdx = flat;
    const count = s.subSteps ? s.subSteps.length : 1;
    flat += count;
    return { firstIdx, subCount: count };
  });
})();

function scrollToFlatIndex(idx) {
  document.querySelectorAll('.scroll-step')[idx]
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function Minimap({ activeStep, activeSubStep }) {
  return (
    <nav className="minimap" aria-label="Section navigation">
      {STEPS.map((s, i) => {
        const { firstIdx, subCount } = STEP_MAP[i];
        const isActive = i === activeStep;
        const hasSubSteps = subCount > 1;

        return (
          <div key={i} className="minimap-item">
            <button
              className={`minimap-dot${isActive && !hasSubSteps ? ' minimap-dot--active' : ''}`}
              title={s.heading}
              aria-label={s.heading}
              aria-current={isActive ? 'step' : undefined}
              onClick={() => scrollToFlatIndex(firstIdx)}
            />
            {isActive && hasSubSteps && (
              <div className="minimap-subdots">
                {Array.from({ length: subCount }, (_, j) => (
                  <button
                    key={j}
                    className={`minimap-subdot${j === (activeSubStep ?? 0) ? ' minimap-subdot--active' : ''}`}
                    aria-label={s.subSteps[j]?.technique ?? `Part ${j + 1}`}
                    onClick={() => scrollToFlatIndex(firstIdx + j)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
