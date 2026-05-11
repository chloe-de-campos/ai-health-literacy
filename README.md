# How AI Uses Your Health Data in a Clinical Trial

An interactive scrollytelling explainer that walks through the full lifecycle of a clinical trial participant's health data — from AI-assisted screening through de-identification, pooled datasets, and model inference — and gives readers the specific questions they need to make an informed consent decision.

---

## What it does

The piece follows a single patient record across ten narrative steps. A persistent "health data fingerprint" — a bar chart where each bar is one data field — stays visible throughout and changes state as the story progresses: bars disappear when suppressed, blur when generalized, shift color when noise is added, and a new bar appears from nothing when a model infers something that was never recorded.

Each step ends with a concrete question the reader can bring to a trial coordinator, with a coaching note explaining what a good answer looks like and what a non-answer sounds like.

## Design decisions

**The fingerprint metaphor.** The core visual is a persistent horizontal bar chart, not a diagram that resets at each step. This lets the reader experience de-identification as something happening to *their specific record* rather than as an abstract process. The metaphor earns its name: the combination of fields is uniquely theirs.

**Scroll-driven state, not slide-driven.** The visualization is driven by Scrollama waypoints rather than discrete slide transitions. The sticky panel updates continuously as the reader scrolls, which makes the connection between narrative text and visual change feel immediate rather than choreographed.

**Inference as a new bar.** Step 7 introduces a bar labeled "Inferred: Income Bracket" that wasn't part of the original record. It draws itself onto the fingerprint as the reader reaches that step. The point is that this field didn't exist at the time of consent — it can't be named in a consent form because it didn't exist yet.

**"Ask your coordinator" questions.** Every step surfaces one specific, answerable question and a coaching hint explaining what distinguishes a real answer from a deflection. The goal is to convert understanding into agency — the reader leaves with something they can actually do.

**Mobile-first alternative.** The mobile layout is a purpose-built horizontal swipe experience with a vertical fingerprint strip at the top, not a stacked fallback. The fingerprint bars rotate 90° on mobile to fit the narrower context.

## Stack

- React 19 (Create React App)
- [Scrollama](https://github.com/russellsamora/scrollama) for scroll-driven waypoints
- IBM Plex Sans / IBM Plex Serif (Google Fonts)
- Plain CSS — no CSS-in-JS, no component library
- `d3-interpolate` for color transitions

## Running locally

```bash
npm install
npm start
```

## Sources

All citations are numbered inline and listed in full at the bottom of the piece. The 19 sources include peer-reviewed research, federal regulation text (Common Rule, HIPAA Safe Harbor), and investigative reporting on health data licensing.
