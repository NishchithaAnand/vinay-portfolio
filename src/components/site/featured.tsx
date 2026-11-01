import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Reveal, RevealHeading, RevealImage } from "@/components/motion/reveal";
import { ArtworkDetail } from "@/components/ui/artwork-detail";
import { Picture } from "@/components/ui/picture-frame";
import { artworks, featuredIds, type Artwork } from "@/content/artworks";
import { detailLabels, enquireAbout } from "@/content/enquiry";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * His best work, one at a time, the full width of the screen and exactly as painted: never cropped, nothing laid
 * over it. The section title sits above like every other section's, and a small caption below. With more than one
 * featured work, the next waits beside the painting and wipes in when chosen.
 */
export function Featured() {
  const works = React.useMemo(() => featuredIds.map((id) => artworks.find((work) => work.id === id)).filter((work): work is Artwork => Boolean(work)), []);
  const reduced = useReducedMotion() ?? false;
  const [index, setIndex] = React.useState(0);
  const [open, setOpen] = React.useState<Artwork | null>(null);
  const image = React.useRef<HTMLImageElement>(null);

  const work = works[index];
  if (!work) return null;
  const next = works[(index + 1) % works.length]!;
  const many = works.length > 1;
  const aspect = work.aspect ?? 1;
  const meta = [work.year, work.medium, work.dimensions ? `${work.dimensions.width} × ${work.dimensions.height} cm` : null].filter(Boolean).join(" · ");
  const advance = () => setIndex((i) => (i + 1) % works.length);

  return (
    <section id="featured" aria-labelledby="featured-title" className="w-full scroll-mt-14 pt-section sm:scroll-mt-16">
      <div className="mx-auto flex w-full max-w-[1440px] items-end justify-between gap-6 px-5 sm:px-8">
        <RevealHeading id="featured-title" className="display text-title" text="Featured work" />
        {many && (
          <div aria-hidden="true" className="mb-2 flex gap-1.5">
            {works.map((w, i) => (
              <span key={w.id} className={cn("h-0.5 rounded-full bg-foreground transition-[width,opacity] duration-700 ease-(--ease-lift)", i === index ? "w-10 opacity-100" : "w-4 opacity-25")} />
            ))}
          </div>
        )}
      </div>

      {/* The painting runs the full width of the screen; the title and caption keep the page margins. */}
      <div className="mt-10 flex items-start gap-8 lg:mt-14">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.figure
            key={work.id}
            className="m-0 min-w-0 flex-1"
            initial={reduced ? { opacity: 0 } : { clipPath: "inset(0% 0% 0% 100%)" }}
            animate={reduced ? { opacity: 1 } : { clipPath: "inset(0% 0% 0% 0%)" }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.2 : 1.1, ease: EASE }}
          >
            {/* Title and price sit above the painting, so they are read before it rather than found after scrolling past it. */}
            <Reveal delay={0.25} y={12}>
            <figcaption className="mx-auto mb-4 flex max-w-[1440px] flex-wrap items-start justify-between gap-x-6 gap-y-3 px-5 sm:px-8">
              <div className="min-w-0">
                <p className="text-sm font-medium">{work.title}</p>
                {meta && <p className="mt-0.5 text-[13px] text-muted-foreground">{meta}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[13px] tabular-nums text-muted-foreground">{work.status === "sold" ? "Sold" : (work.price ?? detailLabels.onRequest)}</span>
                <button
                  type="button"
                  onClick={() => setOpen(work)}
                  className="group inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3.5 text-[13px] outline-none transition-colors duration-300 hover:border-foreground/40 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                >
                  Price & enquiry
                  <svg aria-hidden="true" width="12" height="12" viewBox="0 0 14 14" className="transition-transform duration-500 group-hover:translate-x-0.5 motion-reduce:transition-none"><path d="M2 7h10M8 3l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                {many && (
                  <button type="button" onClick={advance} className="inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-[13px] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring lg:hidden">
                    Next
                    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 14 14"><path d="M2 7h10M8 3l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                )}
              </div>
            </figcaption>
            </Reveal>

            <RevealImage delay={0.15}>
            <button type="button" onClick={() => setOpen(work)} aria-label={`${work.title}, view price and details`} className="block w-full cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background">
              <Picture ref={image} src={work.image} avif={work.imageAvif} alt="" draggable={false} decoding="async" className="block w-full select-none" style={{ aspectRatio: String(aspect) }} />
            </button>
            </RevealImage>
          </motion.figure>
        </AnimatePresence>

        {many && (
          // The next work waits beside the painting, never on it.
          <button type="button" onClick={advance} aria-label={`Next featured work: ${next.title}`} className="group hidden w-[16%] shrink-0 pr-8 text-left outline-none lg:block">
            <span className="block overflow-hidden">
              <Picture src={next.image} avif={next.imageAvif} alt="" draggable={false} className="block aspect-[4/5] w-full object-cover opacity-60 grayscale transition-[opacity,filter,scale] duration-700 ease-(--ease-lift) group-hover:scale-105 group-hover:opacity-100 group-hover:grayscale-0 group-focus-visible:opacity-100 motion-reduce:transition-none" />
            </span>
            <span className="mt-3 flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="label block text-muted-foreground">Next</span>
                <span className="mt-1 block truncate text-sm font-medium">{next.title}</span>
              </span>
              <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border transition-colors duration-300 group-hover:bg-foreground group-hover:text-background">
                <svg width="12" height="12" viewBox="0 0 14 14"><path d="M2 7h10M8 3l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
            </span>
          </button>
        )}
      </div>

      {open && (
        <ArtworkDetail
          item={open}
          labels={detailLabels}
          source={() => image.current?.getBoundingClientRect() ?? null}
          sourceKind="image"
          onEnquire={enquireAbout}
          onClose={() => setOpen(null)}
        />
      )}
    </section>
  );
}
