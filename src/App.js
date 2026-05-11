import React, { useState, useCallback, useEffect } from 'react';
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

  const handleStepChange = useCallback((step, sub) => {
    setActiveStep(step);
    setSubStep(sub ?? null);
  }, []);

  if (isMobile) {
    return <MobileSwipeLayout onStepChange={handleStepChange} />;
  }

  return (
    <div className="app">
      <header className="site-header">
        <div className="site-header-content">
          <h1 className="site-title">How AI Uses Your Health Data in a Clinical Trial</h1>
          <p className="site-subtitle">Joining a clinical trial means contributing to research that could help thousands of people who share your diagnosis. It also means handing over some of the most sensitive data that exists about you. The privacy risks in that transaction didn't start with AI, but AI changed the scale of what can be done with your data, and how fast.
            <br/><br/>
Understanding what actually happens, step by step, is the only way to make the decision on your own terms.</p>
        </div>
        <div className="site-scroll-cue">
          <span className="site-scroll-label">Scroll to begin</span>
          <svg className="site-scroll-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </header>

      <main className="scrolly-layout">
        <aside className="sticky-panel">
          <StickyFingerprint step={activeStep} subStep={subStep} />
        </aside>

        <section className="narrative-panel">
          <ScrollyContainer onStepChange={handleStepChange} subStep={subStep} />
        </section>
      </main>

      <SourcesSection />
<Minimap activeStep={activeStep} activeSubStep={subStep} />
    </div>
  );
}
