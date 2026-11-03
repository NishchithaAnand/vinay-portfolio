"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { backgroundOf, clamp, FrameArt, Picture, shapeOf, type PictureCallout, type PictureDimensions, type PictureRailItem, type Shape } from "@/components/ui/picture-frame";

export interface ArtworkDetailLabels {
  close: string;
  enquire: string;
  /** Shown in place of a missing price. */
  onRequest: string;
  medium: string;
  size: string;
  depth: string;
  year: string;
  /** Lens hint for a mouse or trackpad, and for touch. */
  lookCloser: string;
  lookCloserTouch: string;
}

export const DEFAULT_DETAIL_LABELS: ArtworkDetailLabels = {
  close: "Close",
  enquire: "Enquire",
  onRequest: "Price on request",
  medium: "Medium",
  size: "Size",
  depth: "Depth",
  year: "Year",
  lookCloser: "Hover the work to look closer · scroll to zoom",
  lookCloserTouch: "Touch and drag the work to look closer",
};

export interface ArtworkDetailProps {
  item: PictureRailItem;
  labels?: ArtworkDetailLabels;
  /** Where the work flies in from and back to (its frame on the wall). Without it the view simply fades. */
  source?: () => DOMRect | null;
  /**
   * What `source` measures. "frame" (the hero wall): the framed work flies as one. "image" (an unframed collection):
   * only the picture flies, landing exactly inside the frame, and the frame fades in around it once it has landed.
   */
  sourceKind?: "frame" | "image";
  /** Where the enquire button leads (a mailto:, a form route…). No button without it. */
  enquireHref?: (item: PictureRailItem) => string;
  /** Instead of a link: the enquire button closes the view (the work flies home), then calls this. Wins over enquireHref. */
  onEnquire?: (item: PictureRailItem) => void;
  /** True while this copy is out, so the caller can hide the original on the wall. */
  onLift?: (lift: boolean) => void;
  onClose: () => void;
}

const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
const FRAME_FADE = 320;

/** The transform that puts the box `to` exactly over the box `from` (scaled about the centre of `to`). */
function offset(from: DOMRect, to: DOMRect) {
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  return `translate(${dx}px, ${dy}px) scale(${from.width / Math.max(1, to.width)})`;
}

/**
 * A work taken off the wall: it flies from its frame to the screen, where it is drawn like a measured drawing
 * (dimension lines for the real size, leader lines to the notes) beside a panel with title, price and the enquire
 * link. A lens follows the pointer over the work to show the brushwork up close. It flies home on close.
 */
export function ArtworkDetail({ item, labels = DEFAULT_DETAIL_LABELS, source, sourceKind = "frame", enquireHref, onEnquire, onLift, onClose }: ArtworkDetailProps) {
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const shape = React.useMemo(() => shapeOf(item), [item]);
  const [reduced] = React.useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [hover] = React.useState(() => window.matchMedia("(hover: hover)").matches);
  const [viewport, setViewport] = React.useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  // Measurements draw in, and the lens wakes, once the work has landed.
  const [drawn, setDrawn] = React.useState(reduced);
  const imageOnly = sourceKind === "image";
  // An unframed picture gets its frame only after it lands, and loses it before it flies back.
  const [framed, setFramed] = React.useState(reduced || !imageOnly);
  const dialogRef = React.useRef(null as HTMLDivElement | null);
  const flightRef = React.useRef(null as HTMLDivElement | null);
  const backdropRef = React.useRef(null as HTMLDivElement | null);
  const panelRef = React.useRef(null as HTMLDivElement | null);
  const closeRef = React.useRef(null as HTMLButtonElement | null);
  const closing = React.useRef(false);
  /** Runs once the view has fully closed (used by the enquire button). */
  const afterClose = React.useRef(null as (() => void) | null);
  const titleId = `${uid}-detail-title`;

  const wide = viewport.w >= 900;
  const callouts = item.callouts ?? [];
  const dims = item.dimensions;
  const dimRoom = dims ? (wide ? 64 : 48) : 0;
  const calloutRoom = wide && callouts.length ? 210 : 0;
  const availW = wide ? viewport.w - 96 - 340 - 64 - calloutRoom - dimRoom : viewport.w - 32 - dimRoom - 8;
  const availH = wide ? viewport.h - 120 - dimRoom : viewport.h * 0.5 - dimRoom;
  const unit = clamp(Math.min(availW / shape.w, availH / (shape.h + 0.14)), 70, 620);
  const w = shape.w * unit;
  const h = shape.h * unit;
  const inset = Math.max(2, shape.mold * unit) + shape.mat * unit;
  const art = { x: inset, y: inset, w: w - 2 * inset, h: h - 2 * inset - shape.matB * unit };
  const byline = [item.artist, item.year].filter(Boolean).join(", ");

  // Where the travelling part lands on screen: the whole frame, or just the picture inside it.
  const landing = React.useCallback((node: HTMLElement) => {
    const box = node.getBoundingClientRect();
    return imageOnly ? new DOMRect(box.left + art.x, box.top + art.y, art.w, art.h) : box;
  }, [imageOnly, art.x, art.y, art.w, art.h]);

  React.useEffect(() => {
    const resize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", resize);
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      window.removeEventListener("resize", resize);
      root.style.overflow = overflow;
    };
  }, []);

  // Fly in from the wall (FLIP: measure where the work will land, start it at the wall, let it travel to rest).
  React.useLayoutEffect(() => {
    const node = flightRef.current;
    const from = source?.() ?? null;
    onLift?.(true);
    closeRef.current?.focus({ preventScroll: true });
    backdropRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduced ? 0 : 420, easing: "ease-out" });
    panelRef.current?.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: reduced ? 0 : 520, delay: reduced ? 0 : 280, easing: EASE_OUT, fill: "backwards" });
    if (!node || reduced) { setDrawn(true); return; }
    if (!from) {
      node.animate([{ opacity: 0, transform: "scale(0.96)" }, { opacity: 1, transform: "none" }], { duration: 480, easing: EASE_OUT }).onfinish = () => { setFramed(true); setDrawn(true); };
      return;
    }
    const flight = node.animate([{ transform: offset(from, landing(node)) }, { transform: "none" }], { duration: 680, easing: EASE_OUT });
    flight.onfinish = () => { setFramed(true); setDrawn(true); };
    // Mount only: the flight starts from wherever the work hangs at this moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = React.useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    const node = flightRef.current;
    const to = source?.() ?? null;
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      onLift?.(false);
      onClose();
      afterClose.current?.();
    };
    if (reduced || !node) { done(); return; }
    setDrawn(false);
    // The frame lifts off first, then the bare picture travels home.
    const unframe = imageOnly ? FRAME_FADE : 0;
    setFramed(!imageOnly);
    backdropRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 460, delay: unframe, easing: "ease-in", fill: "forwards" });
    panelRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: "forwards" });
    const frames: Keyframe[] = to ? [{ transform: "none" }, { transform: offset(to, landing(node)) }] : [{ opacity: 1 }, { opacity: 0 }];
    const flight = node.animate(frames, { duration: to ? 520 : 260, delay: unframe, easing: "cubic-bezier(0.5, 0, 0.2, 1)", fill: "forwards" });
    flight.onfinish = done;
    flight.oncancel = done;
  }, [onClose, onLift, reduced, source, imageOnly, landing]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") { event.preventDefault(); close(); return; }
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };

  const specs = [
    item.medium ? [labels.medium, item.medium] : null,
    dims ? [labels.size, `${measure(dims.width)} × ${measure(dims.height)} ${dims.unit ?? "cm"}`, `${measure(convert(dims.width, dims.unit))} × ${measure(convert(dims.height, dims.unit))} ${other(dims.unit)}`] : null,
    dims?.depth ? [labels.depth, `${measure(dims.depth)} ${dims.unit ?? "cm"}`, `${measure(convert(dims.depth, dims.unit))} ${other(dims.unit)}`] : null,
    item.year ? [labels.year, item.year] : null,
  ].filter((row): row is string[] => row !== null);

  return createPortal(
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} data-slot="artwork-detail" data-lenis-prevent="" className="fixed inset-0 z-[100] overflow-x-hidden overflow-y-auto overscroll-contain text-foreground" onKeyDown={onKeyDown}>
      <div ref={backdropRef} aria-hidden="true" className="fixed inset-0 bg-background" />

      <button ref={closeRef} type="button" onClick={close} aria-label={labels.close} className="fixed right-4 top-4 z-10 inline-flex size-10 items-center justify-center rounded-full border border-border bg-card outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none sm:right-6 sm:top-6">
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 10 10"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
      </button>

      <div
        className={`relative flex min-h-full items-center justify-center ${wide ? "flex-row gap-16 px-12 py-14" : "flex-col gap-8 px-4 pb-10 pt-20"}`}
        onClick={(event) => { if (event.target === event.currentTarget) close(); }}
      >
        <figure className="relative m-0 shrink-0" style={{ width: w, height: h, marginTop: unit * 0.14, marginLeft: dimRoom, marginBottom: dimRoom, marginRight: calloutRoom }}>
          <div ref={flightRef} className="absolute inset-0" style={{ transformOrigin: imageOnly ? `${art.x + art.w / 2}px ${art.y + art.h / 2}px` : "50% 50%" }}>
            <div className="absolute inset-0" style={{ opacity: framed ? 1 : 0, transition: `opacity ${FRAME_FADE}ms ease-out` }}>
              <span aria-hidden="true" className="absolute inset-0 block rounded-[2px] bg-black opacity-25 blur-xl dark:opacity-60" style={{ transform: `translateY(${(unit * 0.07).toFixed(1)}px) scale(0.97)` }} />
              <FrameArt item={item} shape={shape} unit={unit} bare />
            </div>
            {/* The picture that travels on its own; once framed it sits exactly over the framed copy. */}
            {imageOnly && <Picture src={item.image} avif={item.imageAvif} alt="" draggable={false} className="pointer-events-none absolute select-none object-cover" style={{ left: art.x, top: art.y, width: art.w, height: art.h }} />}
          </div>
          {dims && <DimensionLines art={art} w={w} h={h} dims={dims} drawn={drawn} wide={wide} />}
          {calloutRoom > 0 && <Callouts callouts={callouts} art={art} shape={shape} unit={unit} w={w} h={h} drawn={drawn} />}
          <Loupe image={item.image} avif={item.imageAvif} art={art} enabled={drawn} />
        </figure>

        <div ref={panelRef} className={wide ? "w-[340px] shrink-0" : "w-full max-w-md"}>
          <h2 id={titleId} className="text-balance text-3xl font-medium leading-tight tracking-tight" style={{ fontFamily: "var(--font-display, inherit)" }}>{item.title}</h2>
          {byline && <p className="mt-1.5 text-sm text-muted-foreground">{byline}</p>}
          {item.description && <p className="mt-5 text-[15px] leading-relaxed text-pretty text-foreground/80">{item.description}</p>}
          <p className="mt-6 text-xl font-medium tabular-nums">{item.price ?? labels.onRequest}</p>

          {specs.length > 0 && (
            <dl className="mt-6 divide-y divide-border border-y border-border text-sm">
              {specs.map(([term, value, alt]) => (
                <div key={term} className="flex items-baseline justify-between gap-6 py-2.5">
                  <dt className="text-muted-foreground">{term}</dt>
                  <dd className="text-right tabular-nums">{value}{alt && <span className="block text-xs text-muted-foreground">{alt}</span>}</dd>
                </div>
              ))}
            </dl>
          )}

          {/* On a phone there is no room beside the work for leader lines, so the notes are listed here instead. */}
          {calloutRoom === 0 && callouts.length > 0 && (
            <ul className="mt-5 space-y-2 text-sm">
              {callouts.map((callout) => (
                <li key={`${callout.on}-${callout.label}`} className="flex items-center gap-3">
                  <span aria-hidden="true" className="flex items-center"><span className="size-1.5 rounded-full border border-foreground" /><span className="h-px w-4 bg-foreground/50" /></span>
                  {callout.label}
                </li>
              ))}
            </ul>
          )}

          <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="7" cy="7" r="4.6" /><path d="M10.4 10.4L14 14" strokeLinecap="round" /><path d="M7 5v4M5 7h4" strokeLinecap="round" /></svg>
            {hover ? labels.lookCloser : labels.lookCloserTouch}
          </p>

          {onEnquire ? (
            <button type="button" onClick={() => { afterClose.current = () => onEnquire(item); close(); }} className="group mt-8 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/85 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none">
              {labels.enquire}
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" className="transition-transform duration-500 group-hover:translate-x-0.5 motion-reduce:transition-none"><path d="M2 7h10M8 3l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          ) : enquireHref ? (
            <a href={enquireHref(item)} className="group mt-8 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/85 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none">
              {labels.enquire}
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" className="transition-transform duration-500 group-hover:translate-x-0.5 motion-reduce:transition-none"><path d="M2 7h10M8 3l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

type Rect = { x: number; y: number; w: number; h: number };

const ZOOM_DEFAULT = 2.5;
const ZOOM_MIN = 1.5;
const ZOOM_CEILING = 6;

/**
 * A magnifying lens over the work. It follows the mouse (or rides just above a finger, so the finger doesn't hide what
 * it magnifies); the wheel changes the power. The power is capped near the photo's own resolution so it never shows
 * mush: a 640 px photo allows about 2–3×, a full-size scan the whole range.
 */
function Loupe({ image, avif, art, enabled }: { image: string; avif?: string; art: Rect; enabled: boolean }) {
  const zone = React.useRef(null as HTMLDivElement | null);
  const lens = React.useRef(null as HTMLDivElement | null);
  const readout = React.useRef(null as HTMLSpanElement | null);
  const zoom = React.useRef(ZOOM_DEFAULT);
  const maxZoom = React.useRef(ZOOM_DEFAULT);
  const point = React.useRef(null as { x: number; y: number; touch: boolean } | null);
  const [active, setActive] = React.useState(false);
  const activeRef = React.useRef(false);
  // Hidden the moment the view starts to close, whatever the pointer is doing.
  const visible = active && enabled;
  const size = Math.round(clamp(Math.min(art.w, art.h) * 0.42, 120, 220));

  // How far the photo can be enlarged before it runs out of pixels (with a little grace).
  React.useEffect(() => {
    const probe = new Image();
    probe.onload = () => {
      maxZoom.current = clamp((probe.naturalWidth / Math.max(1, art.w)) * 1.6, ZOOM_DEFAULT, ZOOM_CEILING);
      zoom.current = Math.min(zoom.current, maxZoom.current);
    };
    // The AVIF is what the page already loaded (dimensions match the fallback); a browser without AVIF keeps the default power.
    probe.src = avif ?? image;
  }, [image, avif, art.w]);

  const place = React.useCallback(() => {
    const node = lens.current;
    const p = point.current;
    if (!node || !p) return;
    const z = zoom.current;
    const lift = p.touch ? size * 0.7 : 0;
    node.style.transform = `translate3d(${(p.x - size / 2).toFixed(1)}px, ${(p.y - size / 2 - lift).toFixed(1)}px, 0)`;
    const glass = node.firstElementChild as HTMLElement | null;
    if (glass) {
      glass.style.backgroundSize = `${(art.w * z).toFixed(1)}px ${(art.h * z).toFixed(1)}px`;
      glass.style.backgroundPosition = `${(size / 2 - p.x * z).toFixed(1)}px ${(size / 2 - p.y * z).toFixed(1)}px`;
    }
    if (readout.current) readout.current.textContent = `${z.toFixed(1)}×`;
  }, [art.w, art.h, size]);

  const show = (on: boolean) => {
    activeRef.current = on;
    setActive(on);
  };

  const track = (event: React.PointerEvent) => {
    if (!enabled || !zone.current) return;
    const box = zone.current.getBoundingClientRect();
    point.current = {
      x: clamp(event.clientX - box.left, 0, box.width),
      y: clamp(event.clientY - box.top, 0, box.height),
      touch: event.pointerType !== "mouse",
    };
    if (!activeRef.current) show(true);
    place();
  };

  // The wheel sets the power while the lens is up (a non-passive listener, so the page doesn't scroll instead).
  React.useEffect(() => {
    const node = zone.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      if (!activeRef.current) return;
      event.preventDefault();
      zoom.current = clamp(zoom.current * (event.deltaY < 0 ? 1.12 : 1 / 1.12), ZOOM_MIN, maxZoom.current);
      place();
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [place]);

  return (
    <div
      ref={zone}
      aria-hidden="true"
      data-slot="artwork-loupe"
      className={`absolute z-10 ${enabled ? "cursor-none touch-none" : "pointer-events-none"}`}
      style={{ left: art.x, top: art.y, width: art.w, height: art.h }}
      onPointerEnter={track}
      onPointerDown={track}
      onPointerMove={track}
      onPointerLeave={() => show(false)}
      onPointerUp={(event) => { if (event.pointerType !== "mouse") show(false); }}
      onPointerCancel={() => show(false)}
    >
      <div ref={lens} className="pointer-events-none absolute left-0 top-0" style={{ width: size, height: size }}>
        <div
          className="absolute inset-0 rounded-full bg-no-repeat shadow-[0_14px_40px_-6px_rgb(0_0_0/0.55),0_0_0_1px_rgb(0_0_0/0.25),inset_0_0_0_2px_rgb(255_255_255/0.85)] transition-[opacity,scale] duration-200 ease-out motion-reduce:transition-none"
          style={{ backgroundImage: backgroundOf(image, avif), opacity: visible ? 1 : 0, scale: visible ? "1" : "0.85" }}
        />
        <span
          ref={readout}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-1.5 py-0.5 font-mono text-[10px] leading-none text-white tabular-nums transition-opacity duration-200"
          style={{ opacity: visible ? 1 : 0 }}
        />
      </div>
    </div>
  );
}

function measure(value: number) {
  return String(Math.round(value * 10) / 10);
}

function convert(value: number, unit: PictureDimensions["unit"]) {
  return unit === "in" ? value * 2.54 : value / 2.54;
}

function other(unit: PictureDimensions["unit"]) {
  return unit === "in" ? "cm" : "in";
}

/** A line that draws itself from one end once `drawn` turns true. */
function drawStyle(drawn: boolean, delay: number): React.CSSProperties {
  return { strokeDasharray: 1, strokeDashoffset: drawn ? 0 : 1, transition: `stroke-dashoffset ${drawn ? 900 : 200}ms ${EASE_OUT} ${drawn ? delay : 0}ms` };
}

function fadeStyle(drawn: boolean, delay: number): React.CSSProperties {
  return { opacity: drawn ? 1 : 0, transition: `opacity ${drawn ? 500 : 150}ms ease-out ${drawn ? delay : 0}ms` };
}

/** Architect-style dimension lines for the image itself: width under the frame, height to its left, arrows at both ends. */
function DimensionLines({ art, w, h, dims, drawn, wide }: { art: Rect; w: number; h: number; dims: PictureDimensions; drawn: boolean; wide: boolean }) {
  const off = wide ? 34 : 26;
  const y = h + off;
  const x = -off;
  const a = 6;
  const unit = dims.unit ?? "cm";
  const label = "absolute whitespace-nowrap bg-background px-2 font-mono text-[11px] leading-none tabular-nums";
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <svg className="absolute left-0 top-0 overflow-visible text-foreground" width={w} height={h}>
        <g fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <g strokeOpacity="0.3" strokeDasharray="2 3" style={fadeStyle(drawn, 0)}>
            <line x1={art.x} y1={h + 8} x2={art.x} y2={y + 8} />
            <line x1={art.x + art.w} y1={h + 8} x2={art.x + art.w} y2={y + 8} />
            <line x1={-8} y1={art.y} x2={x - 8} y2={art.y} />
            <line x1={-8} y1={art.y + art.h} x2={x - 8} y2={art.y + art.h} />
          </g>
          <path pathLength={1} d={`M${art.x},${y} H${art.x + art.w}`} strokeOpacity="0.75" style={drawStyle(drawn, 120)} />
          <path pathLength={1} d={`M${x},${art.y + art.h} V${art.y}`} strokeOpacity="0.75" style={drawStyle(drawn, 220)} />
          <g strokeOpacity="0.75" style={fadeStyle(drawn, 500)}>
            <path d={`M${art.x + a},${y - a / 2} L${art.x},${y} L${art.x + a},${y + a / 2}`} />
            <path d={`M${art.x + art.w - a},${y - a / 2} L${art.x + art.w},${y} L${art.x + art.w - a},${y + a / 2}`} />
            <path d={`M${x - a / 2},${art.y + a} L${x},${art.y} L${x + a / 2},${art.y + a}`} />
            <path d={`M${x - a / 2},${art.y + art.h - a} L${x},${art.y + art.h} L${x + a / 2},${art.y + art.h - a}`} />
          </g>
        </g>
      </svg>
      <span className={label} style={{ left: art.x + art.w / 2, top: y, transform: "translate(-50%, -50%)", ...fadeStyle(drawn, 600) }}>
        {measure(dims.width)} {unit} <span className="text-muted-foreground">· {measure(convert(dims.width, dims.unit))} {other(dims.unit)}</span>
      </span>
      <span className={label} style={{ left: x, top: art.y + art.h / 2, transform: "translate(-50%, -50%) rotate(-90deg)", ...fadeStyle(drawn, 680) }}>
        {measure(dims.height)} {unit} <span className="text-muted-foreground">· {measure(convert(dims.height, dims.unit))} {other(dims.unit)}</span>
      </span>
    </div>
  );
}

/** Notes beside the work, each joined by a leader line to the part it describes. */
function Callouts({ callouts, art, shape, unit, w, h, drawn }: { callouts: PictureCallout[]; art: Rect; shape: Shape; unit: number; w: number; h: number; drawn: boolean }) {
  const m = Math.max(2, shape.mold * unit);
  const mat = shape.mat * unit;
  const targetOf = (on: PictureCallout["on"]) => {
    if (on === "frame") return { x: w - m / 2, y: h * 0.42 };
    if (on === "mat" && mat > 0) return { x: art.x + art.w + mat / 2, y: art.y + art.h * 0.7 };
    if (on === "corner") return { x: art.x + art.w * 0.9, y: art.y + art.h * 0.92 };
    return { x: art.x + art.w * 0.62, y: art.y + art.h * 0.3 };
  };
  const gap = 34;
  const placed = callouts.map((callout) => ({ callout, target: targetOf(callout.on) })).sort((p, q) => p.target.y - q.target.y);
  // Labels sit level with their targets where they can, never closer than `gap`, never below the frame.
  const ys: number[] = [];
  placed.forEach((p, i) => { ys[i] = Math.max(p.target.y, i ? (ys[i - 1] ?? 0) + gap : 0); });
  const overflow = (ys[ys.length - 1] ?? 0) - h;
  if (overflow > 0) for (let i = 0; i < ys.length; i++) ys[i] = (ys[i] ?? 0) - overflow;
  const bend = w + 18;
  const end = w + 34;
  return (
    <>
      <svg aria-hidden="true" className="pointer-events-none absolute left-0 top-0 overflow-visible text-foreground" width={w} height={h}>
        {placed.map(({ callout, target }, i) => {
          const y = ys[i] ?? target.y;
          const d = `M${target.x},${target.y} H${bend} L${end - 6},${y} H${end}`;
          const delay = 650 + i * 140;
          return (
            <g key={`${callout.on}-${callout.label}`} fill="none" strokeLinecap="round" strokeLinejoin="round">
              {/* A halo keeps the line readable where it crosses the artwork. */}
              <path pathLength={1} d={d} stroke="var(--color-background, white)" strokeOpacity="0.7" strokeWidth="3" style={drawStyle(drawn, delay)} />
              <path pathLength={1} d={d} stroke="currentColor" strokeWidth="1" style={drawStyle(drawn, delay)} />
              <circle cx={target.x} cy={target.y} r="3.5" fill="var(--color-background, white)" stroke="currentColor" strokeWidth="1.2" style={fadeStyle(drawn, delay - 150)} />
            </g>
          );
        })}
      </svg>
      <ul className="pointer-events-none absolute left-0 top-0 m-0 list-none p-0">
        {placed.map(({ callout }, i) => (
          <li key={`${callout.on}-${callout.label}`} className="absolute w-44 text-[13px] leading-snug" style={{ left: end + 8, top: ys[i], transform: "translateY(-50%)", ...fadeStyle(drawn, 900 + i * 140) }}>
            {callout.label}
          </li>
        ))}
      </ul>
    </>
  );
}
