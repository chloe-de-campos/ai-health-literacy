import React, { useState, useCallback, useEffect, useRef } from 'react';
import './App.css';
import ScrollyContainer from './components/ScrollyContainer';
import StickyFingerprint from './components/StickyFingerprint';
import Minimap from './components/Minimap';
import SourcesSection from './components/SourcesSection';
import MobileSwipeLayout from './components/MobileSwipeLayout';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

export default function App() {
  const [activeStep, setActiveStep] = useState(0);
  const [subStep, setSubStep] = useState(null);
  const isMobile = useIsMobile();
  const stickyRef = useRef(null);
  const narrativeRef = useRef(null);

  const handleStepChange = useCallback((step, sub) => {
    setActiveStep(step);
    setSubStep(sub ?? null);
  }, []);

  useEffect(() => {
    const panel = stickyRef.current;
    const narrative = narrativeRef.current;
    if (!panel || !narrative) return;

    let released = false;

    const onScroll = () => {
      const narrativeBottom = narrative.getBoundingClientRect().bottom;
      const shouldRelease = narrativeBottom <= window.innerHeight;

      if (shouldRelease && !released) {
        const layoutRect = panel.parentElement.getBoundingClientRect();
        panel.style.position = 'relative';
        panel.style.top = 'auto';
        panel.style.marginTop = `${-layoutRect.top}px`;
        released = true;
      } else if (!shouldRelease && released) {
        panel.style.position = '';
        panel.style.top = '';
        panel.style.marginTop = '';
        released = false;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Fly-in headings: the big intro title and every step heading (all
  // rendered up front by the scrollama layout, not mounted per step) slide
  // in from the left and fade as they enter the viewport, and reverse back
  // out if you scroll away — plain CSS transition driven by one shared
  // IntersectionObserver toggling a class, no animation library.
  useEffect(() => {
    if (isMobile) return;
    const els = document.querySelectorAll('.fly-in');
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle('is-inview', entry.isIntersecting);
        });
      },
      { threshold: 0.3 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [isMobile]);

  if (isMobile) {
    return <MobileSwipeLayout onStepChange={handleStepChange} />;
  }

  const isDark = activeStep === 4;

  return (
    <div className={`app${isDark ? ' app--dark' : ''}`}>
      <div className="stage-inner">
        <main className="scrolly-layout">
          <aside ref={stickyRef} className="sticky-panel">
            <StickyFingerprint step={activeStep} subStep={subStep} />
          </aside>

          <section ref={narrativeRef} className="narrative-panel">
            <div className="intro-block">
              <h1 className="site-title fly-in">How AI Uses <em>Your Health Data</em> in a Clinical Trial</h1>
              <p className="site-subtitle">Joining a clinical trial means contributing to research that could help thousands of people who share your diagnosis. It also means handing over some of the most sensitive data that exists about you. The privacy risks in that transaction didn't start with AI, but AI changed the scale of what can be done with your data, and how fast.
                <br/><br/>
Understanding what actually happens, step by step, is the only way to make the decision on your own terms.</p>
            </div>
            <ScrollyContainer onStepChange={handleStepChange} subStep={subStep} />
          </section>
        </main>

        <SourcesSection />
      </div>
      <Minimap activeStep={activeStep} activeSubStep={subStep} />
    </div>
  );
}
