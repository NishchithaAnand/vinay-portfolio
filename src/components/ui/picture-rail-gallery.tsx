"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ArtworkDetail, DEFAULT_DETAIL_LABELS, type ArtworkDetailLabels } from "@/components/ui/artwork-detail";
import { BRASS, BRASS_SIDE, clamp, FrameArt, shapeOf, type PictureRailItem, type Shape } from "@/components/ui/picture-frame";

export type { PictureCallout, PictureDimensions, PictureFrameStyle, PictureRailItem } from "@/components/ui/picture-frame";

export interface PictureRailGalleryLabels extends ArtworkDetailLabels {
  /** Hint printed on the lit print's wall label. */
  open: string;
}

export interface PictureRailGalleryProps extends React.ComponentProps<"section"> {
  items: PictureRailItem[];
  eyebrow?: string;
  heading?: string;
  /** Shown under the wall while no print is lit. */
  caption?: string;
  /** Call to action rendered under the caption. */
  action?: React.ReactNode;
  /** Lights the prints one by one until the visitor interacts. */
  autoplay?: boolean;
  /** Space between frames, in frame units (default 0.3). Less space means larger frames when the wall is full. */
  gap?: number;
  /** Largest frame scale, in px per frame unit (default 150). Raise it to let a short wall grow. */
  maxUnit?: number;
  /** On a narrow screen (one frame at a time, swiped): frame scale as a share of the width (default 0.2), and its cap (default 128). */
  carouselScale?: number;
  carouselMaxUnit?: number;
  /** Milliseconds each print stays lit during autoplay. */
  interval?: number;
  /** Lit print. Pass a number or null to control it; leave it undefined to let the gallery manage it. */
  active?: number | null;
  onActiveChange?: (index: number | null) => void;
  onOpenChange?: (index: number | null) => void;
  /** Where the detail view's enquire button leads (a mailto:, a form route…). No button without it. */
  enquireHref?: (item: PictureRailItem) => string;
  /** Instead of a link: the detail view closes, then this runs (e.g. to open a contact form). */
  onEnquire?: (item: PictureRailItem) => void;
  labels?: PictureRailGalleryLabels;
}

const DEFAULT_LABELS: PictureRailGalleryLabels = { ...DEFAULT_DETAIL_LABELS, open: "Lift to view" };
const PERSPECTIVE = 1200;
const GAP = 0.3;
const BREATH = 0.1;
const MARGIN = 0.05;
const EDGE = 36;
const RAIL_MIN_UNIT = 90;
const RAIL_MAX_UNIT = 150;
const CAROUSEL_MAX_UNIT = 128;
const LIFT_SCALE = 0.06;
/**
 * Chromium rasterizes a layer under a rotated perspective transform at about 1 CSS px, so a lifted print went soft on
 * retina screens. Each frame is laid out at twice its size (CSS zoom) and scaled back inside the same 3D transform:
 * identical geometry, a sharp photo while it tilts.
 */
const SUPERSAMPLE = 2;
const LIFT_GROW = 1.12;
const LIFT_Z = 26;
const TILT_X = -6;
const TILT_Y = 4;
const SWING_MAX = 14;
const SWING_DAMP = 2.2;
const SWING_G = 3900;
const SWING_COUPLING = 0.08;
/** The hand drives the dragged hook directly, so its wire answers about twice as strongly as a nudged neighbour. */
const DRAG_COUPLING = 0.16;
const NEIGHBOUR_KICK = 12;
const DEG = 180 / Math.PI;

/** When the input happened, not when a busy main thread got to it (falls back to now for epoch-style stamps). */
function stamp(event: { timeStamp: number }) {
  const now = performance.now();
  return event.timeStamp > 0 && event.timeStamp <= now + 1 ? event.timeStamp : now;
}

/** Real walls are never perfect: each frame rests a little crooked (±1.5°). */
function restTilt(i: number) {
  return ((((i * 37 + 11) % 7) - 3) * 0.5);
}

type Layout = { width: number; unit: number; carousel: boolean; railTop: number; railT: number; pivotY: number; tops: number[]; stageH: number };

function layoutFor(shapes: Shape[], drops: number[], width: number, gap = GAP, maxUnit = RAIL_MAX_UNIT, carouselScale = 0.2, carouselMax = CAROUSEL_MAX_UNIT): Layout {
  const n = shapes.length;
  const sumW = shapes.reduce((sum, s) => sum + s.w, 0);
  const maxW = shapes.reduce((m, s) => Math.max(m, s.w), 0);
  const fit = n ? (width - 2 * EDGE) / (sumW + Math.max(0, n - 1) * gap + 2 * BREATH + maxW * (LIFT_GROW - 1)) : maxUnit;
  const carousel = fit < RAIL_MIN_UNIT;
  const unit = carousel ? clamp(width * carouselScale, 92, Math.max(92, carouselMax)) : Math.min(maxUnit, fit);
  const railTop = 6;
  const railT = Math.round(clamp(unit * 0.11, 9, 16));
  const pivotY = railTop + railT + Math.round(unit * 0.045) + 2;
  const maxH = shapes.reduce((m, s) => Math.max(m, s.h), 0) * unit;
  const centre = pivotY + unit * 0.22 + maxH / 2;
  const tops = shapes.map((s, i) => Math.round(Math.max(pivotY + unit * 0.08, centre - (s.h * unit) / 2 + clamp(drops[i] ?? 0, -0.15, 0.6) * unit)));
  const bottom = shapes.reduce((m, s, i) => Math.max(m, (tops[i] ?? 0) + s.h * unit), pivotY);
  return { width, unit, carousel, railTop, railT, pivotY, tops, stageH: Math.round(bottom + 34) };
}

type Sim = {
  x: number[]; vx: number[]; tx: number[];
  sw: number[]; vsw: number[];
  e: number[]; ve: number[]; te: number[];
  ty: number[]; vty: number[]; tty: number[];
  drag: number; grab: number; free: number; last: number; raf: number;
  /** Each hook's position at the last frame and its smoothed real velocity (px/s): what the wire feels. */
  hx: number[]; hv: number[];
};

function emptySim(): Sim {
  return { x: [], vx: [], tx: [], sw: [], vsw: [], e: [], ve: [], te: [], ty: [], vty: [], tty: [], drag: -1, grab: 0, free: 0, last: 0, raf: 0, hx: [], hv: [] };
}

/** Pivot (the rail hook) to the frame's centre, in px. Longer wires swing slower. */
function pendulum(lay: Layout, shape: Shape, i: number) {
  return Math.max(30, (lay.tops[i] ?? 0) - lay.pivotY + (shape.h * lay.unit) / 2);
}

/** Horizontal reach of a hanging frame from its hook, swing and lift included: [left, right]. */
function reach(s: Sim, lay: Layout, shape: Shape, i: number) {
  const e = clamp(s.e[i] ?? 0, 0, 1);
  const half = (shape.w * lay.unit * (1 + (LIFT_GROW - 1) * e)) / 2;
  const top = (lay.tops[i] ?? 0) - lay.pivotY;
  const bottom = top + shape.h * lay.unit;
  const r = (s.sw[i] ?? 0) / DEG;
  const c = Math.cos(r);
  const sn = Math.sin(r);
  return [Math.min(-half * c - top * sn, -half * c - bottom * sn), Math.max(half * c - top * sn, half * c - bottom * sn)] as const;
}

/** Frames can't pass through each other or the rail ends: push apart and share momentum (the step turns the resulting hook motion into swing). */
function resolveContacts(s: Sim, lay: Layout, list: Shape[], margin: number) {
  const n = list.length;
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < n - 1; i++) {
      const a = list[i];
      const b = list[i + 1];
      if (!a || !b) continue;
      const overlap = (s.x[i] ?? 0) + reach(s, lay, a, i)[1] - ((s.x[i + 1] ?? 0) + reach(s, lay, b, i + 1)[0]) + margin;
      if (overlap <= 0) continue;
      if (i === s.drag) s.x[i + 1] = (s.x[i + 1] ?? 0) + overlap;
      else if (i + 1 === s.drag) s.x[i] = (s.x[i] ?? 0) - overlap;
      else { s.x[i] = (s.x[i] ?? 0) - overlap / 2; s.x[i + 1] = (s.x[i + 1] ?? 0) + overlap / 2; }
      const va = s.vx[i] ?? 0;
      const vb = s.vx[i + 1] ?? 0;
      if (va > vb) {
        const shared = (va + vb) / 2;
        if (i !== s.drag) s.vx[i] = shared;
        if (i + 1 !== s.drag) s.vx[i + 1] = shared;
      }
    }
  }
  if (!lay.carousel && n > 0) {
    const lo = 6;
    const hi = lay.width - 6;
    const first = list[0];
    const last = list[n - 1];
    if (first) {
      const l0 = reach(s, lay, first, 0)[0];
      if ((s.x[0] ?? 0) + l0 < lo) { s.x[0] = lo - l0; s.vx[0] = Math.abs(s.vx[0] ?? 0) * 0.3; }
    }
    for (let i = 0; i < n - 1; i++) {
      const a = list[i];
      const b = list[i + 1];
      if (!a || !b) continue;
      const min = (s.x[i] ?? 0) + reach(s, lay, a, i)[1] - reach(s, lay, b, i + 1)[0] + margin;
      if ((s.x[i + 1] ?? 0) < min) s.x[i + 1] = min;
    }
    if (last) {
      const rn = reach(s, lay, last, n - 1)[1];
      if ((s.x[n - 1] ?? 0) + rn > hi) { s.x[n - 1] = hi - rn; s.vx[n - 1] = -Math.abs(s.vx[n - 1] ?? 0) * 0.3; }
    }
    for (let i = n - 2; i >= 0; i--) {
      const a = list[i];
      const b = list[i + 1];
      if (!a || !b) continue;
      const max = (s.x[i + 1] ?? 0) + reach(s, lay, b, i + 1)[0] - reach(s, lay, a, i)[1] - margin;
      if ((s.x[i] ?? 0) > max) s.x[i] = max;
    }
  }
}

export function PictureRailGallery({
  items,
  eyebrow,
  heading,
  caption,
  action,
  autoplay = false,
  interval = 2600,
  gap = GAP,
  maxUnit = RAIL_MAX_UNIT,
  carouselScale = 0.2,
  carouselMaxUnit = CAROUSEL_MAX_UNIT,
  active: activeProp,
  onActiveChange,
  onOpenChange,
  enquireHref,
  onEnquire,
  labels = DEFAULT_LABELS,
  className,
  ...rest
}: PictureRailGalleryProps) {
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const count = items.length;
  const controlled = activeProp !== undefined;
  const viewportRef = React.useRef(null as HTMLDivElement | null);
  const stageRef = React.useRef(null as HTMLDivElement | null);
  const hangs = React.useRef([] as (HTMLDivElement | null)[]);
  const backs = React.useRef([] as (HTMLDivElement | null)[]);
  const swings = React.useRef([] as (HTMLSpanElement | null)[]);
  const slots = React.useRef([] as (HTMLButtonElement | null)[]);
  const tilts = React.useRef([] as (HTMLSpanElement | null)[]);
  const glares = React.useRef([] as (HTMLSpanElement | null)[]);
  const dims = React.useRef([] as (HTMLSpanElement | null)[]);
  const shadows = React.useRef([] as (HTMLSpanElement | null)[]);
  const sim = React.useRef(emptySim());
  const shapes = React.useMemo(() => items.map(shapeOf), [items]);
  const drops = React.useMemo(() => items.map((item) => item.drop ?? 0), [items]);
  const [width, setWidth] = React.useState(0);
  const stageWidth = React.useMemo(() => {
    if (width < 768) return width;
    const sumW = shapes.reduce((sum, shape) => sum + shape.w, 0);
    const maxW = shapes.reduce((max, shape) => Math.max(max, shape.w), 0);
    const fullWidth = 2 * EDGE + (sumW + Math.max(0, count - 1) * gap + 2 * BREATH + maxW * (LIFT_GROW - 1)) * maxUnit;
    return Math.max(width, fullWidth);
  }, [width, shapes, count, gap, maxUnit]);
  const layout = React.useMemo(() => layoutFor(shapes, drops, stageWidth, gap, maxUnit, carouselScale, carouselMaxUnit), [shapes, drops, stageWidth, gap, maxUnit, carouselScale, carouselMaxUnit]);
  const [activeState, setActiveState] = React.useState(null as number | null);
  const requested = React.useRef(undefined as number | null | undefined);
  const raw = controlled ? (activeProp ?? null) : activeState;
  const current = raw !== null && raw >= 0 && raw < count ? raw : null;
  const [focusIndex, setFocusIndex] = React.useState(0);
  const [openIndex, setOpenIndex] = React.useState(null as number | null);
  const [reduced, setReduced] = React.useState(false);
  const [playing, setPlaying] = React.useState(autoplay);
  const [lifted, setLifted] = React.useState(null as number | null);
  const returnFocus = React.useRef(null as number | null);
  const pendingOpen = React.useRef(-1);
  const pointer = React.useRef({ id: -1, index: -1, x: 0, y: 0, moved: false, kind: "", swipe: 0, lastX: 0, lastT: 0, v: 0 });
  const live = React.useRef({ active: null as number | null, layout, shapes, reduced, count, openIndex: null as number | null, carouselIndex: Math.min(1, Math.max(0, count - 1)) });
  live.current = { ...live.current, active: current, layout, shapes, reduced, count, openIndex };
  // Latest host props for stable callbacks: an inline onActiveChange must not restart the autoplay timer on every parent render.
  const host = React.useRef({ controlled, onActiveChange, onOpenChange });
  host.current = { controlled, onActiveChange, onOpenChange };

  const carouselIndex = layout.carousel ? (current ?? live.current.carouselIndex) : null;

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  React.useEffect(() => { setPlaying(autoplay); }, [autoplay]);

  React.useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const measure = (next: number) => setWidth((old) => (Math.abs(old - next) < 0.5 ? old : Math.round(next * 100) / 100));
    measure(viewport.clientWidth);
    const observer = new ResizeObserver((entries) => { const box = entries[0]; if (box) measure(box.contentRect.width); });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const targetsFor = React.useCallback((lay: Layout, front: number | null, centreIndex: number) => {
    const n = shapes.length;
    const feet = shapes.map((s, i) => s.w * lay.unit * (i === front ? LIFT_GROW : 1));
    const gapAfter = (a: number) => lay.unit * (gap + (front !== null && (a === front || a + 1 === front) ? BREATH : 0));
    const xs = feet.map(() => 0);
    if (lay.carousel) {
      const c = clamp(front ?? centreIndex, 0, Math.max(0, n - 1));
      xs[c] = lay.width / 2;
      for (let i = c + 1; i < n; i++) xs[i] = (xs[i - 1] ?? 0) + ((feet[i - 1] ?? 0) + (feet[i] ?? 0)) / 2 + gapAfter(i - 1);
      for (let i = c - 1; i >= 0; i--) xs[i] = (xs[i + 1] ?? 0) - ((feet[i + 1] ?? 0) + (feet[i] ?? 0)) / 2 - gapAfter(i);
      return xs;
    }
    let total = 0;
    for (let i = 0; i < n; i++) total += (feet[i] ?? 0) + (i < n - 1 ? gapAfter(i) : 0);
    let cursor = (lay.width - total) / 2;
    for (let i = 0; i < n; i++) { xs[i] = cursor + (feet[i] ?? 0) / 2; cursor += (feet[i] ?? 0) + gapAfter(i); }
    return xs;
  }, [shapes, gap]);

  const paint = React.useCallback((i: number) => {
    const s = sim.current;
    const { layout: lay, shapes: list, count: n } = live.current;
    const shape = list[i];
    if (!shape) return;
    const w = shape.w * lay.unit;
    const x = s.x[i] ?? 0;
    const theta = s.sw[i] ?? 0;
    const e = clamp(s.e[i] ?? 0, 0, 1.2);
    const lit = clamp(e, 0, 1);
    // Flat against the wall a frame can't turn; it faces the pointer only as far as it has lifted off.
    const ty = (s.ty[i] ?? 0) * lit;
    const left = `translate3d(${(x - w / 2).toFixed(2)}px,0,0)`;
    const hang = hangs.current[i];
    if (hang) hang.style.transform = left;
    const back = backs.current[i];
    if (back) back.style.transform = `${left} rotate(${theta.toFixed(3)}deg)`;
    const swing = swings.current[i];
    if (swing) swing.style.transform = `rotate(${theta.toFixed(3)}deg)`;
    const tilt = tilts.current[i];
    if (tilt) tilt.style.transform = `perspective(${PERSPECTIVE}px) translateZ(${(LIFT_Z * e).toFixed(2)}px) rotateX(${(TILT_X * e).toFixed(3)}deg) rotateY(${ty.toFixed(3)}deg) scale(${((1 + LIFT_SCALE * e) / SUPERSAMPLE).toFixed(4)})`;
    const glare = glares.current[i];
    if (glare) glare.style.transform = `translate3d(${(-ty * 3 - theta * 1.6).toFixed(2)}%,0,0)`;
    const shadow = shadows.current[i];
    if (shadow) {
      shadow.style.transform = `translate3d(${(-ty * 1.4).toFixed(2)}px,${(lay.unit * 0.04 + 10 * e).toFixed(2)}px,0) scale(${(1 + 0.035 * e).toFixed(4)},${(1 + 0.07 * e).toFixed(4)})`;
      shadow.style.opacity = (1 - 0.3 * lit).toFixed(3);
    }
    let others = 0;
    for (let k = 0; k < n; k++) if (k !== i) others = Math.max(others, s.e[k] ?? 0);
    const dim = dims.current[i];
    if (dim) dim.style.opacity = (0.08 * clamp(others, 0, 1) * (1 - lit)).toFixed(4);
  }, []);

  const step = React.useCallback((now: number) => {
    const s = sim.current;
    const { layout: lay, shapes: list, count: n } = live.current;
    // Keep real time when frames come slowly (a busy screen recorder, a slow phone): up to 100 ms a frame, in sub-steps of at most 11.5 ms.
    const dt = s.last ? Math.min(0.1, (now - s.last) / 1000) : 1 / 60;
    s.last = now;
    const sub = Math.max(3, Math.ceil(dt / 0.0115));
    const h = dt / sub;
    const margin = MARGIN * lay.unit;
    const restoring = now > s.free;
    for (let k = 0; k < sub; k++) {
      for (let i = 0; i < n; i++) {
        const shape = list[i];
        if (!shape) continue;
        const len = pendulum(lay, shape, i);
        if (i !== s.drag) {
          const before = s.vx[i] ?? 0;
          const stiff = restoring ? 130 : 0;
          const damp = restoring ? 2 * Math.sqrt(130) * 0.86 : 3.2;
          const ax = -stiff * ((s.x[i] ?? 0) - (s.tx[i] ?? 0)) - damp * before;
          s.vx[i] = before + ax * h;
          s.x[i] = (s.x[i] ?? 0) + (s.vx[i] ?? 0) * h;
        }
        const ae = -150 * ((s.e[i] ?? 0) - (s.te[i] ?? 0)) - 2 * Math.sqrt(150) * 0.78 * (s.ve[i] ?? 0);
        s.ve[i] = (s.ve[i] ?? 0) + ae * h;
        s.e[i] = (s.e[i] ?? 0) + (s.ve[i] ?? 0) * h;
        const at = -110 * ((s.ty[i] ?? 0) - (s.tty[i] ?? 0)) - 2 * Math.sqrt(110) * 0.72 * (s.vty[i] ?? 0);
        s.vty[i] = (s.vty[i] ?? 0) + at * h;
        s.ty[i] = (s.ty[i] ?? 0) + (s.vty[i] ?? 0) * h;
        const rest = restTilt(i) * (1 - clamp(s.e[i] ?? 0, 0, 1));
        const as = -(SWING_G / len) * ((s.sw[i] ?? 0) - rest) - SWING_DAMP * (s.vsw[i] ?? 0);
        s.vsw[i] = (s.vsw[i] ?? 0) + as * h;
        s.sw[i] = clamp((s.sw[i] ?? 0) + (s.vsw[i] ?? 0) * h, -SWING_MAX, SWING_MAX);
      }
      resolveContacts(s, lay, list, margin);
    }
    // Every hook's real motion this frame (the hand, a shove from a neighbour, a rail-end stop, the spring home) swings its wire when it speeds up, slows or stops.
    const follow = 1 - Math.exp(-dt / 0.035);
    for (let i = 0; i < n; i++) {
      const shape = list[i];
      const x = s.x[i] ?? 0;
      const was = s.hv[i] ?? 0;
      const hv = was + ((x - (s.hx[i] ?? x)) / dt - was) * follow;
      s.hx[i] = x;
      s.hv[i] = hv;
      if (shape) s.vsw[i] = (s.vsw[i] ?? 0) + clamp((hv - was) * (DEG / pendulum(lay, shape, i)) * (i === s.drag ? DRAG_COUPLING : SWING_COUPLING), -40, 40);
    }
    if (s.drag >= 0) s.vx[s.drag] = s.hv[s.drag] ?? 0;
    let busy = s.drag >= 0 || now < s.free;
    for (let i = 0; i < n; i++) {
      paint(i);
      const rest = restTilt(i) * (1 - clamp(s.e[i] ?? 0, 0, 1));
      if (Math.abs(s.vx[i] ?? 0) > 0.4 || (restoring && Math.abs((s.x[i] ?? 0) - (s.tx[i] ?? 0)) > 0.25) || Math.abs((s.e[i] ?? 0) - (s.te[i] ?? 0)) > 0.002 || Math.abs(s.ve[i] ?? 0) > 0.01 || Math.abs((s.ty[i] ?? 0) - (s.tty[i] ?? 0)) > 0.02 || Math.abs(s.vty[i] ?? 0) > 0.05 || Math.abs((s.sw[i] ?? 0) - rest) > 0.02 || Math.abs(s.vsw[i] ?? 0) > 0.05) busy = true;
    }
    if (busy) s.raf = requestAnimationFrame(step);
    else {
      s.raf = 0;
      s.last = 0;
      for (let i = 0; i < n; i++) {
        if (restoring) s.x[i] = s.tx[i] ?? 0;
        s.hx[i] = s.x[i] ?? 0; s.hv[i] = 0;
        s.vx[i] = 0; s.e[i] = s.te[i] ?? 0; s.ve[i] = 0; s.ty[i] = s.tty[i] ?? 0; s.vty[i] = 0;
        s.sw[i] = restTilt(i) * (1 - clamp(s.e[i] ?? 0, 0, 1)); s.vsw[i] = 0;
        paint(i);
      }
    }
  }, [paint]);

  const kick = React.useCallback(() => {
    const s = sim.current;
    if (live.current.reduced) {
      for (let i = 0; i < live.current.count; i++) {
        s.x[i] = s.tx[i] ?? 0; s.vx[i] = 0; s.hx[i] = s.x[i] ?? 0; s.hv[i] = 0;
        s.e[i] = s.te[i] ?? 0; s.ve[i] = 0;
        s.ty[i] = s.tty[i] ?? 0; s.vty[i] = 0;
        s.sw[i] = restTilt(i) * (1 - clamp(s.e[i] ?? 0, 0, 1)); s.vsw[i] = 0;
        paint(i);
      }
      return;
    }
    if (!s.raf) { s.last = 0; s.raf = requestAnimationFrame(step); }
  }, [paint, step]);

  const impulse = React.useCallback((i: number, amount: number) => {
    const s = sim.current;
    if (live.current.reduced || i < 0 || i >= live.current.count) return;
    s.vsw[i] = (s.vsw[i] ?? 0) + amount;
    kick();
  }, [kick]);

  React.useLayoutEffect(() => {
    if (!layout.width) return;
    const s = sim.current;
    const xs = targetsFor(layout, current, live.current.carouselIndex);
    const fresh = s.x.length !== count;
    for (let i = 0; i < count; i++) {
      s.tx[i] = (xs[i] ?? 0) + (layout.carousel ? pointer.current.swipe : 0);
      s.te[i] = i === current ? 1 : 0;
      if (i !== current) s.tty[i] = 0;
      if (fresh || reduced) {
        s.x[i] = s.tx[i] ?? 0; s.vx[i] = 0; s.hx[i] = s.x[i] ?? 0; s.hv[i] = 0;
        s.e[i] = s.te[i] ?? 0; s.ve[i] = 0;
        s.ty[i] = s.tty[i] ?? 0; s.vty[i] = 0;
        s.sw[i] = restTilt(i) * (1 - (s.e[i] ?? 0)); s.vsw[i] = 0;
      }
    }
    if (fresh) {
      for (const list of [s.x, s.vx, s.tx, s.sw, s.vsw, s.e, s.ve, s.te, s.ty, s.vty, s.tty, s.hx, s.hv]) list.length = count;
    }
    for (let i = 0; i < count; i++) paint(i);
    kick();
  }, [layout, current, count, reduced, targetsFor, paint, kick]);

  const previous = React.useRef(null as number | null);
  React.useEffect(() => {
    const old = previous.current;
    previous.current = current;
    requested.current = undefined;
    if (old === current) return;
    if (current !== null) {
      live.current.carouselIndex = current;
      impulse(current - 1, NEIGHBOUR_KICK);
      impulse(current + 1, -NEIGHBOUR_KICK);
    }
    if (old !== null) { impulse(old - 1, -NEIGHBOUR_KICK * 0.5); impulse(old + 1, NEIGHBOUR_KICK * 0.5); }
  }, [current, impulse]);

  // First scene: a light brush along the rail. A re-measure (resize) must not cancel the remaining impulses, so the timers live in a ref and stop only on unmount.
  const brushed = React.useRef({ done: false, timers: [] as number[] });
  React.useEffect(() => {
    const b = brushed.current;
    if (!layout.width || b.done || reduced) return;
    b.done = true;
    for (let i = 0; i < count; i++) b.timers.push(window.setTimeout(() => impulse(i, 18 - i * 1.2), 140 + i * 60));
  }, [layout.width, reduced, count, impulse]);
  React.useEffect(() => () => {
    const b = brushed.current;
    b.timers.forEach((t) => window.clearTimeout(t));
    b.timers = [];
    b.done = false;
  }, []);

  React.useEffect(() => () => { cancelAnimationFrame(sim.current.raf); sim.current.raf = 0; }, []);

  React.useLayoutEffect(() => {
    if (openIndex !== null || lifted !== null || returnFocus.current === null) return;
    const index = returnFocus.current;
    returnFocus.current = null;
    slots.current[index]?.focus({ preventScroll: true });
  }, [openIndex, lifted]);

  const choose = React.useCallback((index: number | null) => {
    if (index === live.current.active || index === requested.current) return;
    requested.current = index;
    if (!host.current.controlled) setActiveState(index);
    host.current.onActiveChange?.(index);
  }, []);

  const stop = React.useCallback(() => setPlaying(false), []);

  // Autoplay keeps a fixed beat (first print at 1.1 s, then every interval) so a busy main thread can't stretch the cycle.
  const beat = React.useRef(0);
  React.useEffect(() => {
    if (!playing || reduced || openIndex !== null || count === 0 || !layout.width) { beat.current = 0; return; }
    const start = performance.now();
    if (!beat.current || beat.current < start - interval) beat.current = start + (current === null ? 1100 : interval);
    let timer = window.setTimeout(function advance() {
      const now = live.current.active;
      beat.current += interval;
      choose(now === null ? (live.current.layout.carousel ? live.current.carouselIndex : 0) : (now + 1) % live.current.count);
      timer = window.setTimeout(advance, Math.max(0, beat.current - performance.now()));
    }, Math.max(0, beat.current - start));
    return () => window.clearTimeout(timer);
  }, [playing, reduced, openIndex, count, interval, layout.width, choose, current]);

  const open = React.useCallback((index: number) => {
    stop();
    choose(index);
    setOpenIndex(index);
    host.current.onOpenChange?.(index);
  }, [choose, stop]);

  const sourceRect = React.useCallback(() => (openIndex === null ? null : tilts.current[openIndex]?.getBoundingClientRect() ?? null), [openIndex]);
  const onLift = React.useCallback((lift: boolean) => setLifted(lift ? openIndex : null), [openIndex]);
  const onDetailClose = React.useCallback(() => {
    const index = openIndex;
    if (index === null) return;
    returnFocus.current = index;
    setOpenIndex(null);
    host.current.onOpenChange?.(null);
    impulse(index, index % 2 ? 22 : -22);
  }, [openIndex, impulse]);

  function nearest(clientX: number, clientY: number) {
    const stage = stageRef.current;
    if (!stage) return null;
    const box = stage.getBoundingClientRect();
    const x = clientX - box.left;
    const y = clientY - box.top;
    const { layout: lay, shapes: list, count: n } = live.current;
    const s = sim.current;
    let best = null as number | null;
    let distance = Infinity;
    for (let i = 0; i < n; i++) {
      const shape = list[i];
      if (!shape) continue;
      const [l, r] = reach(s, lay, shape, i);
      const cx = s.x[i] ?? 0;
      const bottom = (lay.tops[i] ?? 0) + shape.h * lay.unit + 30;
      if (x < cx + l - 4 || x > cx + r + 4 || y < lay.railTop - 4 || y > bottom) continue;
      const d = Math.abs(x - cx);
      if (d < distance) { best = i; distance = d; }
    }
    return best;
  }

  function aim(index: number, clientX: number) {
    const stage = stageRef.current;
    const shape = live.current.shapes[index];
    if (!stage || !shape) return;
    const s = sim.current;
    const local = clientX - stage.getBoundingClientRect().left;
    const half = (shape.w * live.current.layout.unit) / 2;
    for (let i = 0; i < live.current.count; i++) s.tty[i] = i === index ? clamp((local - (s.x[index] ?? 0)) / half, -1, 1) * TILT_Y : 0;
    kick();
  }

  const onPointerMove = (event: React.PointerEvent) => {
    const p = pointer.current;
    const s = sim.current;
    const stage = stageRef.current;
    const lay = live.current.layout;
    if (p.id === event.pointerId && stage) {
      const dx = event.clientX - p.x;
      const now = stamp(event);
      if (!p.moved && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(event.clientY - p.y)) {
        p.moved = true;
        stop();
        if (stage.isConnected) stage.setPointerCapture(event.pointerId);
        if (!lay.carousel && p.index >= 0) {
          s.drag = p.index;
          s.grab = event.clientX - stage.getBoundingClientRect().left - (s.x[p.index] ?? 0);
        }
      }
      if (p.moved) {
        const v = (event.clientX - p.lastX) / Math.max(1, now - p.lastT);
        p.v = p.v * 0.6 + v * 0.4;
        p.lastX = event.clientX;
        p.lastT = now;
        if (s.drag >= 0) {
          s.x[s.drag] = event.clientX - stage.getBoundingClientRect().left - s.grab;
          s.free = now + 900;
          kick();
        } else if (lay.carousel) {
          p.swipe = dx;
          const xs = targetsFor(lay, live.current.active, live.current.carouselIndex);
          for (let i = 0; i < live.current.count; i++) s.tx[i] = (xs[i] ?? 0) + dx;
          kick();
        }
      }
      return;
    }
    if (event.pointerType !== "mouse" || lay.carousel || live.current.openIndex !== null) return;
    const hit = nearest(event.clientX, event.clientY);
    const now = live.current.active;
    if (now !== null && hit !== now && stage) {
      const shape = live.current.shapes[now];
      const box = stage.getBoundingClientRect();
      const local = event.clientX - box.left;
      const keep = shape ? Math.abs(local - (s.x[now] ?? 0)) < (shape.w * lay.unit * LIFT_GROW) / 2 + 10 : false;
      if (keep && event.clientY - box.top < lay.stageH) { aim(now, event.clientX); return; }
    }
    if (hit !== null) { stop(); choose(hit); aim(hit, event.clientX); }
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0) return;
    const hit = nearest(event.clientX, event.clientY);
    const now = stamp(event);
    pendingOpen.current = -1;
    pointer.current = { id: event.pointerId, index: hit ?? -1, x: event.clientX, y: event.clientY, moved: false, kind: event.pointerType, swipe: 0, lastX: event.clientX, lastT: now, v: 0 };
  };

  const finishPointer = (event: React.PointerEvent, cancelled: boolean) => {
    const p = pointer.current;
    if (p.id !== event.pointerId) return;
    const s = sim.current;
    const stage = stageRef.current;
    if (stage?.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    pointer.current = { ...p, id: -1 };
    if (s.drag >= 0) {
      // Let go mid-motion and the print slides on; stop first and it stays where the hand left it.
      const idle = stamp(event) - p.lastT;
      s.vx[s.drag] = idle < 140 ? p.v * 1000 * (1 - idle / 140) : 0;
      s.drag = -1;
      s.free = performance.now() + 700;
      kick();
      return;
    }
    const lay = live.current.layout;
    if (p.moved && lay.carousel) {
      const dx = event.clientX - p.x;
      const from = live.current.active ?? live.current.carouselIndex;
      const step = Math.abs(dx) > 40 || Math.abs(p.v) > 0.45 ? (dx < 0 ? 1 : -1) : 0;
      pointer.current.swipe = 0;
      const next = clamp(from + step, 0, live.current.count - 1);
      live.current.carouselIndex = next;
      if (next === live.current.active || controlled) {
        const xs = targetsFor(lay, controlled ? live.current.active : next, next);
        for (let i = 0; i < live.current.count; i++) s.tx[i] = xs[i] ?? 0;
        kick();
      }
      choose(next);
      return;
    }
    if (cancelled || p.moved || p.index < 0) return;
    stop();
    if ((p.kind !== "mouse" || lay.carousel) && live.current.active !== p.index) choose(p.index);
    else pendingOpen.current = p.index;
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    stop();
    const from = current ?? focusIndex;
    const next = event.key === "Home" ? 0 : event.key === "End" ? count - 1 : clamp(from + (event.key === "ArrowRight" ? 1 : -1), 0, count - 1);
    setFocusIndex(next);
    choose(next);
    slots.current[next]?.focus({ preventScroll: true });
  };

  const currentItem = current === null ? null : items[current];
  const byline = currentItem ? [[currentItem.artist, currentItem.year].filter(Boolean).join(", "), currentItem.tag].filter(Boolean).join(" · ") : "";
  const U = layout.unit;
  const blur = Math.max(3, U * 0.05);

  return (
    <section
      {...rest}
      data-slot="picture-rail-gallery"
      data-mode={layout.carousel ? "carousel" : "rail"}
      data-active={current ?? ""}
      aria-roledescription="picture rail gallery"
      className={`relative isolate w-full overflow-hidden bg-background text-foreground ${className ?? ""}`}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={{ background: "radial-gradient(72% 58% at 50% 44%, color-mix(in oklab, var(--color-foreground) 4%, transparent), transparent 78%)" }} />
      {(eyebrow || heading) && (
        <header className="relative z-10 flex flex-col items-center gap-2 px-6 pt-7 text-center">
          {eyebrow && <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">{eyebrow}</p>}
          {heading && <h2 className="text-balance text-2xl font-medium tracking-tight sm:text-3xl">{heading}</h2>}
        </header>
      )}

      <div
        className="relative mt-5 w-full"
        style={{ height: layout.stageH }}
      >
        <div ref={viewportRef} className="h-full w-full overflow-x-auto overscroll-x-contain" style={{ scrollbarWidth: "none" }}>
          <div
            ref={stageRef}
            data-stage
            role="group"
            aria-label={heading ?? "Picture rail"}
            className="relative touch-pan-y select-none md:touch-auto"
            style={{ width: layout.width, height: layout.stageH, overflowX: "clip" }}
            onPointerMove={onPointerMove}
            onPointerDown={onPointerDown}
            onPointerUp={(event) => finishPointer(event, false)}
            onPointerCancel={(event) => finishPointer(event, true)}
            onPointerLeave={(event) => {
              if (event.pointerType !== "mouse" || pointer.current.id >= 0 || layout.carousel) return;
              for (let i = 0; i < count; i++) sim.current.tty[i] = 0;
              if (!document.activeElement?.matches("[data-frame]:focus-visible")) choose(null);
              kick();
            }}
            onKeyDown={onKeyDown}
          >
        <div aria-hidden="true" data-rail className="pointer-events-none absolute inset-x-0 z-[1]" style={{ top: layout.railTop, height: layout.railT }}>
          <div className="absolute inset-x-0 top-full h-3 bg-black opacity-[0.07] blur-[5px] dark:opacity-40" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, color-mix(in oklab, var(--color-card) 70%, white) 0%, var(--color-card) 16%, color-mix(in oklab, var(--color-card) 90%, black) 30%, color-mix(in oklab, var(--color-card) 96%, white) 46%, var(--color-card) 62%, color-mix(in oklab, var(--color-card) 84%, black) 86%, color-mix(in oklab, var(--color-card) 72%, black) 100%)", boxShadow: "0 1px 0 color-mix(in oklab, var(--color-foreground) 14%, transparent), 0 -1px 0 color-mix(in oklab, var(--color-foreground) 8%, transparent)" }} />
          <div className="absolute inset-x-0 top-[30%] h-px bg-black opacity-10 dark:opacity-40" />
          <div className="absolute inset-x-0 top-0 h-px bg-white opacity-80 dark:opacity-15" />
        </div>

        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[2]">
          {items.map((item, i) => {
            const shape = shapes[i];
            if (!shape) return null;
            const w = shape.w * U;
            const h = shape.h * U;
            const top = layout.tops[i] ?? 0;
            return (
              <div key={item.id} ref={(node) => { backs.current[i] = node; }} className="absolute left-0 top-0" style={{ width: w, height: 0, transformOrigin: `${w / 2}px ${layout.pivotY + 1}px`, visibility: lifted === i ? "hidden" : undefined }}>
                <span className="absolute opacity-[0.22] dark:opacity-70" style={{ left: 0, top, width: w, height: h, filter: `blur(${blur.toFixed(1)}px)` }}>
                  <span ref={(node) => { shadows.current[i] = node; }} className="absolute inset-0 rounded-[2px] bg-black" />
                </span>
              </div>
            );
          })}
        </div>

        {items.map((item, i) => {
          const shape = shapes[i];
          if (!shape) return null;
          const w = shape.w * U;
          const h = shape.h * U;
          const top = layout.tops[i] ?? 0;
          const lit = current === i;
          const ringY = top + h * 0.07;
          return (
            <div key={item.id} ref={(node) => { hangs.current[i] = node; }} data-hang={i} className="pointer-events-none absolute left-0 top-0" style={{ width: w, height: 0, zIndex: lit ? 30 : 10 + i }}>
              <Hook x={w / 2} railTop={layout.railTop} railT={layout.railT} pivotY={layout.pivotY} />
              {item.tag && (
                <span data-label className={`absolute whitespace-nowrap rounded-[3px] border border-border bg-card px-1.5 py-[3px] text-[10px] font-medium leading-none tabular-nums shadow-[0_1px_2px_color-mix(in_oklab,var(--color-foreground)_10%,transparent)] ${lit ? "text-card-foreground" : "text-muted-foreground"}`} style={{ top: top + h + 10, right: 0 }}>
                  {lit && <span aria-hidden="true" className="mr-1 inline-block size-1.5 rounded-full bg-chart-2 align-middle" />}
                  {item.tag}
                </span>
              )}
              <span ref={(node) => { swings.current[i] = node; }} data-swing className="absolute left-0 top-0" style={{ width: w, height: 0, transformOrigin: `${w / 2}px ${layout.pivotY + 1}px`, visibility: lifted === i ? "hidden" : undefined }}>
                <svg aria-hidden="true" className="pointer-events-none absolute left-0 top-0 overflow-visible text-foreground" width={Math.max(1, w)} height={Math.max(1, ringY)}>
                  {[w * 0.2, w * 0.8].map((rx) => (
                    <g key={rx}>
                      <line x1={w / 2 + 0.7} y1={layout.pivotY + 1.8} x2={rx + 0.7} y2={ringY + 0.8} stroke="black" strokeOpacity="0.14" strokeWidth="1.4" />
                      <line x1={w / 2} y1={layout.pivotY + 1} x2={rx} y2={ringY} stroke="currentColor" strokeOpacity="0.6" strokeWidth="1" />
                      <line x1={w / 2 - 0.3} y1={layout.pivotY + 1} x2={rx - 0.3} y2={ringY} stroke="white" strokeOpacity="0.35" strokeWidth="0.4" />
                    </g>
                  ))}
                </svg>
                <button
                  ref={(node) => { slots.current[i] = node; }}
                  type="button"
                  data-frame={i}
                  data-lit={lit || undefined}
                  tabIndex={i === (current ?? focusIndex) ? 0 : -1}
                  aria-label={item.title}
                  aria-describedby={`${uid}-caption`}
                  aria-pressed={lit}
                  className="pointer-events-auto absolute cursor-pointer rounded-[2px] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[6px] focus-visible:outline-ring"
                  style={{ left: 0, top, width: w, height: h }}
                  onFocus={() => { setFocusIndex(i); if (pointer.current.id < 0) { stop(); choose(i); } }}
                  onClick={(event) => { const pending = pendingOpen.current; pendingOpen.current = -1; if (event.detail === 0 || pending === i) open(i); }}
                >
                  <span ref={(node) => { tilts.current[i] = node; }} data-tilt className="absolute block" style={{ left: (-(SUPERSAMPLE - 1) * w) / 2, top: (-(SUPERSAMPLE - 1) * h) / 2, width: w * SUPERSAMPLE, height: h * SUPERSAMPLE, transform: `scale(${1 / SUPERSAMPLE})` }}>
                    <span className="absolute inset-0 block" style={{ zoom: SUPERSAMPLE }}>
                      <FrameArt
                        item={item}
                        shape={shape}
                        unit={U}
                        glareRef={(node) => { glares.current[i] = node; }}
                        dimRef={(node) => { dims.current[i] = node; }}
                      />
                    </span>
                  </span>
                </button>
              </span>
            </div>
          );
        })}
          </div>
        </div>
        {count > 1 && (
          <>
          <button
            type="button"
            aria-label="Previous works"
            className="absolute left-3 top-1/2 z-40 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-border/70 bg-background/85 text-foreground shadow-lg backdrop-blur transition-colors hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring sm:left-5"
            onClick={() => {
              stop();
              if (layout.carousel) choose(clamp((current ?? live.current.carouselIndex) - 1, 0, count - 1));
              else viewportRef.current?.scrollBy({ left: -viewportRef.current.clientWidth * 0.75, behavior: reduced ? "auto" : "smooth" });
            }}
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Next works"
            className="absolute right-3 top-1/2 z-40 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-border/70 bg-background/85 text-foreground shadow-lg backdrop-blur transition-colors hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring sm:right-5"
            onClick={() => {
              stop();
              if (layout.carousel) choose(clamp((current ?? live.current.carouselIndex) + 1, 0, count - 1));
              else viewportRef.current?.scrollBy({ left: viewportRef.current.clientWidth * 0.75, behavior: reduced ? "auto" : "smooth" });
            }}
          >
            <ChevronRight aria-hidden="true" className="size-5" />
          </button>
          </>
        )}
      </div>

      {layout.carousel && count > 1 && (
        <div className="relative z-10 mt-1 flex justify-center gap-1.5" role="group" aria-label={heading ?? "Prints"}>
          {items.map((item, i) => (
            <button key={item.id} type="button" aria-label={item.title} aria-current={carouselIndex === i} onClick={() => { stop(); choose(i); }} className={`h-1.5 rounded-full outline-none transition-[width,background-color] duration-300 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${carouselIndex === i ? "w-6 bg-foreground" : "w-1.5 bg-foreground/25 hover:bg-foreground/45"}`} />
          ))}
        </div>
      )}

      <div className={`relative z-10 flex flex-col items-center px-6 pb-7 text-center ${layout.carousel ? "gap-5 pt-8" : "gap-3 pt-3"}`}>
        <div id={`${uid}-caption`} aria-live="polite" className="min-h-[2.75rem]">
          <p className="text-sm font-medium">{currentItem ? currentItem.title : caption}</p>
          {currentItem && <p className="mt-0.5 text-[13px] text-muted-foreground">{byline}{byline ? " · " : ""}<span className="text-foreground/80">{labels.open}</span></p>}
        </div>
        {action}
      </div>

      {openIndex !== null && items[openIndex] && (
        <ArtworkDetail
          item={items[openIndex]}
          labels={labels}
          source={sourceRect}
          enquireHref={enquireHref}
          onEnquire={onEnquire}
          onLift={onLift}
          onClose={onDetailClose}
        />
      )}
    </section>
  );
}

function Hook({ x, railTop, railT, pivotY }: { x: number; railTop: number; railT: number; pivotY: number }) {
  const plate = clamp(railT * 0.36, 3, 6);
  const height = pivotY - railTop + 6;
  return (
    <span aria-hidden="true" className="absolute" style={{ left: x - plate, top: railTop - 3, width: plate * 2, height }}>
      <span className="absolute inset-x-0 top-0 rounded-full" style={{ height: 4, background: BRASS, boxShadow: "0 1px 1px color-mix(in oklab, black 30%, transparent)" }} />
      <span className="absolute top-[3px] rounded-b-[1px]" style={{ left: plate * 0.5, width: plate, bottom: 5, background: BRASS_SIDE, boxShadow: "1px 1px 1.5px color-mix(in oklab, black 28%, transparent)" }} />
      <svg aria-hidden="true" className="absolute bottom-0 left-0 overflow-visible" width={plate * 2} height={7} style={{ color: "color-mix(in oklab, darkgoldenrod 80%, black)" }}>
        <path d={`M${plate * 0.62},0 Q${plate * 0.62},6.2 ${plate},6.2 Q${plate * 1.38},6.2 ${plate * 1.38},2.4`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

