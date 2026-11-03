import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { EditorialWall } from "@/components/site/editorial-wall";
import { ArtworkDetail } from "@/components/ui/artwork-detail";
import { Reveal, RevealHeading, RevealImage, Stagger, StaggerItem } from "@/components/motion/reveal";
import { clamp, imageProps, Picture } from "@/components/ui/picture-frame";
import { subjects, whenOf, type Artwork, type Subject } from "@/content/artworks";
import { detailLabels, enquireAbout } from "@/content/enquiry";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Real size in cm. Works without measurements yet are shown as if 50 cm tall. */
function sizeOf(work: Artwork) {
  const aspect = work.aspect ?? 0.8;
  if (work.dimensions) return { w: work.dimensions.width, h: work.dimensions.width / aspect };
  return { w: 50 * aspect, h: 50 };
}

function WorkCard({ work, hidden, delay, sizes, onOpen }: { work: Artwork; hidden: boolean; delay: number; sizes: string; onOpen: (work: Artwork, image: HTMLElement) => void }) {
  const image = React.useRef<HTMLImageElement>(null);
  const sold = work.status === "sold";
  return (
    <button
      type="button"
      onClick={() => image.current && onOpen(work, image.current)}
      aria-label={`${work.title}, view details`}
      className="group block w-full cursor-pointer text-left outline-none"
    >
      <RevealImage delay={delay}>
      <Picture
        ref={image}
        {...imageProps(work)}
        sizes={sizes}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className="block w-full select-none object-cover shadow-[0_18px_36px_-20px_rgb(0_0_0/0.45)] transition-[translate,box-shadow] duration-700 ease-(--ease-lift) group-hover:-translate-y-1.5 group-hover:shadow-[0_28px_48px_-22px_rgb(0_0_0/0.5)] group-focus-visible:-translate-y-1.5 group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-4 group-focus-visible:ring-offset-background motion-reduce:transition-none"
        style={{ aspectRatio: String(work.aspect ?? 0.8), visibility: hidden ? "hidden" : undefined }}
      />
      </RevealImage>
      <Reveal delay={delay + 0.35} y={12}>
      <span className="mt-4 flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="link-draw inline-block max-w-full truncate pb-0.5 align-top text-sm font-medium">{work.title}</span>
          {work.medium && <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">{work.medium}</span>}
        </span>
        <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">
          {sold ? (
            <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-2 rounded-full bg-signal" />Sold</span>
          ) : (
            work.price ?? detailLabels.onRequest
          )}
        </span>
      </span>
      </Reveal>
    </button>
  );
}

type Sort = "newest" | "oldest";

/** The "spread" layout's column pairs, row by row. */
const STAGGER = [[1, 2], [2, 3], [1, 3]] as const;

export interface CollectionProps {
  id: string;
  title: string;
  works: Artwork[];
  /** Category chips with counts, "Available only" and newest/oldest. For the full works page. */
  browse?: boolean;
  /** The scale is set from these (default: `works`), so it stays the same whichever filter is on. */
  scaleFrom?: Artwork[];
  /** Under the title, e.g. a line of context. */
  intro?: React.ReactNode;
  /** Top right, beside the title (above the count), e.g. a link to all works. */
  action?: React.ReactNode;
  headingLevel?: "h1" | "h2";
  /**
   * "scale": works at true relative size, two a row, centred. "spread" (home page): on a wide screen, three column
   * positions with two works a row, the empty one moving each row (1·2, then 2·3, then 1·3). "editorial": a catalogue
   * of varied rows (the works page).
   */
  layout?: "scale" | "spread" | "editorial";
}

/**
 * Works unframed and shown to scale: a 60 cm canvas hangs larger than a 40 cm one (works without measurements yet
 * count as 50 cm tall). Works hang on a shared centre line, as in a gallery, so the arrangement follows their real
 * sizes instead of a grid. `--cm` is one centimetre on screen. Phones skip the scale and give every work the full
 * width. A work opens in the shared detail view; enquiring hands it to the contact form.
 */
export function Collection({ id, title, works, browse = false, scaleFrom, intro, action, headingLevel = "h2", layout = "scale" }: CollectionProps) {
  const [subject, setSubject] = React.useState<Subject | "All">("All");
  const [availableOnly, setAvailableOnly] = React.useState(false);
  const [sort, setSort] = React.useState<Sort>("newest");
  const [open, setOpen] = React.useState<Artwork | null>(null);
  const [lifted, setLifted] = React.useState<string | null>(null);
  const source = React.useRef<HTMLElement | null>(null);

  const offered = React.useMemo(() => subjects.map((s) => ({ subject: s, count: works.filter((work) => work.subject === s).length })).filter((o) => o.count > 0), [works]);
  const filtered = works.filter((work) => (subject === "All" || work.subject === subject) && (!availableOnly || work.status === "available"));
  const shown = browse ? [...filtered].sort((a, b) => (sort === "newest" ? whenOf(b).localeCompare(whenOf(a)) : whenOf(a).localeCompare(whenOf(b)))) : filtered;
  const available = shown.filter((work) => work.status === "available").length;
  const titleId = `${id}-title`;
  const Heading = headingLevel;

  // Two works a row from tablet width up, as large as the room allows, at one true scale: --cm is set so the widest
  // possible pair still fits and the tallest work stays in view. On a phone each work gets the full width instead; at
  // true scale there the smaller pieces would be too small to see.
  const wall = React.useRef<HTMLDivElement>(null);
  const [room, setRoom] = React.useState({ w: 0, h: 800 });
  React.useLayoutEffect(() => {
    const node = wall.current;
    if (!node) return;
    const measure = () => setRoom({ w: node.clientWidth, h: window.innerHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    window.addEventListener("resize", measure);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
  }, []);
  const cols = room.w >= 520 ? 2 : 1;
  const gap = cols === 1 ? 0 : Math.round(clamp(room.w * 0.045, 28, 72));
  const sizes = (scaleFrom ?? works).map(sizeOf);
  const widest = sizes.map((size) => size.w).sort((a, b) => b - a).slice(0, cols).reduce((sum, w) => sum + w, 0);
  const tallest = Math.max(...sizes.map((size) => size.h));
  // Spread: three equal columns; one centimetre is set so the widest work fits its column.
  const staggered = layout === "spread" && room.w >= 900;
  const column = (room.w - 2 * gap) / 3;
  const cm = !room.w ? 0 : staggered
    ? Math.min(column / Math.max(...sizes.map((size) => size.w)), (room.h * 0.72) / tallest, 12)
    : Math.min((room.w - (cols - 1) * gap - 1) / widest, (room.h * 0.72) / tallest, 12);

  const onOpen = React.useCallback((work: Artwork, frame: HTMLElement) => {
    source.current = frame;
    setOpen(work);
  }, []);
  const sourceRect = React.useCallback(() => source.current?.getBoundingClientRect() ?? null, []);
  const onLift = React.useCallback((lift: boolean) => setLifted(lift ? (open?.id ?? null) : null), [open]);
  const onClose = React.useCallback(() => {
    setOpen(null);
    source.current?.closest("button")?.focus({ preventScroll: true });
  }, []);

  const chip = (active: boolean) =>
    cn(
      "h-9 rounded-full border px-4 text-sm outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
      active ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
    );

  return (
    <section id={id} aria-labelledby={titleId} className="relative mx-auto w-full max-w-[1440px] scroll-mt-14 px-5 pt-section sm:scroll-mt-16 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div>
          <Heading className="m-0"><RevealHeading as="span" id={titleId} className="display text-title" text={title} /></Heading>
          {intro && <Reveal delay={0.25} y={10} className="mt-3 max-w-xl text-muted-foreground">{intro}</Reveal>}
        </div>
        <Reveal delay={0.3} y={8} className="flex flex-col items-start gap-3 sm:items-end">
          {action}
          <p aria-live="polite" className="text-sm tabular-nums text-muted-foreground">
            {shown.length} {shown.length === 1 ? "work" : "works"} · {available} available
          </p>
        </Reveal>
      </div>

      <div ref={wall} className="mt-8" style={{ "--cm": `${cm.toFixed(3)}px` } as React.CSSProperties}>
        {browse && (
        <Stagger className="flex flex-wrap items-center gap-2" delay={0.2}>
          <StaggerItem>
          <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
            {[{ subject: "All" as const, count: works.length }, ...offered].map((o) => (
              <button key={o.subject} type="button" aria-pressed={subject === o.subject} onClick={() => setSubject(o.subject)} className={chip(subject === o.subject)}>
                {o.subject}
                <span className={cn("ml-1.5 tabular-nums", subject === o.subject ? "opacity-60" : "opacity-50")}>{o.count}</span>
              </button>
            ))}
          </div>
          </StaggerItem>
          <StaggerItem>
          <button
            type="button"
            role="switch"
            aria-checked={availableOnly}
            onClick={() => setAvailableOnly((v) => !v)}
            className="inline-flex h-9 items-center gap-2.5 rounded-full px-1 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span aria-hidden="true" className={cn("relative h-5 w-9 rounded-full transition-colors duration-300", availableOnly ? "bg-foreground" : "bg-border")}>
              <span className={cn("absolute top-0.5 left-0.5 size-4 rounded-full bg-background shadow-sm transition-transform duration-300 ease-(--ease-lift)", availableOnly && "translate-x-4")} />
            </span>
            Available only
          </button>
          </StaggerItem>
          <StaggerItem>
          <label className="inline-flex h-9 items-center gap-2 text-sm text-muted-foreground">
            <span className="sr-only">Order</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as Sort)} className="h-9 cursor-pointer rounded-full border border-border bg-transparent pl-3.5 pr-8 text-sm text-foreground outline-none transition-colors hover:border-foreground/40 focus-visible:ring-2 focus-visible:ring-ring">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
          </StaggerItem>
          {layout === "scale" && (
          <StaggerItem className="ml-auto max-sm:hidden">
          <p className="flex items-center gap-2.5 text-xs text-muted-foreground" title="Works are shown at their real relative size">
            Shown to scale
            <span aria-hidden="true" className="relative inline-block h-2 border-x border-current" style={{ width: "calc(var(--cm) * 10)" }}>
              <span className="absolute inset-x-0 top-1/2 h-px bg-current" />
            </span>
            10 cm
          </p>
          </StaggerItem>
          )}
        </Stagger>
        )}

        {layout === "editorial" ? (
          // A new filter or order lays the catalogue out afresh; it fades in rather than shuffling.
          <motion.div key={`${subject}|${availableOnly}|${sort}`} className={browse ? "mt-16 sm:mt-24" : "mt-12"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <EditorialWall works={shown} lifted={lifted} onOpen={onOpen} />
          </motion.div>
        ) : (
        staggered ? (
          <ul className="mt-10 grid grid-cols-3 items-center gap-y-20 sm:mt-14" style={{ columnGap: gap, visibility: cm ? undefined : "hidden" }}>
            {shown.map((work, i) => {
              // Two works a row; the empty position moves: columns 1·2, then 2·3, then 1·3, and again.
              const columns = STAGGER[Math.floor(i / 2) % STAGGER.length]!;
              return (
                <motion.li
                  key={work.id}
                  layout
                  className="min-w-0 max-w-full justify-self-center"
                  style={{ gridRow: Math.floor(i / 2) + 1, gridColumn: columns[i % 2], width: `calc(var(--cm) * ${sizeOf(work).w.toFixed(2)})` }}
                >
                  <WorkCard work={work} hidden={lifted === work.id} delay={(i % 2) * 0.12} sizes={`${Math.round(cm * sizeOf(work).w)}px`} onOpen={onOpen} />
                </motion.li>
              );
            })}
          </ul>
        ) : (
        <ul className={cn("-mb-14 flex flex-wrap items-center justify-center sm:-mb-20", browse ? "mt-14 sm:mt-16" : "mt-10 sm:mt-14")} style={{ columnGap: gap, visibility: cm ? undefined : "hidden" }}>
          <AnimatePresence mode="popLayout">
            {shown.flatMap((work, i) => [
              // A full-width break after every `cols` works starts the next row.
              ...(i > 0 && i % cols === 0 ? [<li key={`row-${i}`} aria-hidden="true" className="h-0 basis-full" />] : []),
              <motion.li
                key={work.id}
                layout
                // In the starting view each work arrives through its own reveal; works a filter brings back fade in.
                // (AnimatePresence's initial={false} would do this, but it also switches off every reveal in the list.)
                initial={subject === "All" && !availableOnly && sort === "newest" ? false : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.6, ease: EASE }}
                className="mb-14 min-w-0 max-w-full sm:mb-20"
                style={{ width: cols === 1 ? "100%" : `calc(var(--cm) * ${sizeOf(work).w.toFixed(2)})` }}
              >
                <WorkCard work={work} hidden={lifted === work.id} delay={(i % cols) * 0.12} sizes={cols === 1 ? "100vw" : `${Math.round(cm * sizeOf(work).w)}px`} onOpen={onOpen} />
              </motion.li>,
            ])}
          </AnimatePresence>
        </ul>
        )
        )}
      </div>

      {shown.length === 0 && (
        <p className="mt-10 text-sm text-muted-foreground">
          Nothing matches yet.{" "}
          <button type="button" onClick={() => { setSubject("All"); setAvailableOnly(false); }} className="link-draw pb-0.5 text-foreground">Show all works</button>
        </p>
      )}

      {open && <ArtworkDetail item={open} labels={detailLabels} source={sourceRect} sourceKind="image" onEnquire={enquireAbout} onLift={onLift} onClose={onClose} />}
    </section>
  );
}
