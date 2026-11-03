import type * as React from "react";

/*
 * A picture frame drawn in CSS: moulding, optional bevel-cut mat, glass and a small brass lamp above. Shared by the
 * picture rail, the collection wall and the artwork detail view, so a work looks the same wherever it hangs.
 */

export type PictureFrameStyle = "black" | "oak" | "white";

export interface PictureRailItem {
  id: string;
  /** Accessible name, caption and detail title. */
  title: string;
  artist?: string;
  year?: string;
  /** Artwork shown behind the glass. */
  image: string;
  /** Smaller AVIF of the same image, preferred by browsers that read it; `image` stays the fallback. */
  imageAvif?: string;
  /** Pixel width of `image`, and a smaller copy for grids. With both, browsers load only the size they need. */
  imageWidth?: number;
  imageSmall?: ImageSmall;
  /** A thumbnail (about 420 px wide) for places that show many works small at once. */
  imageThumb?: ImageSmall;
  /** Width ÷ height of the artwork. Defaults to 0.8 (a 4:5 portrait). */
  aspect?: number;
  /** Frame moulding. Defaults to "black". */
  frame?: PictureFrameStyle;
  /** Adds a bevel-cut mat board around the artwork. */
  mat?: boolean;
  /** Extra wire length in frame units (about -0.1 to 0.3). At 0 every frame hangs on one centre line. */
  drop?: number;
  /** Short wall-label text such as a price. */
  tag?: string;
  /** A few lines from the artist about the piece, shown in the detail view under the title. */
  description?: string;
  /** Shown in the detail view; falls back to labels.onRequest. */
  price?: string;
  medium?: string;
  /** Real size of the work (the image, not the frame), drawn as dimension lines in the detail view. */
  dimensions?: PictureDimensions;
  /** Notes drawn with leader lines in the detail view, each pointing at the part of the piece it describes. */
  callouts?: PictureCallout[];
}

export interface PictureDimensions {
  width: number;
  height: number;
  depth?: number;
  /** Defaults to "cm". The other system is shown alongside. */
  unit?: "cm" | "in";
}

export interface PictureCallout {
  label: string;
  /** What the leader line points at. */
  on: "surface" | "frame" | "mat" | "corner";
}

const FRAME_BASE = {
  black: "color-mix(in oklab, black 82%, white)",
  oak: "color-mix(in oklab, burlywood 62%, peru)",
  white: "color-mix(in oklab, white 96%, wheat)",
} as const;
const FRAME_RELIEF = {
  black: [-0.45, 0.22, 0.06, -0.14, -0.5, 1],
  oak: [-0.36, 0.18, 0.05, -0.12, -0.42, 1],
  white: [-0.15, 0.05, 0.02, -0.05, -0.2, 0.55],
} as const;
export const BRASS = "linear-gradient(to bottom, color-mix(in oklab, gold 35%, white) 0%, color-mix(in oklab, goldenrod 80%, white) 32%, color-mix(in oklab, darkgoldenrod 85%, black) 72%, color-mix(in oklab, darkgoldenrod 55%, black) 100%)";
const BRASS_DIM = "linear-gradient(to bottom, color-mix(in oklab, goldenrod 50%, white) 0%, color-mix(in oklab, darkgoldenrod 78%, black) 38%, color-mix(in oklab, darkgoldenrod 48%, black) 100%)";
export const BRASS_SIDE = "linear-gradient(to right, color-mix(in oklab, goldenrod 70%, white), color-mix(in oklab, darkgoldenrod 80%, black) 70%, color-mix(in oklab, darkgoldenrod 50%, black))";
const PAPER = "color-mix(in oklab, white 95%, wheat)";

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function mix(color: string, amount: number) {
  if (amount === 0) return color;
  const keep = Math.round((1 - Math.min(1, Math.abs(amount))) * 1000) / 10;
  return `color-mix(in oklab, ${color} ${keep}%, ${amount > 0 ? "white" : "black"})`;
}

function tone(amount: number) {
  const c = `color-mix(in oklab, ${amount > 0 ? "white" : "black"} ${Math.round(Math.abs(amount) * 100)}%, transparent)`;
  return `linear-gradient(${c}, ${c})`;
}

export type Shape = { frame: PictureFrameStyle; mold: number; mat: number; matB: number; w: number; h: number };

export function shapeOf(item: PictureRailItem): Shape {
  const aspect = clamp(item.aspect ?? 0.8, 0.4, 2.5);
  const frame = item.frame ?? "black";
  const mold = frame === "oak" ? 0.068 : frame === "white" ? 0.058 : 0.046;
  const mat = item.mat ? 0.11 : 0;
  const matB = item.mat ? 0.022 : 0;
  const iw = Math.sqrt(aspect);
  return { frame, mold, mat, matB, w: iw + 2 * (mold + mat), h: 1 / iw + 2 * (mold + mat) + matB };
}

function Moulding({ frame, m }: { frame: PictureFrameStyle; m: number }) {
  const base = FRAME_BASE[frame];
  const [outer, crest, shoulder, cove, lip, light] = FRAME_RELIEF[frame];
  const sides = [
    { key: "t", style: { left: 0, right: 0, top: 0, height: m, clipPath: `polygon(0 0, 100% 0, calc(100% - ${m}px) 100%, ${m}px 100%)` }, dir: "to bottom", along: "178.6deg", light: 0.16 },
    { key: "l", style: { left: 0, top: 0, bottom: 0, width: m, clipPath: `polygon(0 0, 100% ${m}px, 100% calc(100% - ${m}px), 0 100%)` }, dir: "to right", along: "91.2deg", light: 0.04 },
    { key: "r", style: { right: 0, top: 0, bottom: 0, width: m, clipPath: `polygon(0 ${m}px, 100% 0, 100% 100%, 0 calc(100% - ${m}px))` }, dir: "to left", along: "88.9deg", light: -0.14 },
    { key: "b", style: { left: 0, right: 0, bottom: 0, height: m, clipPath: `polygon(${m}px 0, calc(100% - ${m}px) 0, 100% 100%, 0 100%)` }, dir: "to top", along: "1.3deg", light: -0.24 },
  ];
  return (
    <>
      {sides.map((side) => {
        const layers = [tone(side.light * light)];
        if (frame === "oak") layers.push(`repeating-linear-gradient(${side.along}, transparent 0 1.7px, color-mix(in oklab, sienna 26%, transparent) 1.7px 2.3px, transparent 2.3px 4.4px, color-mix(in oklab, saddlebrown 16%, transparent) 4.4px 4.9px, transparent 4.9px 7.6px)`);
        layers.push(`linear-gradient(${side.dir}, ${mix(base, outer)} 0%, ${mix(base, crest)} 16%, ${mix(base, shoulder)} 32%, ${base} 56%, ${mix(base, cove)} 82%, ${mix(base, lip)} 100%)`);
        return <span key={side.key} aria-hidden="true" className="absolute" style={{ ...side.style, background: layers.join(", ") }} />;
      })}
    </>
  );
}

function Fixture({ width, hood, arm }: { width: number; hood: number; arm: number }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute left-1/2 -translate-x-1/2" style={{ bottom: "100%", width, height: arm + hood }}>
      {[0.26, 0.74].map((p) => (
        <span key={p} className="absolute bottom-0" style={{ left: `calc(${p * 100}% - 0.75px)`, width: 1.5, height: arm + hood * 0.5, background: "linear-gradient(to right, color-mix(in oklab, goldenrod 60%, white), color-mix(in oklab, darkgoldenrod 70%, black))" }} />
      ))}
      <span className="absolute inset-x-0 top-0 rounded-full" style={{ height: hood, background: BRASS_DIM, boxShadow: "0 1px 2px color-mix(in oklab, black 35%, transparent)" }} />
      <span className="absolute top-0 rounded-full bg-white opacity-30" style={{ left: "8%", right: "8%", height: Math.max(1, hood * 0.22), marginTop: hood * 0.12 }} />
    </span>
  );
}

/** An <img> that offers the AVIF first when there is one. The <picture> takes no box, so layout is the img's alone. */
export interface ImageSmall {
  width: number;
  avif: string;
  jpg: string;
}

/**
 * An <img> that offers the AVIF first when there is one. Given a small copy, the full width and `sizes` (how wide it
 * shows), the browser picks the smaller file wherever that is enough. The <picture> takes no box, so layout is the
 * img's alone.
 */
export function Picture({ avif, small, width, sizes, src, ...img }: React.ComponentProps<"img"> & { avif?: string; small?: ImageSmall; width?: number }) {
  const set = (smallUrl: string, fullUrl?: string) => (small && width && fullUrl ? `${smallUrl} ${small.width}w, ${fullUrl} ${width}w` : undefined);
  const imgSet = set(small?.jpg ?? "", src);
  if (!avif) return <img src={src} srcSet={imgSet} sizes={imgSet ? sizes : undefined} {...img} />;
  const avifSet = set(small?.avif ?? "", avif) ?? avif;
  return (
    <picture className="contents">
      <source srcSet={avifSet} sizes={small ? sizes : undefined} type="image/avif" />
      <img src={src} srcSet={imgSet} sizes={imgSet ? sizes : undefined} {...img} />
    </picture>
  );
}

/** Picture props for a work: its files, plus the small copy and width when the work has them. */
export function imageProps(item: PictureRailItem) {
  return { src: item.image, avif: item.imageAvif, small: item.imageSmall, width: item.imageWidth };
}

/** CSS background for the same choice (AVIF first, then the fallback). */
export function backgroundOf(image: string, avif?: string) {
  return avif ? `image-set(url("${avif}") type("image/avif"), url("${image}") type("image/jpeg"))` : `url("${image}")`;
}

export function FrameArt({ item, shape, unit, bare = false, glareRef, dimRef }: {
  item: PictureRailItem;
  shape: Shape;
  unit: number;
  /** The work exactly as painted: no glass sheen, glare or frame shadow over the image. */
  bare?: boolean;
  glareRef?: (node: HTMLSpanElement | null) => void;
  dimRef?: (node: HTMLSpanElement | null) => void;
}) {
  const m = Math.max(2, shape.mold * unit);
  const mat = shape.mat * unit;
  const matB = shape.matB * unit;
  const fixture = clamp(shape.w * unit * 0.46, 30, 190);
  const hood = clamp(unit * 0.05, 4, 12);
  const arm = clamp(unit * 0.07, 5, 20);
  const bevel = clamp(unit * 0.012, 1, 3);
  return (
    <>
      <Fixture width={fixture} hood={hood} arm={arm} />
      <span className="absolute inset-0 block rounded-[1.5px]" style={{ boxShadow: "0 0 0 0.6px color-mix(in oklab, black 45%, transparent)" }}>
        <Moulding frame={shape.frame} m={m} />
        <span className="absolute block overflow-hidden" style={{ inset: m, background: mat ? `linear-gradient(to bottom, ${PAPER}, color-mix(in oklab, white 89%, wheat))` : "var(--color-muted)" }}>
          <span className="absolute block overflow-hidden bg-muted" style={{ backgroundImage: "radial-gradient(120% 90% at 28% 18%, color-mix(in oklab, var(--color-foreground) 9%, transparent), transparent 70%)", left: mat, right: mat, top: mat, bottom: mat + matB, boxShadow: mat ? `0 0 0 ${bevel}px color-mix(in oklab, white 97%, wheat), 0 0 0 ${bevel + 0.6}px color-mix(in oklab, black 16%, transparent), ${bevel * 0.6}px ${bevel}px ${bevel * 1.6}px ${bevel}px color-mix(in oklab, black 9%, transparent)` : undefined }}>
            {/* On the wall a frame is small, so it takes the grid copy; opened (bare), the full size for the lens. */}
            <Picture
              {...(bare ? { src: item.image, avif: item.imageAvif } : { ...imageProps(item), sizes: `${Math.round(shape.w * unit - 2 * (m + mat))}px` })}
              alt=""
              draggable={false}
              decoding="async"
              ref={(node) => { if (node?.complete && node.naturalWidth > 0) node.dataset.loaded = "true"; }}
              onLoad={(event) => { event.currentTarget.dataset.loaded = "true"; }}
              onError={(event) => { event.currentTarget.dataset.failed = "true"; }}
              className="pointer-events-none absolute inset-0 size-full select-none object-cover opacity-0 transition-opacity duration-500 data-[failed]:hidden data-[loaded]:opacity-100 motion-reduce:transition-none"
            />
          </span>
          {!bare && (<>
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 block" style={{ boxShadow: `inset 0 ${(m * 0.45).toFixed(1)}px ${(m * 0.9).toFixed(1)}px color-mix(in oklab, black 30%, transparent), inset ${(m * 0.2).toFixed(1)}px 0 ${(m * 0.5).toFixed(1)}px color-mix(in oklab, black 12%, transparent), inset 0 0 0 0.5px color-mix(in oklab, black 45%, transparent)` }} />
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 block overflow-hidden">
            <span className="absolute inset-0 block" style={{ background: "linear-gradient(to bottom, color-mix(in oklab, white 9%, transparent), transparent 30%)" }} />
            <span ref={glareRef} data-glare className="absolute inset-y-0 -left-1/2 block w-[200%]" style={{ background: "linear-gradient(112deg, transparent 37%, color-mix(in oklab, white 13%, transparent) 45%, color-mix(in oklab, white 4%, transparent) 51%, transparent 58%)" }} />
          </span>
          <span ref={dimRef} data-dim aria-hidden="true" className="pointer-events-none absolute inset-0 block bg-black" style={{ opacity: 0 }} />
          </>)}
        </span>
      </span>
    </>
  );
}
