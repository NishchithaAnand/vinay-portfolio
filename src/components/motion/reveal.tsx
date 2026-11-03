import * as React from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";

/*
 * Entrances for every section: things settle into place the first time they scroll into view, then stay put.
 * One easing and one trigger line for the whole site, so the page moves with a single rhythm.
 * With reduced motion, everything simply fades.
 */
export const EASE = [0.16, 1, 0.3, 1] as const;
/** Starts once the element is ~12% above the bottom of the screen; plays once. */
const VIEW = { once: true, margin: "0px 0px -12% 0px" } as const;

/** Fades in and rises a little. */
export function Reveal({ children, className, delay = 0, y = 24 }: { children: React.ReactNode; className?: string; delay?: number; y?: number }) {
  const reduced = useReducedMotion();
  return (
    <motion.div className={className} initial={{ opacity: 0, y: reduced ? 0 : y }} whileInView={{ opacity: 1, y: 0 }} viewport={VIEW} transition={{ duration: 0.9, ease: EASE, delay }}>
      {children}
    </motion.div>
  );
}

const wordRise: Variants = { hidden: { y: "110%" }, shown: { y: "0%", transition: { duration: 1, ease: EASE } } };
const wordFade: Variants = { hidden: { opacity: 0 }, shown: { opacity: 1, transition: { duration: 0.6 } } };

/** A heading whose words rise one after another out of their own baseline. */
export function RevealHeading({ text, id, className, as = "h2", delay = 0, by = "word" }: { text: string; id?: string; className?: string; as?: "h2" | "p" | "span"; delay?: number; by?: "word" | "letter" }) {
  const reduced = useReducedMotion();
  const Tag = motion[as];
  const parts = by === "letter" ? Array.from(text) : text.split(" ");
  return (
    <Tag
      id={id}
      className={className}
      aria-label={text}
      initial="hidden"
      whileInView="shown"
      viewport={VIEW}
      variants={{ hidden: {}, shown: { transition: { staggerChildren: by === "letter" ? 0.035 : 0.07, delayChildren: delay } } }}
    >
      {parts.map((part, i) => (
        <React.Fragment key={`${i}-${part}`}>
          {/* The mask clips only top and bottom (italics lean out sideways). Padding, cancelled by the negative margin, gives
              accents and the deep tails of italic g, y, j room inside it without moving the text. */}
          <span aria-hidden="true" className="-mt-[0.1em] -mb-[0.3em] inline-block overflow-x-visible overflow-y-clip pt-[0.1em] pb-[0.3em] align-bottom">
            <motion.span className="inline-block" variants={reduced ? wordFade : wordRise}>
              {part === " " ? " " : part}
            </motion.span>
          </span>
          {by === "word" && i < parts.length - 1 ? " " : null}
        </React.Fragment>
      ))}
    </Tag>
  );
}

/**
 * A painting revealed like a curtain going up: the frame wipes open from the bottom while the image rises a little and
 * settles from a slight zoom. The zoom stays small (4%): even a painting as wide as the page then stays inside the page
 * margins while it waits, so it never makes the page wider than the screen.
 */
export function RevealImage({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduced = useReducedMotion();
  if (reduced) {
    return (
      <motion.div className={className} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={VIEW} transition={{ duration: 0.8, delay }}>
        {children}
      </motion.div>
    );
  }
  return (
    <motion.div
      className={className}
      initial={{ clipPath: "inset(100% 0% 0% 0%)" }}
      // Ends past the edges (negative inset), so shadows and hover lifts outside the box are never cut off afterwards.
      whileInView={{ clipPath: "inset(-25% -25% -25% -25%)" }}
      viewport={VIEW}
      transition={{ duration: 1.25, ease: EASE, delay }}
    >
      <motion.div initial={{ scale: 1.04, y: 28 }} whileInView={{ scale: 1, y: 0 }} viewport={VIEW} transition={{ duration: 1.6, ease: EASE, delay }}>
        {children}
      </motion.div>
    </motion.div>
  );
}

const staggerParent: Variants = { hidden: {}, shown: { transition: { staggerChildren: 0.09 } } };
const staggerChild: Variants = { hidden: { opacity: 0, y: 18 }, shown: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } } };
const staggerChildStill: Variants = { hidden: { opacity: 0 }, shown: { opacity: 1, transition: { duration: 0.6 } } };

/** Children marked with <StaggerItem> arrive one after another. */
export function Stagger({ children, className, delay = 0, as = "div", label }: { children: React.ReactNode; className?: string; delay?: number; as?: "div" | "ul" | "nav"; label?: string }) {
  const Tag = motion[as];
  return (
    <Tag aria-label={label} className={className} initial="hidden" whileInView="shown" viewport={VIEW} variants={{ ...staggerParent, shown: { transition: { staggerChildren: 0.09, delayChildren: delay } } }}>
      {children}
    </Tag>
  );
}

export function StaggerItem({ children, className, as = "div" }: { children: React.ReactNode; className?: string; as?: "div" | "li" }) {
  const reduced = useReducedMotion();
  const Tag = motion[as];
  return <Tag className={className} variants={reduced ? staggerChildStill : staggerChild}>{children}</Tag>;
}
