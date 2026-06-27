// Growth math. The tree is a spiral TOWER: each star adds a platform up a helix
// (~5m apart) and the trunk + crown grow TALLER to make room. Size now comes from
// the tower's height (treeHeight), not a uniform scale.

import { slotHeight } from "./bonsai";

const BASE_SCALE = 0.16; // a tiny, almost-dead sprout at 0 stars
const MAX_SCALE = 2.0;
const GROWTH_K = 0.46;

/** Legacy uniform scale (kept for reference / optional intro pop). No longer
 *  drives platform spacing — the helix layout is in absolute units. */
export function treeScale(stars: number): number {
  const s = Math.max(0, stars);
  return Math.min(MAX_SCALE, BASE_SCALE + GROWTH_K * Math.log2(s + 1));
}

/** Height of the top (newest) active platform — the structural top of the tower. */
function topPlatformY(stars: number): number {
  const active = Math.max(0, Math.floor(stars));
  return active <= 0 ? 2 : slotHeight(active - 1);
}

/** The crown APEX — foliage reaches this high, ABOVE the trunk tip (so the trunk
 *  never pokes out bare). Drives the camera framing. */
export function treeHeight(stars: number): number {
  return topPlatformY(stars) + 4.2;
}

/** Where the TRUNK tip ends — just above the top platform and INSIDE the crown,
 *  so the rounded crown caps it. */
export function trunkHeight(stars: number): number {
  return topPlatformY(stars) + 1.2;
}

/** Trunk base radius — thin & clean, always < the 5.2 helix radius so it never
 *  pokes through a platform. */
export function trunkBaseRadius(stars: number): number {
  const H = trunkHeight(stars);
  return Math.min(1.4, Math.max(0.45, 0.45 + H * 0.02));
}

/**
 * Fraction of the canopy's leaf clusters that are present, so foliage (and the
 * branches it sits on) visibly fills in as stars arrive. 0 stars = sparse young
 * tree; ~12+ stars = full crown.
 */
export function foliageFraction(stars: number): number {
  const s = Math.max(0, stars);
  return Math.min(1, 0.22 + s / 12);
}

/**
 * Vertical reveal 0..1 for the growth shader. 0 stars ≈ a nub; each star reveals
 * more height + branches. Asymptotes toward 1 around ~12 stars.
 */
export function growthProgress(stars: number): number {
  const s = Math.max(0, stars);
  if (s <= 0) return 0.08; // barely a sprout
  return Math.min(1, 1 - Math.pow(0.78, s));
}

/** How many leaves / houses are on the tree — one per star. */
export function leafCount(stars: number): number {
  return Math.max(0, Math.floor(stars));
}
