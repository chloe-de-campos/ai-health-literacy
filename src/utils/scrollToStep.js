// Smooth-scroll a .scroll-step to the top of the viewport.
//
// Step 1 is sticky-held flush with the top while the cover transition plays
// (.scroll-step--held, App.js), so scrollIntoView sees it as already in view
// and does nothing. For that step, scroll to where it sits in flow instead:
// directly after the cover spacer, i.e. the fully docked position.
export default function scrollToStep(el) {
  if (!el) return;
  if (el.classList.contains('scroll-step--held')) {
    const spacer = el.previousElementSibling;
    const top = spacer
      ? spacer.getBoundingClientRect().bottom + window.scrollY
      : el.offsetTop;
    window.scrollTo({ top, behavior: 'smooth' });
    return;
  }
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
