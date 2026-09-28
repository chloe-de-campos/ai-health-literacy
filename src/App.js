import React, { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './App.css';
import ScrollyContainer from './components/ScrollyContainer';
import StickyFingerprint from './components/StickyFingerprint';
import Minimap from './components/Minimap';
import SourcesSection from './components/SourcesSection';
import MobileSwipeLayout from './components/MobileSwipeLayout';

gsap.registerPlugin(ScrollTrigger);

// Scroll distance of the cover → Step 1 transition. The same height is
// reserved as a lead-in spacer at the top of the step list, so the pinned
// cover has something to scroll over.
const COVER_SCROLL_PX = 700;
// Hero print: oversized and anchored bottom-left — outer arch cut by the
// left edge, legs running off the bottom — then scrubbed down into its
// docked slot.
const HERO_HEIGHT_VH = 1.0;       // drawn print height, as a share of viewport height
const HERO_OUTER_LEG_VW = -0.09;  // outer ridge's left leg sits this far past the left edge
const HERO_APEX_VH = 0.29;        // top of the outer ridge's arc, share of viewport height
// Outer ridge in viewBox units (StickyFingerprint): its left leg
// (RIDGE_CX - RIDGE_MAX_R = 260 - 226) and the top of its arc
// (RIDGE_CY - RIDGE_MAX_R ≈ 323.3 - 226).
const OUTER_LEG_UNITS = 34;
const OUTER_APEX_UNITS = 97.3;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

// FLIP: the one fingerprint SVG lives in the sticky panel, at its docked
// position. Returns the transform (origin 0 0 on .fp-stage) that makes it
// read as the oversized, cropped hero print instead. Measured with any
// in-flight transform stripped, and normalized to the panel's stuck
// position (top: 0), so it's correct whenever ScrollTrigger refreshes.
// Returns null while the single print isn't mounted (e.g. the crowd grid is
// showing), so callers can keep their last good measurement.
function measureHeroTransform(panel, stage) {
  const svg = stage.querySelector('.fingerprint-ridges');
  if (!svg) return null;

  const prev = stage.style.transform;
  stage.style.transform = 'none';
  const panelTop = panel.getBoundingClientRect().top;
  const s = stage.getBoundingClientRect();
  const v = svg.getBoundingClientRect();
  stage.style.transform = prev;

  const vbW = svg.viewBox.baseVal.width, vbH = svg.viewBox.baseVal.height;
  const k = Math.min(v.width / vbW, v.height / vbH);
  // Drawn content box inside the SVG (preserveAspectRatio xMidYMax meet).
  const cw = vbW * k, ch = vbH * k;
  const cLeft = v.left + (v.width - cw) / 2;
  const cBottom = v.bottom - panelTop;
  const sLeft = s.left, sTop = s.top - panelTop;

  const vw = window.innerWidth, vh = window.innerHeight;
  const scale = (HERO_HEIGHT_VH * vh) / ch;
  const hk = k * scale; // px per viewBox unit in the hero
  const heroLeft = HERO_OUTER_LEG_VW * vw - OUTER_LEG_UNITS * hk;
  const heroTop = HERO_APEX_VH * vh - OUTER_APEX_UNITS * hk;
  const heroBottom = heroTop + ch * scale;

  return {
    x: heroLeft - sLeft - scale * (cLeft - sLeft),
    y: heroBottom - sTop - scale * (cBottom - sTop),
    scale,
  };
}

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
  const reducedMotion = usePrefersReducedMotion();
  // True once the fingerprint has settled into its sticky slot (or, with
  // reduced motion, once the cover has crossfaded out). Gates the Step 1
  // field labels and the "Hover a ridge" hint.
  const [docked, setDocked] = useState(false);
  const stickyRef = useRef(null);
  const narrativeRef = useRef(null);
  const coverRef = useRef(null);
  const coverTitleRef = useRef(null);
  const coverIntroRef = useRef(null);

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

  // Cover → Step 1. One scrubbed timeline over COVER_SCROLL_PX, pinned
  // cover on top; the single fingerprint SVG FLIPs from the hero transform
  // back to its natural docked slot. Once the timeline completes, the
  // existing sticky + Scrollama behavior is simply what's underneath.
  useLayoutEffect(() => {
    if (isMobile) return;
    const cover = coverRef.current;
    const panel = stickyRef.current;
    const narrative = narrativeRef.current;
    const stage = panel?.querySelector('.fp-stage');
    const spacer = narrative?.querySelector('.cover-spacer');
    const step0 = narrative?.querySelector('.scroll-step[data-step="0"]');
    const step0Content = step0?.querySelector('.step-content-wrapper');
    if (!cover || !stage || !spacer || !step0 || !step0Content) return;

    const coverText = [coverTitleRef.current, coverIntroRef.current];
    // Doc offset where Step 1 sits at the top of the viewport = docked.
    const dockedScroll = () => spacer.getBoundingClientRect().bottom + window.scrollY;

    const ctx = gsap.context(() => {
      // Start the cover text from clean inline styles. The h1/panel nodes
      // survive hot reloads, so a style an earlier build of this effect left
      // behind (e.g. visibility: hidden) would otherwise stick around.
      gsap.set(coverText, { clearProps: 'all' });

      if (reducedMotion) {
        // No pin, no scale: the print is already docked on the cover, and
        // crossing this point swaps cover text for Step 1 (a 300ms CSS
        // crossfade keyed off .app--cover).
        ScrollTrigger.create({
          start: () => dockedScroll() * 0.4,
          end: 'max',
          onToggle: (self) => setDocked(self.isActive),
        });
        return;
      }

      // Hold Step 1 in its docked spot while the cover plays, so it only
      // rises the spec'd 24px rather than scrolling in from below. Sticky
      // (compositor-driven) rather than a counter-scroll transform; skipped
      // if the step is taller than the viewport and can't sit flush at top.
      const holdStep0 = () => {
        step0.classList.toggle('scroll-step--held', step0.offsetHeight <= window.innerHeight + 1);
      };
      holdStep0();
      ScrollTrigger.addEventListener('refreshInit', holdStep0);

      const setWillChange = (on) => {
        gsap.set(stage, { willChange: on ? 'transform' : 'auto' });
        gsap.set(coverText, { willChange: on ? 'transform, opacity' : 'auto' });
      };

      let hero = measureHeroTransform(panel, stage) ?? { x: 0, y: 0, scale: 1 };
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: cover,
          start: 0,
          end: dockedScroll,
          pin: true,
          pinSpacing: false,
          scrub: true,
          invalidateOnRefresh: true,
          onRefreshInit: () => { hero = measureHeroTransform(panel, stage) ?? hero; },
          onToggle: (self) => setWillChange(self.isActive),
          onLeave: () => {
            // Fully docked: drop the identity transforms so nothing here
            // leaves a stacking/containing-block side effect on Steps 2–10.
            gsap.set([stage, step0Content], { clearProps: 'transform' });
            setDocked(true);
            // Let Step 1 become a normal scroll-snap point again. Held (and
            // snap-align: none) only while it's mid-transition — otherwise a
            // fast scroll's momentum snaps straight through the last sliver
            // of the scrub to the next step, so the reader never rests on
            // Step 1 long enough to see the field labels land.
            step0.classList.remove('scroll-step--held');
          },
          onEnterBack: () => {
            setDocked(false);
            holdStep0();
          },
        },
      });

      // Headline, then intro, fly off to the right while the print slides
      // up and in from the corner. Scrolling back reverses both, so they fly
      // back in from the right.
      // fromTo (explicit starts), not to: invalidateOnRefresh re-records a
      // .to()'s start from wherever the element is at refresh time, so a
      // resize/hot reload while scrolled past would bake in "off-screen".
      // Nothing here touches opacity/visibility: both pieces leave fully
      // off-screen, and the load fly-in below owns the title's opacity (a
      // second tween on it could capture the fly-in's opacity 0 on a
      // fonts-loaded refresh and leave the title hidden).
      tl.fromTo(coverTitleRef.current, { x: 0 }, { x: () => window.innerWidth, duration: 0.45, ease: 'power2.in' }, 0)
        .fromTo(coverIntroRef.current, { x: 0 }, { x: () => window.innerWidth, duration: 0.45, ease: 'power2.in' }, 0.06)
        .fromTo(
          stage,
          { x: () => hero.x, y: () => hero.y, scale: () => hero.scale, transformOrigin: '0 0' },
          { x: 0, y: 0, scale: 1, transformOrigin: '0 0', duration: 1, ease: 'power2.inOut' },
          0
        )
        .fromTo(step0Content, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out' }, 0.7)
        .fromTo(panel, { '--cover-lines': 0 }, { '--cover-lines': 1, duration: 0.3 }, 0.7);

      setDocked(tl.scrollTrigger.progress >= 1);

      // See App.css's [data-suspend-cover]: scroll-snap-type fights GSAP's
      // pin/unpin right at the hand-off into Step 1 — confirmed by testing
      // with snap disabled entirely, which glided straight through; with it
      // on, a scroll can stop dead exactly at that position. Docking
      // (onLeave, above) also lands scrollY almost exactly on Step 1's own
      // mandatory snap point, so re-enabling snapping the instant docking
      // completes just trades one stuck point for another: the very next
      // scroll input gets fully absorbed settling into a point it's
      // already sitting on. SUSPEND_CLEAR_BUFFER keeps snapping off until
      // the reader's scrolled a bit past that point under their own
      // momentum, landing well clear of it before snapping can grab again.
      const SUSPEND_CLEAR_BUFFER = 120;
      const updateSuspendCover = () => {
        const past = tl.scrollTrigger.progress >= 1 && window.scrollY >= dockedScroll() + SUSPEND_CLEAR_BUFFER;
        document.documentElement.toggleAttribute('data-suspend-cover', !past);
      };
      updateSuspendCover();
      window.addEventListener('scroll', updateSuspendCover, { passive: true });

      // On load, the headline and the intro box fly in from the right, the
      // box just behind the headline. xPercent rather than x, so it composes
      // with the scrubbed exit instead of fighting it.
      if (tl.scrollTrigger.progress === 0) {
        gsap.from(coverTitleRef.current, { xPercent: 110, opacity: 0, duration: 1.1, ease: 'power3.out', delay: 0.15 });
        gsap.from(coverIntroRef.current, { xPercent: 110, opacity: 0, duration: 1.1, ease: 'power3.out', delay: 0.32 });
      }

      return () => {
        ScrollTrigger.removeEventListener('refreshInit', holdStep0);
        window.removeEventListener('scroll', updateSuspendCover);
        step0.classList.remove('scroll-step--held');
        document.documentElement.removeAttribute('data-suspend-cover');
      };
    });

    // Step 1's height (and so whether it can be held) depends on web fonts.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => ctx.revert();
  }, [isMobile, reducedMotion]);

  // Fly-in headings: every step heading (all
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
  const appClass = ['app'];
  if (isDark) appClass.push('app--dark');
  if (!docked) appClass.push('app--cover');
  if (reducedMotion) appClass.push('app--reduced');

  return (
    <div className={appClass.join(' ')}>
      <div className="stage-inner">
        <section ref={coverRef} className="cover" aria-labelledby="cover-title">
          <div className="cover__text">
            <h1 id="cover-title" ref={coverTitleRef} className="cover-title">How AI Uses <em>Your Health Data</em> in a Clinical Trial</h1>
            {/* A play on the "Ask your coordinator" callout: a butter rule
                and dots bracketing a solid panel, so the ridges stop cleanly
                at its edge instead of running through the text. */}
            <div ref={coverIntroRef} className="cover-intro">
              {/* One L-shaped bracket on the top and left edges: the two rules
                  meet on a 45° cut at the top-left corner, and each ends in a
                  gap and a dot. */}
              <span className="cover-intro__bracket" aria-hidden="true">
                <svg className="cover-intro__bracket-rise" width="40" height="40" viewBox="0 0 40 40">
                  <path d="M40 0.75 L0.75 40" stroke="var(--red)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                </svg>
                <span className="cover-intro__bracket-rule cover-intro__bracket-rule--top" />
                <span className="cover-intro__bracket-rule cover-intro__bracket-rule--left" />
                <span className="cover-intro__bracket-dot cover-intro__bracket-dot--top" />
                <span className="cover-intro__bracket-dot cover-intro__bracket-dot--left" />
              </span>
              <div className="cover-intro__label">Before you join</div>
              <p className="cover-intro__text">Joining a clinical trial means contributing to research that could help thousands of people who share your diagnosis. It also means handing over some of the most sensitive data that exists about you. The privacy risks in that transaction didn't start with AI, but AI changed the scale of what can be done with your data, and how fast.
                <br/><br/>
Understanding what actually happens, step by step, is the only way to make the decision on your own terms.</p>
            </div>
          </div>
        </section>

        <main className="scrolly-layout">
          <aside ref={stickyRef} className="sticky-panel">
            <StickyFingerprint step={activeStep} subStep={subStep} showFieldLabels={docked && activeStep === 0} />
          </aside>

          <section ref={narrativeRef} className="narrative-panel">
            <ScrollyContainer onStepChange={handleStepChange} subStep={subStep} coverLeadIn={COVER_SCROLL_PX} />
          </section>
        </main>

        <SourcesSection />
      </div>
      <Minimap activeStep={activeStep} activeSubStep={subStep} />
    </div>
  );
}
