import * as React from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { about } from "@/content/about";
import { Reveal, RevealHeading } from "@/components/motion/reveal";
import { Picture } from "@/components/ui/picture-frame";
import { site } from "@/content/site";

/*
 * One pinned scene, driven by scroll (0 → 1 across the section). The section title stays put, like the collection's.
 *   0.04–0.34  the paragraph writes itself in, word by word
 *   0.40–0.75  the portrait rises from below to the centre
 *   0.55–0.75  each line parts between whole words to let it in: words left of centre move left, the rest move right
 *   0.75–0.85  the caption settles under the portrait; the rest is a hold
 */
const WORDS: [number, number] = [0.04, 0.34];

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}

const titleClass = "display text-title";
const paragraphClass = "text-balance text-[clamp(1.0625rem,0.92rem+0.55vw,1.5rem)] leading-[1.6]";

/** Where a word goes when the paragraph parts: which way, and how far its edge already overlaps the centre line. */
type Parting = { side: -1 | 1; overlap: number };

function Word({ word, index, count, progress, part, parting }: { word: string; index: number; count: number; progress: MotionValue<number>; part: MotionValue<string>; parting: Parting }) {
  const span = (WORDS[1] - WORDS[0]) / count;
  const start = WORDS[0] + index * span;
  const opacity = useTransform(progress, [start, start + span * 2.5], [0.12, 1]);
  const style = { opacity, x: part, "--side": parting.side, "--overlap": `${parting.overlap.toFixed(1)}px` };
  return (
    <>
      <motion.span data-word className="inline-block" style={style as React.ComponentProps<typeof motion.span>["style"]}>
        {word}
      </motion.span>{" "}
    </>
  );
}

/**
 * Each line splits at the centre between whole words: words left of centre move left, the rest move right. Both halves
 * of a line move as one (so word spacing never changes), and far enough that the word nearest the centre clears the
 * portrait completely, even if it started out straddling the centre line.
 */
function partingsFor(spans: HTMLElement[], centre: number): Parting[] {
  const lines = new Map<number, HTMLElement[]>();
  for (const el of spans) {
    const top = Math.round(el.offsetTop);
    lines.set(top, [...(lines.get(top) ?? []), el]);
  }
  const result = new Map<HTMLElement, Parting>();
  for (const line of lines.values()) {
    const left = line.filter((el) => el.offsetLeft + el.offsetWidth / 2 < centre);
    const right = line.filter((el) => !left.includes(el));
    const lastLeft = left[left.length - 1];
    const firstRight = right[0];
    // How far the inner word on each side already reaches past the centre.
    const leftOverlap = lastLeft ? Math.max(0, lastLeft.offsetLeft + lastLeft.offsetWidth - centre) : 0;
    const rightOverlap = firstRight ? Math.max(0, centre - firstRight.offsetLeft) : 0;
    for (const el of left) result.set(el, { side: -1, overlap: leftOverlap });
    for (const el of right) result.set(el, { side: 1, overlap: rightOverlap });
  }
  return spans.map((el) => result.get(el) ?? { side: 1, overlap: 0 });
}

function PartingParagraph({ progress, split }: { progress: MotionValue<number>; split: MotionValue<number> }) {
  const words = React.useMemo(() => about.paragraph.split(" "), []);
  const ref = React.useRef<HTMLParagraphElement>(null);
  const [partings, setPartings] = React.useState<Parting[]>(() => words.map(() => ({ side: 1, overlap: 0 })));
  // Clear the centre by half the portrait, plus a margin, plus however far the inner word started past the centre.
  const part = useTransform(split, (v) => `calc(${v} * var(--side) * (var(--img-w) / 2 + var(--part) + var(--overlap)))`);

  React.useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    // offsetLeft/offsetTop ignore transforms, so this measures the resting layout even mid-animation.
    const measure = () => setPartings(partingsFor(Array.from(node.querySelectorAll<HTMLElement>("[data-word]")), node.clientWidth / 2));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [words]);

  return (
    <p ref={ref} className={`relative max-w-[min(92vw,46rem)] text-center ${paragraphClass}`}>
      {words.map((word, i) => (
        <Word key={`${i}-${word}`} word={word} index={i} count={words.length} progress={progress} part={part} parting={partings[i] ?? { side: 1, overlap: 0 }} />
      ))}
    </p>
  );
}

function PortraitImage() {
  const photo = about.portrait ?? about.standIn;
  const alt = about.portrait ? `Portrait of ${site.name}` : about.standIn.alt;
  return (
    <div className="relative">
      {/* The photo is square; a 4:5 crop held a little right of centre keeps his face, which looks off to the side. */}
      <Picture src={photo.image} avif={photo.avif} alt={alt} draggable={false} decoding="async" className="block aspect-[4/5] w-full select-none object-cover object-[56%_50%] shadow-[0_40px_80px_-30px_rgb(0_0_0/0.55)]" />
      {import.meta.env.DEV && !about.portrait && <span className="label absolute left-3 top-3 rounded-full bg-background/85 px-2.5 py-1 text-muted-foreground">Portrait to come</span>}
    </div>
  );
}

/** His profiles, set under the section title. */
function SocialLinks() {
  return (
    <ul className="mt-5 flex flex-wrap gap-2">
      {site.socials.map((social) => (
        <li key={social.href}>
          <a
            href={social.href}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex h-9 items-center gap-2 rounded-full border border-border px-3.5 text-sm text-muted-foreground outline-none transition-colors duration-300 hover:border-foreground/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
          >
            <SocialIcon label={social.label} />
            <span className="sr-only">{social.label}: </span>
            {social.handle}
            <svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10" className="transition-transform duration-300 group-hover:-translate-y-px group-hover:translate-x-px motion-reduce:transition-none"><path d="M2.5 7.5l5-5M3.5 2.5h4v4" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </a>
        </li>
      ))}
    </ul>
  );
}

function SocialIcon({ label }: { label: string }) {
  if (label === "Instagram") {
    return (
      <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4.2" />
        <circle cx="17.3" cy="6.7" r="0.9" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />;
}

/** Without motion: the same parts, simply stacked. */
function StillAbout() {
  return (
    <section id="about" aria-labelledby="about-title" className="mx-auto w-full max-w-[1440px] scroll-mt-14 px-5 pt-section sm:scroll-mt-16 sm:px-8">
      <RevealHeading id="about-title" className={titleClass} text={about.heading} />
      <Reveal delay={0.35} y={12}><SocialLinks /></Reveal>
      <div className="mt-16 flex flex-col items-center gap-12 text-center">
        <p className={`max-w-[46rem] ${paragraphClass}`}>{about.paragraph}</p>
        <figure className="m-0 w-[min(70vw,360px)]">
          <PortraitImage />
          <figcaption className="label mt-4 text-muted-foreground">{about.caption}</figcaption>
        </figure>
      </div>
    </section>
  );
}

export function About() {
  const reduced = usePrefersReducedMotion();
  const ref = React.useRef<HTMLElement>(null);
  const stage = React.useRef<HTMLDivElement>(null);
  const area = React.useRef<HTMLDivElement>(null);
  const figure = React.useRef<HTMLElement>(null);
  // The pinned screen ends with empty space under the caption; the next section starts over it, so the gap after
  // About matches every other gap between sections. Offsets ignore transforms, so this is the resting layout.
  const [tail, setTail] = React.useState(0);
  React.useLayoutEffect(() => {
    const s = stage.current;
    const a = area.current;
    const f = figure.current;
    if (!s || !a || !f) return;
    const measure = () => setTail(Math.max(0, s.clientHeight - (a.offsetTop + f.offsetTop + f.offsetHeight)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(s);
    observer.observe(f);
    return () => observer.disconnect();
  }, [reduced]);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });

  const paragraphOpacity = useTransform(p, [0.02, 0.08], [0, 1]);
  const paragraphY = useTransform(p, [0.02, 0.14], [32, 0]);
  const imageY = useTransform(p, [0.4, 0.75], ["105vh", "0vh"]);
  const imageScale = useTransform(p, [0.4, 0.75], [0.82, 1]);
  const imageRotate = useTransform(p, [0.4, 0.75], [-5, 0]);
  const split = useTransform(p, [0.55, 0.75], [0, 1]);
  const captionOpacity = useTransform(p, [0.75, 0.85], [0, 1]);

  if (reduced) return <StillAbout />;

  return (
    <section ref={ref} id="about" aria-labelledby="about-title" className="relative h-[400vh] scroll-mt-14 sm:scroll-mt-16" style={{ marginBottom: -tail }}>
      <div ref={stage} className="sticky top-0 flex h-svh flex-col overflow-hidden [--img-w:min(56vw,300px)] [--part:0.75rem] sm:[--part:1.25rem] lg:[--img-w:min(24vw,340px)] lg:[--part:2rem]">
        {/* The section title, placed and set exactly like the collection's; it doesn't move. */}
        <div className="mx-auto w-full max-w-[1440px] px-5 pt-section sm:px-8">
          <RevealHeading id="about-title" className={titleClass} text={about.heading} />
          <Reveal delay={0.35} y={12}><SocialLinks /></Reveal>
        </div>

        {/* Centred in the space under the title (not the whole screen), so nothing overlaps it and the scene ends without a tall empty band. */}
        <div ref={area} className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6">
          <motion.div style={{ opacity: paragraphOpacity, y: paragraphY }}>
            <PartingParagraph progress={p} split={split} />
          </motion.div>

          <motion.figure ref={figure} className="absolute m-0 w-(--img-w)" style={{ y: imageY, scale: imageScale, rotate: imageRotate }}>
            <PortraitImage />
            <motion.figcaption className="label mt-4 text-center text-muted-foreground" style={{ opacity: captionOpacity }}>
              {about.caption}
            </motion.figcaption>
          </motion.figure>
        </div>
      </div>
    </section>
  );
}
