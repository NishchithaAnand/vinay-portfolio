import * as React from "react";
import { ArrowRight } from "lucide-react";
import { Reveal, RevealImage } from "@/components/motion/reveal";
import { imageProps, Picture } from "@/components/ui/picture-frame";
import { hangTogether, type Artwork } from "@/content/artworks";
import { detailLabels, requestEnquiry } from "@/content/enquiry";
import { cn } from "@/lib/utils";

/*
 * The works page laid out like a catalogue, not a grid: each row is a different arrangement, with room around it.
 *   feature       one large work, its story beside it
 *   pair          two works side by side, pushed to one side of the page (three across the width when they hang
 *                 together, see hangTogether)
 *   full          one work shown big (prefers a landscape piece, pulled forward from just ahead)
 *   single        one work, offset to one side
 * The sequence repeats, so any number of works (and any filter) gets the same rhythm.
 */
type Side = "left" | "right";
type Block =
  | { kind: "feature"; work: Artwork; side: Side }
  | { kind: "pair"; works: Artwork[]; side: Side }
  | { kind: "full"; work: Artwork }
  | { kind: "single"; work: Artwork; side: Side };

const RHYTHM = ["feature-left", "pair-right", "full", "pair-left", "feature-right", "single-left", "pair-right", "single-right", "full", "pair-left"] as const;
const isLandscape = (work: Artwork) => (work.aspect ?? 1) >= 1.1;

function blocksOf(works: Artwork[]): Block[] {
  const queue = [...works];
  const blocks: Block[] = [];
  for (let step = 0; queue.length; step++) {
    // Works that hang together take the next row as a group (two or three of them, whichever are showing).
    const group = hangTogether.find((ids) => ids.includes(queue[0]!.id));
    const members = group ? queue.filter((work) => group.includes(work.id)) : [];
    if (members.length > 1) {
      for (const work of members) queue.splice(queue.indexOf(work), 1);
      blocks.push({ kind: "pair", works: members, side: step % 2 ? "left" : "right" });
      continue;
    }
    const slot = RHYTHM[step % RHYTHM.length]!;
    if (slot === "full") {
      // A wide painting reads best here; take one from the next few if there is one.
      const ahead = queue.slice(0, 3).findIndex(isLandscape);
      const [work] = queue.splice(ahead > 0 ? ahead : 0, 1);
      blocks.push({ kind: "full", work: work! });
      continue;
    }
    const [kind, side] = slot.split("-") as ["feature" | "pair" | "single", Side];
    if (kind === "pair") {
      if (queue.length >= 2) blocks.push({ kind: "pair", works: [queue.shift()!, queue.shift()!], side });
      else blocks.push({ kind: "single", work: queue.shift()!, side });
      continue;
    }
    blocks.push({ kind, work: queue.shift()!, side });
  }
  return blocks;
}

const metaOf = (work: Artwork) => [work.year, work.medium, work.dimensions ? `${work.dimensions.width} × ${work.dimensions.height} cm` : null].filter(Boolean).join(" · ");
const priceOf = (work: Artwork) => (work.status === "sold" ? "Sold" : (work.price ?? detailLabels.onRequest));

/** A work's image as a button that opens it. The image keeps its own proportions. */
function Plate({ work, sizes, hidden, onOpen, className, delay = 0, fit, imageRef }: { work: Artwork; sizes: string; hidden: boolean; onOpen: (work: Artwork, image: HTMLElement) => void; className?: string; delay?: number; fit?: boolean; imageRef?: React.RefObject<HTMLImageElement | null> }) {
  const own = React.useRef<HTMLImageElement>(null);
  const image = imageRef ?? own;
  const aspect = work.aspect ?? 0.8;
  return (
    <button type="button" onClick={() => image.current && onOpen(work, image.current)} aria-label={`${work.title}, view details`} className={cn("group block cursor-zoom-in outline-none", className)}>
      <RevealImage delay={delay}>
        <Picture
          ref={image}
          {...imageProps(work)}
          sizes={sizes}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className="block w-full select-none object-cover shadow-[0_24px_48px_-28px_rgb(0_0_0/0.5)] transition-[translate,box-shadow] duration-700 ease-(--ease-lift) group-hover:-translate-y-1.5 group-hover:shadow-[0_34px_60px_-28px_rgb(0_0_0/0.55)] group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-4 group-focus-visible:ring-offset-background motion-reduce:transition-none"
          // A "full" work is as wide as fits without growing taller than most of the screen.
          style={{ aspectRatio: String(aspect), visibility: hidden ? "hidden" : undefined, ...(fit ? { width: `min(100%, calc(82svh * ${aspect.toFixed(4)}))`, marginInline: "auto" } : null) }}
        />
      </RevealImage>
    </button>
  );
}

/** The small caption under a work: title and medium on the left, price on the right. */
function Caption({ work, delay = 0, className }: { work: Artwork; delay?: number; className?: string }) {
  return (
    <Reveal delay={delay + 0.3} y={10} className={cn("mt-4 flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{work.title}</p>
        {metaOf(work) && <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{metaOf(work)}</p>}
      </div>
      <p className="shrink-0 text-[13px] tabular-nums text-muted-foreground">{priceOf(work)}</p>
    </Reveal>
  );
}

/** Where the image and the text sit on the 12-column grid, by the work's shape and the side the image takes. */
const FEATURE_COLUMNS = {
  wide: { left: ["lg:col-start-1 lg:col-span-7", "lg:col-start-9 lg:col-span-4"], right: ["lg:col-start-6 lg:col-span-7", "lg:col-start-1 lg:col-span-4"] },
  tall: { left: ["lg:col-start-1 lg:col-span-5", "lg:col-start-7 lg:col-span-5"], right: ["lg:col-start-8 lg:col-span-5", "lg:col-start-2 lg:col-span-5"] },
} as const;

function Feature({ work, side, hidden, onOpen }: { work: Artwork; side: Side; hidden: boolean; onOpen: (work: Artwork, image: HTMLElement) => void }) {
  const wide = isLandscape(work);
  const [imageCols, textCols] = FEATURE_COLUMNS[wide ? "wide" : "tall"][side];
  const image = React.useRef<HTMLImageElement>(null);
  return (
    <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-x-8 lg:gap-y-0">
      <Plate work={work} hidden={hidden} onOpen={onOpen} imageRef={image} sizes={wide ? "(min-width: 1024px) 58vw, 100vw" : "(min-width: 1024px) 42vw, 100vw"} className={cn("w-full lg:row-start-1", imageCols)} />
      {/* On a phone the text follows the image; on a wide screen it sits beside it, on the other side. */}
      <Reveal delay={0.2} className={cn("lg:row-start-1", textCols)}>
        <p className="display text-[clamp(1.75rem,1.2rem+1.6vw,2.75rem)] leading-[1.05] tracking-[-0.02em]">{work.title}</p>
        {metaOf(work) && <p className="mt-3 text-sm text-muted-foreground">{metaOf(work)}</p>}
        {work.description && <p className="mt-6 max-w-md text-[15px] leading-relaxed text-pretty text-foreground/80">{work.description}</p>}
        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
          <span className="text-sm tabular-nums text-muted-foreground">{priceOf(work)}</span>
          <button
            type="button"
            onClick={() => image.current && onOpen(work, image.current)}
            className="group inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-4 text-[13px] outline-none transition-colors duration-300 hover:border-foreground/40 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
          >
            View the work
            <ArrowRight className="size-3.5 transition-transform duration-500 group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </button>
          <button type="button" onClick={() => requestEnquiry(work.title)} className="link-draw pb-0.5 text-[13px]">Enquire</button>
        </div>
      </Reveal>
    </div>
  );
}

export function EditorialWall({ works, lifted, onOpen }: { works: Artwork[]; lifted: string | null; onOpen: (work: Artwork, image: HTMLElement) => void }) {
  const blocks = React.useMemo(() => blocksOf(works), [works]);
  return (
    // Generous space between rows: each arrangement is meant to be seen on its own.
    <div className="flex flex-col gap-24 sm:gap-32 lg:gap-44">
      {blocks.map((block) => {
        if (block.kind === "feature") {
          return <Feature key={block.work.id} work={block.work} side={block.side} hidden={lifted === block.work.id} onOpen={onOpen} />;
        }
        if (block.kind === "full") {
          return (
            <div key={block.work.id}>
              <Plate work={block.work} hidden={lifted === block.work.id} onOpen={onOpen} sizes="100vw" fit className="w-full" />
              <Caption work={block.work} className="mx-auto max-w-3xl" />
            </div>
          );
        }
        if (block.kind === "single") {
          return (
            <div key={block.work.id} className="grid grid-cols-1 gap-6 sm:grid-cols-12">
              <div className={cn("sm:col-span-6 lg:col-span-5 sm:row-start-1", block.side === "left" ? "sm:col-start-2" : "sm:col-start-6 lg:col-start-7")}>
                <Plate work={block.work} hidden={lifted === block.work.id} onOpen={onOpen} sizes="(min-width: 640px) 42vw, 100vw" className="w-full" />
                <Caption work={block.work} />
              </div>
              {/* A work with a description fills the empty side of its row with it. */}
              {block.work.description && (
                <Reveal delay={0.25} className={cn("self-center sm:row-start-1 sm:col-span-5 lg:col-span-4", block.side === "left" ? "sm:col-start-8 lg:col-start-8" : "sm:col-start-1 lg:col-start-2")}>
                  <p className="display text-[clamp(1.5rem,1.15rem+1vw,2.1rem)] leading-[1.1] tracking-[-0.02em]">{block.work.title}</p>
                  <p className="mt-5 max-w-md text-[15px] leading-relaxed text-pretty text-foreground/80">{block.work.description}</p>
                </Reveal>
              )}
            </div>
          );
        }
        const trio = block.works.length > 2;
        return (
          <div key={block.works.map((work) => work.id).join("+")} className="grid grid-cols-1 sm:grid-cols-12">
            {/* The pair leans to one side of the page. Each work's width follows its shape (flex-grow = width ÷ height),
                so both stand exactly as tall as each other: tops, bottoms and captions line up. */}
            <div className={cn("flex flex-col gap-16 sm:flex-row sm:gap-8 lg:gap-12", trio ? "sm:col-span-12" : cn("sm:col-span-10 lg:col-span-8", block.side === "right" ? "sm:col-start-3 lg:col-start-5" : "sm:col-start-1"))}>
              {block.works.map((work, k) => (
                <div key={work.id} className="min-w-0" style={{ flex: `${(work.aspect ?? 0.8).toFixed(4)} 1 0%` }}>
                  <Plate work={work} hidden={lifted === work.id} onOpen={onOpen} sizes={trio ? "(min-width: 640px) 33vw, 100vw" : "(min-width: 1024px) 34vw, (min-width: 640px) 42vw, 100vw"} className="w-full" delay={k * 0.12} />
                  <Caption work={work} delay={k * 0.12} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
