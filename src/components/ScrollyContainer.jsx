import { useEffect, useRef, useMemo } from 'react';
import scrollama from 'scrollama';
import STEPS from '../data/steps';
import StepContent, { parseBody, renderHeading } from './StepContent';
import ZoomOutView from './ZoomOutView';
import CitationPopover from './CitationPopover';
import scrollToStep from '../utils/scrollToStep';

function buildScrollPositions() {
  return STEPS.flatMap(s =>
    s.subSteps
      ? s.subSteps.map((_, subIdx) => ({ step: s.step, subStep: subIdx }))
      : [{ step: s.step, subStep: null }]
  );
}

function Step4StickyContent({ step, subStep }) {
  const sub = step.subSteps[subStep ?? 0];
  const techniqueCount = step.subSteps.filter(s => !s.isOutro).length;

  if (sub.isOutro) {
    return (
      <div className="step-content">
        <div className="step-number">0{step.step + 1}</div>
        <h2 className="step-heading fly-in">{renderHeading(step.heading)}</h2>
        <div className="step-outro">
          <div className="step-technique__label" style={{ marginBottom: '14px' }}>
            What de-identification doesn't cover
          </div>
          {sub.body.split('\n\n').map((para, i) => (
            <p key={i} className="step-body">{para}</p>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="step-content">
      <div className="step-number">0{step.step + 1}</div>
      <h2 className="step-heading fly-in">{renderHeading(step.heading)}</h2>
      <p className="step-body step-body--intro">{parseBody(step.intro)}</p>
      <div className="step-technique" key={subStep}>
        <div className="step-technique__label">
          {sub.technique}
          <span className="step-technique__counter"> · {(subStep ?? 0) + 1} of {techniqueCount}</span>
        </div>
        <p className="step-body">
          {sub.body}
          {sub.citationIds?.map(id => <CitationPopover key={id} id={id} />)}
        </p>
      </div>
    </div>
  );
}

export default function ScrollyContainer({ onStepChange, subStep, coverLeadIn = 0 }) {
  const scrollerRef = useRef(null);
  const scrollPositions = useMemo(() => buildScrollPositions(), []);
  const currentIdxRef = useRef(0);

  function navigateTo(idx) {
    const clamped = Math.max(0, Math.min(scrollPositions.length - 1, idx));
    const steps = document.querySelectorAll('.scroll-step');
    scrollToStep(steps[clamped]);
  }

  // A step whose content is taller than the viewport (long body copy, a
  // tall sub-component) still snap-aligns to its own top like every other
  // step — but with scroll-snap-type: y proximity, a scroll gesture that
  // ends within that small overflow gets pulled back to the top it's
  // already at, or forward to the next step's snap point, whichever is
  // nearest — so the reader can get stuck unable to reach the last bit of
  // a tall step. Steps that don't fit in one viewport opt out of snapping
  // (.scroll-step--tall) so normal scrolling can reach all of their
  // content; short steps keep snapping as before.
  //
  // Tried and reverted: toggling html.snap-suspended continuously off a
  // scroll listener, keyed to exact scroll position. That fights the
  // browser's own in-progress snap settling — changing scroll-snap-type
  // mid-gesture can freeze the scroll outright rather than just missing a
  // snap point. Keeping the toggle on scrollama's onStepEnter (infrequent,
  // between gestures, not during one) instead — widened to also cover a
  // tall step's immediate neighbors, since 'proximity' can still pull
  // across that boundary from a step next to (not just inside) a tall one.
  const stepElsRef = useRef([]);

  useEffect(() => {
    const markTallSteps = () => {
      stepElsRef.current = [...document.querySelectorAll('.scroll-step')];
      stepElsRef.current.forEach((el) => {
        el.classList.toggle('scroll-step--tall', el.offsetHeight > window.innerHeight + 1);
      });
    };
    markTallSteps();
    document.fonts?.ready.then(markTallSteps); // heights can shift once webfonts swap in
    window.addEventListener('resize', markTallSteps);
    return () => window.removeEventListener('resize', markTallSteps);
  }, []);

  useEffect(() => {
    const scroller = scrollama();
    scroller
      .setup({ step: '.scroll-step', offset: 0.5, debug: false })
      .onStepEnter(({ index }) => {
        currentIdxRef.current = index;
        const pos = scrollPositions[index];
        if (pos) onStepChange(pos.step, pos.subStep);
        const els = stepElsRef.current;
        const nearTall = [els[index - 1], els[index], els[index + 1]]
          .some((el) => el?.classList.contains('scroll-step--tall'));
        document.documentElement.toggleAttribute('data-suspend-tall', nearTall);
      });

    const handleResize = () => scroller.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      scroller.destroy();
      window.removeEventListener('resize', handleResize);
      document.documentElement.removeAttribute('data-suspend-tall');
    };
  }, [onStepChange, scrollPositions]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); navigateTo(currentIdxRef.current + 1); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); navigateTo(currentIdxRef.current - 1); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
    <div className="nav-arrows" aria-label="Step navigation">
      <button
        className="nav-arrow-btn"
        onClick={() => navigateTo(currentIdxRef.current - 1)}
        aria-label="Previous step"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
      <button
        className="nav-arrow-btn"
        onClick={() => navigateTo(currentIdxRef.current + 1)}
        aria-label="Next step"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </div>
    <div className="scroll-steps" ref={scrollerRef}>
      {/* Scroll runway for the pinned cover → Step 1 transition (App.js).
          Lives inside .scroll-steps so Step 1 can be sticky-held against it. */}
      {coverLeadIn > 0 && <div className="cover-spacer" style={{ height: coverLeadIn }} aria-hidden="true" />}
      {STEPS.map((step) =>
        step.subSteps ? (
          <div key={`step-${step.step}-group`} className="step-4-group">
            <div className="step-4-sticky-header">
              <Step4StickyContent step={step} subStep={subStep} />
            </div>
            {step.subSteps.map((_, subIdx) => (
              <div key={`${step.step}-${subIdx}`} className="scroll-step" data-step={step.step} data-substep={subIdx} />
            ))}
          </div>
        ) : (
          <div key={step.step} className="scroll-step" data-step={step.step}>
            <div className="step-content-wrapper">
              <StepContent step={step} hideQuestion={step.step === 9} />
              {step.step === 9 && (
                <div style={{ marginTop: '32px' }}>
                  <ZoomOutView />
                </div>
              )}
            </div>
          </div>
        )
      )}
      <div style={{ height: '40vh' }} />
    </div>
    </>
  );
}
