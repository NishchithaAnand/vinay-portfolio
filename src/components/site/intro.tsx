import * as React from "react";
import { motion, useAnimationFrame, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, useVelocity } from "motion/react";
import { EASE } from "@/components/motion/reveal";
import { ArtworkDetail } from "@/components/ui/artwork-detail";
import { Picture } from "@/components/ui/picture-frame";
import { about } from "@/content/about";
import { artworks, type Artwork } from "@/content/artworks";
import { detailLabels, enquireAbout } from "@/content/enquiry";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";

/** Two rows of his work, alternating, so each row mixes subjects and mediums. */
const rows = [artworks.filter((_, i) => i % 2 === 0), artworks.filter((_, i) => i % 2 === 1)];

const wrap = (min: number, max: number, value: number) => {
  const range = max - min;
  return ((((value - min) % range) + range) % range) + min;
};

const BASE_SPEED = 1.1; // % of a row's loop per second

/**
 * One row of paintings gliding sideways without end. Scrolling the page speeds it up (in either direction, the way a
 * wheel spins), hovering slows it nearly to a stop so a work can be picked. The row is drawn twice and wrapped, so the
 * loop has no seam. With reduced motion it stands still and scrolls by hand.
 */
function Marquee({ works, direction, delay, onOpen }: { works: Artwork[]; direction: 1 | -1; delay: number; onOpen: (work: Artwork, image: HTMLElement) => void }) {
  const reduced = useReducedMotion() ?? false;
  const base = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const boost = useTransform(velocity, [-1500, 0, 1500], [5, 0, 5], { clamp: false });
  const x = useTransform(base, (v) => `${wrap(-50, 0, v)}%`);
  const hover = React.useRef(0);
  const hovering = React.useRef(false);

  useAnimationFrame((_, delta) => {
    if (reduced) return;
    hover.current += ((hovering.current ? 1 : 0) - hover.current) * Math.min(1, delta / 250);
    const speed = (BASE_SPEED + Math.abs(boost.get())) * (1 - hover.current * 0.9);
    base.set(base.get() + direction * speed * (delta / 1000));
  });

  return (
    <motion.div
      className={cn("relative min-h-0 flex-1", reduced ? "overflow-x-auto" : "overflow-hidden")}
      onPointerEnter={() => { hovering.current = true; }}
      onPointerLeave={() => { hovering.current = false; }}
      initial={{ opacity: 0, x: direction * -60 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 1.4, ease: EASE, delay }}
    >
      <motion.ul className="m-0 flex h-full w-max list-none gap-3 p-0 sm:gap-4" style={reduced ? undefined : { x }}>
        {[0, 1].map((copy) =>
          works.map((work) => (
            <li key={`${copy}-${work.id}`} className="h-full shrink-0" aria-hidden={copy === 1 || undefined}>
              <Tile work={work} copy={copy} onOpen={onOpen} />
            </li>
          )),
        )}
      </motion.ul>
    </motion.div>
  );
}

function Tile({ work, copy, onOpen }: { work: Artwork; copy: number; onOpen: (work: Artwork, image: HTMLElement) => void }) {
  const image = React.useRef<HTMLImageElement>(null);
  const thumb = work.imageThumb;
  return (
    <button
      type="button"
      tabIndex={copy === 1 ? -1 : undefined}
      onClick={() => image.current && onOpen(work, image.current)}
      aria-label={`${work.title}, view details`}
      className="group relative block h-full cursor-pointer overflow-hidden rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      style={{ aspectRatio: String(work.aspect ?? 0.8) }}
    >
      <Picture
        ref={image}
        src={thumb?.jpg ?? work.image}
        avif={thumb?.avif ?? work.imageAvif}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className="size-full select-none object-cover transition-transform duration-700 ease-(--ease-lift) group-hover:scale-[1.04] motion-reduce:transition-none"
      />
      <span className="pointer-events-none absolute inset-x-2 bottom-2 translate-y-1 rounded-md bg-black/55 px-2.5 py-1.5 text-left text-xs font-medium text-white opacity-0 backdrop-blur-sm transition-[opacity,translate] duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
        {work.title}
      </span>
    </button>
  );
}

/**
 * The opening screen. The top third is the name, set across the whole width, with his face in a circle set into the
 * line (black and white, colour on hover); the rest is his work, two rows of paintings gliding past in opposite
 * directions. Any painting opens its details.
 */
export function Intro() {
  const face = about.introFace;
  const [open, setOpen] = React.useState<Artwork | null>(null);
  const source = React.useRef<HTMLElement | null>(null);
  const onOpen = React.useCallback((work: Artwork, image: HTMLElement) => {
    source.current = image;
    setOpen(work);
  }, []);

  return (
    <section id="top" aria-labelledby="intro-name" className="relative flex h-svh min-h-[620px] flex-col overflow-hidden pt-16 sm:pt-20">
      <div className="mx-auto w-full max-w-[1440px] px-5 pt-6 sm:px-8 lg:pt-8">

        {/* The name, as wide as the page, with his face set into the line. */}
        <h1 id="intro-name" className="m-0 flex items-center gap-[0.06em] font-display text-[clamp(4.25rem,0.5rem+17vw,15.5rem)] leading-[0.82] tracking-[-0.045em] sm:mt-2">
          <span className="sr-only">{site.name}, artist</span>
          {Array.from(site.name.toUpperCase()).map((letter, i) => (
            <span key={i} aria-hidden="true" className="-mb-[0.1em] inline-block overflow-y-clip pb-[0.1em]">
              <motion.span className="inline-block" initial={{ y: "105%" }} animate={{ y: "0%" }} transition={{ duration: 1.1, ease: EASE, delay: 0.1 + i * 0.06 }}>
                {letter}
              </motion.span>
            </span>
          ))}
          {/* His face in a circle the height of the letters: a close crop, so it reads at a glance. */}
          <motion.span
            aria-hidden="true"
            className="group ml-[0.1em] inline-block h-[0.74em] shrink-0 overflow-hidden rounded-full"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "0.74em", opacity: 1 }}
            transition={{ duration: 1.2, ease: EASE, delay: 0.55 }}
          >
            <Picture src={face.image} avif={face.avif} alt="" decoding="async" className="size-full object-cover grayscale transition-[filter] duration-700 group-hover:grayscale-0 motion-reduce:transition-none" />
          </motion.span>
        </h1>
      </div>

      {/* His work, gliding past. */}
      <div className="mt-6 flex min-h-0 flex-1 flex-col gap-3 pb-5 sm:mt-8 sm:gap-4 sm:pb-8">
        <Marquee works={rows[0]!} direction={-1} delay={0.7} onOpen={onOpen} />
        <Marquee works={rows[1]!} direction={1} delay={0.85} onOpen={onOpen} />
      </div>

      {open && (
        <ArtworkDetail
          item={open}
          labels={detailLabels}
          source={() => source.current?.getBoundingClientRect() ?? null}
          sourceKind="image"
          onEnquire={enquireAbout}
          onClose={() => setOpen(null)}
        />
      )}
    </section>
  );
}
