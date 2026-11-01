import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArtworkDetail } from "@/components/ui/artwork-detail";
import { Reveal, RevealHeading, RevealImage, Stagger, StaggerItem } from "@/components/motion/reveal";
import { clamp, Picture } from "@/components/ui/picture-frame";
import { artworks, subjects, type Artwork, type Subject } from "@/content/artworks";
import { detailLabels, enquireAbout } from "@/content/enquiry";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Real size in cm. Works without measurements yet are shown as if 50 cm tall. */
function sizeOf(work: Artwork) {
  const aspect = work.aspect ?? 0.8;
  if (work.dimensions) return { w: work.dimensions.width, h: work.dimensions.width / aspect };
  return { w: 50 * aspect, h: 50 };
}

function WorkCard({ work, hidden, delay, onOpen }: { work: Artwork; hidden: boolean; delay: number; onOpen: (work: Artwork, image: HTMLElement) => void }) {
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
        src={work.image}
        avif={work.imageAvif}
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

/**
 * Every work, unframed and shown to scale: a 60 cm canvas hangs larger than a 40 cm one. Works hang on a shared centre
 * line, as in a gallery, so the arrangement follows their real sizes instead of a grid. `--cm` is one centimetre on
 * screen. Phones skip the scale and give every work the full width. Filters by subject and availability; a work opens in
 * the shared detail view.
 */
export function Collection() {
  const [subject, setSubject] = React.useState<Subject | "All">("All");
  const [availableOnly, setAvailableOnly] = React.useState(false);
  const [open, setOpen] = React.useState<Artwork | null>(null);
  const [lifted, setLifted] = React.useState<string | null>(null);
  const source = React.useRef<HTMLElement | null>(null);

  const offered = React.useMemo(() => subjects.filter((s) => artworks.some((work) => work.subject === s)), []);
  const shown = artworks.filter((work) => (subject === "All" || work.subject === subject) && (!availableOnly || work.status === "available"));
  const available = shown.filter((work) => work.status === "available").length;

  // Two works a row from tablet width up, as large as the room allows, at one true scale for the whole collection:
  // --cm is set so the widest possible pair still fits and the tallest work stays in view. On a phone each work gets
  // the full width instead; at true scale there the smaller pieces would be too small to see.
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
  const sizes = artworks.map(sizeOf);
  const widest = sizes.map((size) => size.w).sort((a, b) => b - a).slice(0, cols).reduce((sum, w) => sum + w, 0);
  const tallest = Math.max(...sizes.map((size) => size.h));
  const cm = room.w ? Math.min((room.w - (cols - 1) * gap - 1) / widest, (room.h * 0.72) / tallest, 12) : 0;

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
    <section id="collection" aria-labelledby="collection-title" className="relative mx-auto w-full max-w-[1440px] scroll-mt-14 px-5 pt-section sm:scroll-mt-16 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <RevealHeading id="collection-title" className="display text-title" text="The collection" />
        <Reveal delay={0.3} y={8}>
        <p aria-live="polite" className="text-sm tabular-nums text-muted-foreground">
          {shown.length} {shown.length === 1 ? "work" : "works"} · {available} available
        </p>
        </Reveal>
      </div>

      <div ref={wall} className="mt-8" style={{ "--cm": `${cm.toFixed(3)}px` } as React.CSSProperties}>
        <Stagger className="flex flex-wrap items-center gap-2" delay={0.2}>
          <StaggerItem>
          <div role="group" aria-label="Filter by subject" className="flex flex-wrap gap-2">
            {(["All", ...offered] as const).map((s) => (
              <button key={s} type="button" aria-pressed={subject === s} onClick={() => setSubject(s)} className={chip(subject === s)}>
                {s}
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
          <StaggerItem className="ml-auto max-sm:hidden">
          <p className="flex items-center gap-2.5 text-xs text-muted-foreground" title="Works are shown at their real relative size">
            Shown to scale
            <span aria-hidden="true" className="relative inline-block h-2 border-x border-current" style={{ width: "calc(var(--cm) * 10)" }}>
              <span className="absolute inset-x-0 top-1/2 h-px bg-current" />
            </span>
            10 cm
          </p>
          </StaggerItem>
        </Stagger>

        <ul className="mt-14 -mb-14 flex flex-wrap items-center justify-center sm:mt-16 sm:-mb-20" style={{ columnGap: gap, visibility: cm ? undefined : "hidden" }}>
          <AnimatePresence mode="popLayout" initial={false}>
            {shown.flatMap((work, i) => [
              // A full-width break after every `cols` works starts the next row.
              ...(i > 0 && i % cols === 0 ? [<li key={`row-${i}`} aria-hidden="true" className="h-0 basis-full" />] : []),
              <motion.li
                key={work.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.6, ease: EASE }}
                className="mb-14 min-w-0 max-w-full sm:mb-20"
                style={{ width: cols === 1 ? "100%" : `calc(var(--cm) * ${sizeOf(work).w.toFixed(2)})` }}
              >
                <WorkCard work={work} hidden={lifted === work.id} delay={(i % cols) * 0.12} onOpen={onOpen} />
              </motion.li>,
            ])}
          </AnimatePresence>
        </ul>
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
