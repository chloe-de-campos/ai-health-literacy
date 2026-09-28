import React, { useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { useState } from 'react';
import StickyFingerprint from './StickyFingerprint';
import StepContent from './StepContent';
import ZoomOutView from './ZoomOutView';
import SourcesSection from './SourcesSection';
import STEPS from '../data/steps';

function buildSlides() {
  const slides = [{ type: 'intro' }];
  for (const step of STEPS) {
    if (step.subSteps) {
      // One intro slide shows the heading + overview; subsequent slides show
      // each technique individually so the fingerprint can animate per-technique.
      slides.push({ type: 'step4-intro', stepData: step, step: step.step });
      step.subSteps.forEach((_, subIdx) => {
        slides.push({ type: 'step4-technique', stepData: step, step: step.step, subStep: subIdx });
      });
    } else {
      slides.push({ type: 'step', stepData: step, step: step.step, subStep: null });
    }
  }
  slides.push({ type: 'sources' });
  return slides;
}

const SLIDES = buildSlides();

// Wraps StickyFingerprint and dynamically zooms it to fill the strip height.
// On step changes we defer measurement until after fingerprint bar animations
// settle (~520 ms) so the zoom never recalculates mid-animation.
// ResizeObserver re-measures immediately on viewport changes.
function AutoScaledFingerprint({ step, subStep, onBarSelect }) {
  const containerRef = useRef(null);
  const innerRef = useRef(null);
  const animTimerRef = useRef(null);

  // Grid and zoom-out steps need scaling; vertical bar steps size themselves
  const needsZoom = step === 5 || step === 6;

  function applyZoom(container, inner) {
    inner.style.zoom = '1';
    const naturalH = inner.scrollHeight;
    const availH = container.clientHeight;
    if (naturalH > 0) {
      inner.style.zoom = String(Math.min(1, (availH * 0.9) / naturalH));
    }
  }

  useLayoutEffect(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;
    if (!needsZoom) { inner.style.zoom = '1'; return; }
    clearTimeout(animTimerRef.current);
    animTimerRef.current = setTimeout(() => applyZoom(container, inner), 540);
    return () => clearTimeout(animTimerRef.current);
  }, [step, subStep, needsZoom]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner || !needsZoom) return;
    applyZoom(container, inner);
    const ro = new ResizeObserver(() => applyZoom(container, inner));
    ro.observe(container);
    return () => ro.disconnect();
  }, [needsZoom]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={containerRef} className="mobile-fp-strip">
      <div ref={innerRef} style={needsZoom ? {} : { height: '100%' }}>
        <StickyFingerprint step={step} subStep={subStep} vertical={!needsZoom} onBarSelect={onBarSelect} />
      </div>
    </div>
  );
}

export default function MobileSwipeLayout({ onStepChange }) {
  const slidesRef = useRef(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [selectedBar, setSelectedBar] = useState(null);

  const handleBarSelect = useCallback((bar) => {
    setSelectedBar(prev => prev?.id === bar.id ? null : bar);
  }, []);

  const currentSlide = SLIDES[slideIndex];

  let fpStep = 0;
  let fpSubStep = null;
  if (currentSlide?.type === 'step') {
    fpStep = currentSlide.step;
    fpSubStep = currentSlide.subStep;
  } else if (currentSlide?.type === 'step4-intro') {
    // Show the vulnerable fingerprint (step 3) as the "before de-id" state
    fpStep = 3;
  } else if (currentSlide?.type === 'step4-technique') {
    fpStep = 4;
    fpSubStep = currentSlide.subStep;
  } else if (currentSlide?.type === 'sources') {
    fpStep = 8;
  }

  // Lock body scroll so only horizontal slide scroll is active
  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    return () => { document.documentElement.style.overflow = ''; };
  }, []);

  // Dismiss bar detail when the slide changes
  useEffect(() => { setSelectedBar(null); }, [slideIndex]);

  // Notify parent of fingerprint state changes
  useEffect(() => {
    onStepChange(fpStep, fpSubStep);
  }, [fpStep, fpSubStep, onStepChange]);

  function goToSlide(idx) {
    const el = slidesRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(SLIDES.length - 1, idx));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' });
  }

  // Detect which slide is settled via scroll position
  useEffect(() => {
    const el = slidesRef.current;
    if (!el) return;
    let timer;
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const idx = Math.round(el.scrollLeft / el.clientWidth);
        setSlideIndex(idx);
      }, 50);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      clearTimeout(timer);
    };
  }, []);

  // Fade slide content in as each slide snaps into view
  useEffect(() => {
    const el = slidesRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          entry.target.classList.toggle('mobile-slide--active', entry.isIntersecting);
        });
      },
      { root: el, threshold: 0.45 }
    );
    el.querySelectorAll('.mobile-slide').forEach(s => io.observe(s));
    return () => io.disconnect();
  }, []);

  const totalSlides = SLIDES.length;
  const progressPct = ((slideIndex + 1) / totalSlides) * 100;

  let progressLabel;
  if (slideIndex === 0) progressLabel = 'Intro';
  else if (slideIndex === totalSlides - 1) progressLabel = 'Sources';
  else progressLabel = `${slideIndex} / ${totalSlides - 2}`;

  return (
    <div className="mobile-layout">
      {/* Fingerprint strip — hidden on intro slide so it gets full height */}
      {slideIndex !== 0 && <AutoScaledFingerprint step={fpStep} subStep={fpSubStep} onBarSelect={handleBarSelect} />}

      {/* Tap hint shown below the fingerprint strip on non-intro slides */}
      {slideIndex !== 0 && (
        <p className="mobile-fp-hint">Tap a bar to learn more</p>
      )}

      {/* Horizontally snapping slide panels */}
      <div className="mobile-slides" ref={slidesRef}>
        {SLIDES.map((slide, i) => (
          <div key={i} className="mobile-slide">
            <div className="mobile-slide-inner">
              {slide.type === 'intro' && (
                <div className="mobile-intro-content">
                  <h1 className="site-title mobile-intro-title">
                    How AI Uses Your Health Data in a Clinical Trial
                  </h1>
                  <p className="site-subtitle mobile-intro-subtitle">
                    Joining a clinical trial means contributing to research that could help thousands of people who share your diagnosis. It also means handing over some of the most sensitive data that exists about you. Understanding what actually happens, step by step, is the only way to make the decision on your own terms.
                  </p>
                  <div className="mobile-swipe-cue">
                    <span className="mobile-swipe-label">Swipe to begin</span>
                    <svg
                      className="mobile-swipe-arrow"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9 6 15 12 9 18" />
                    </svg>
                  </div>
                </div>
              )}

              {slide.type === 'step' && (
                <>
                  <StepContent step={slide.stepData} subStep={slide.subStep} hideQuestion={slide.step === 9} />
                  {slide.step === 9 && (
                    <div style={{ marginTop: '32px' }}>
                      <ZoomOutView />
                    </div>
                  )}
                </>
              )}

              {slide.type === 'step4-intro' && (
                <StepContent step={slide.stepData} introOnly />
              )}

              {slide.type === 'step4-technique' && (() => {
                const sub = slide.stepData.subSteps[slide.subStep];
                if (sub.isOutro) {
                  return (
                    <div className="step-content">
                      <div className="step-number">0{slide.stepData.step + 1}</div>
                      <h2 className="step-heading">{slide.stepData.heading}</h2>
                      <div className="step-outro">
                        {sub.body.split('\n\n').map((para, i) => (
                          <p key={i} className="step-body">{para}</p>
                        ))}
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="step-content">
                    <div className="step-number">0{slide.stepData.step + 1}</div>
                    <h2 className="step-heading">{slide.stepData.heading}</h2>
                    {/* StepContent's techniqueOnly branch renders its own
                        .step-technique (border-left + padding), so wrapping
                        it in another one drew the left rule twice. */}
                    <div className="mobile-technique-wrap">
                      <StepContent step={slide.stepData} subStep={slide.subStep} techniqueOnly />
                    </div>
                  </div>
                );
              })()}

              {slide.type === 'sources' && (
                <>
                  <SourcesSection />
                  <footer className="site-footer">
                    <p>Created by <strong>Chloe de Campos</strong> · MRCT Center, Brigham and Women's Hospital / Harvard T.H. Chan School of Public Health</p>
                    <p>Citations drawn from peer-reviewed research and federal regulatory sources.</p>
                  </footer>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bar detail overlay — appears in the slide area when a bar is tapped */}
      {selectedBar && (
        <div className="mobile-bar-detail" onClick={() => setSelectedBar(null)}>
          <div className="mobile-bar-detail-card" onClick={e => e.stopPropagation()}>
            <div className="mobile-bar-detail-header">
              <span className="mobile-bar-detail-label" style={{ color: selectedBar.color }}>
                {selectedBar.label}
              </span>
              <button className="mobile-bar-detail-close" onClick={() => setSelectedBar(null)} aria-label="Close">×</button>
            </div>
            <p className="mobile-bar-detail-desc">{selectedBar.description}</p>
            {selectedBar.why && (
              <div className="mobile-bar-detail-why">
                <span className="mobile-bar-detail-why-label">Why it's collected</span>
                <p>{selectedBar.why}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress bar + prev/next controls */}
      <div className="mobile-progress">
        <button
          className="mobile-nav-btn"
          onClick={() => goToSlide(slideIndex - 1)}
          disabled={slideIndex === 0}
          aria-label="Previous slide"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="mobile-progress-track">
          <div className="mobile-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <button
          className="mobile-nav-btn"
          onClick={() => goToSlide(slideIndex + 1)}
          disabled={slideIndex === SLIDES.length - 1}
          aria-label="Next slide"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <span className="mobile-progress-label">{progressLabel}</span>
      </div>
    </div>
  );
}
