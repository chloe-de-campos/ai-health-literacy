// ─── Shared ridge geometry ──────────────────────────────────────────────────
// The math behind the concentric arch/loop ridges used by the fingerprint
// visual — shared by the full-size single view (StickyFingerprint.jsx) and
// the miniature per-cell prints in the crowd grid (FingerprintGrid.jsx) so
// both read as the same print at different scales, not two visual systems.

// Point on a ring of radius r at angle theta (degrees), measured counter-
// clockwise from the positive x-axis in standard math convention, flipped to
// SVG's y-down coordinate space, around an arbitrary center (cx, cy).
export function ridgePoint(cx, cy, r, thetaDeg) {
  const rad = (thetaDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

// Builds a valid `d` path for one ring given its center, radius, the y where
// legs land (legBottom), and which parts of the ring are present: a full
// loop, a left-leg-only partial, a right-leg-only partial, or a floating
// stub that touches neither leg.
export function ridgePathD(cx, cy, legBottom, r, { variant, thetaStart, thetaEnd }) {
  const left = ridgePoint(cx, cy, r, 180);
  const right = ridgePoint(cx, cy, r, 0);
  switch (variant) {
    case 'left': {
      const end = ridgePoint(cx, cy, r, thetaEnd);
      return `M ${left.x} ${legBottom} L ${left.x} ${cy} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`;
    }
    case 'right': {
      const start = ridgePoint(cx, cy, r, thetaStart);
      return `M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${right.x} ${cy} L ${right.x} ${legBottom}`;
    }
    case 'stub': {
      const start = ridgePoint(cx, cy, r, thetaStart);
      const end = ridgePoint(cx, cy, r, thetaEnd);
      return `M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`;
    }
    case 'full':
    default:
      return `M ${left.x} ${legBottom} L ${left.x} ${cy} A ${r} ${r} 0 0 1 ${right.x} ${cy} L ${right.x} ${legBottom}`;
  }
}

// Deterministic, organic mix of ring shapes — full loops, left/right
// partials, and floating stubs, rather than every ring being a uniform
// symmetric bracket. Indexed by position in a field/ring order.
export const RIDGE_VARIANTS = [
  { variant: 'full' },
  { variant: 'full' },
  { variant: 'left', thetaEnd: 100 },
  { variant: 'full' },
  { variant: 'right', thetaStart: 60 },
  { variant: 'full' },
  { variant: 'stub', thetaStart: 130, thetaEnd: 50 },
  { variant: 'left', thetaEnd: 140 },
  { variant: 'full' },
  { variant: 'right', thetaStart: 40 },
  { variant: 'full' },
];

// Small deterministic hash — used to pick a per-cell variant offset so each
// grid cell reads as a plausible unique-but-similar print, without random
// re-renders.
export function hashInt(n) {
  return (((n * 2654435761) ^ ((n >>> 3) * 2246822519)) >>> 0);
}
