import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { EASE, RevealHeading } from "@/components/motion/reveal";
import { backgroundOf, Picture } from "@/components/ui/picture-frame";
import { about } from "@/content/about";
import { artworks } from "@/content/artworks";
import { site } from "@/content/site";

/** The painting he sits inside: its swirling sky glows faintly in the dark behind him and over him, in grayscale. */
const PAINTING_ID = "starry-night-montreal";

/**
 * The opening screen, one dark scene rather than pictures on a page: Vinay at his desk, drawing, in black and white,
 * dissolves into the dark at its edges; the painting's sky, also in grayscale and kept faint so his face stays clear,
 * swirls behind and over him, so he sits inside his own work. His name and two tags sit on the other side. It stays pinned while the next section
 * slides up over it, settling back and dimming as it goes. Always dark, whatever the site's theme.
 */
export function Intro() {
  const reduced = useReducedMotion() ?? false;
  const painting = artworks.find((work) => work.id === PAINTING_ID);
  const portrait = about.introPortrait;

  // His figure fades out to the right and at the bottom (on a phone, only at the bottom).
  const fade = "[mask-image:linear-gradient(to_bottom,#000_55%,transparent_96%)] lg:[mask-image:linear-gradient(to_right,#000_45%,transparent_88%),linear-gradient(to_bottom,#000_70%,transparent_100%)] lg:[mask-composite:intersect]";
  const sky = painting ? backgroundOf(painting.imageSmall?.jpg ?? painting.image, painting.imageSmall?.avif ?? painting.imageAvif) : undefined;

  return (
    // The scroll-linked movement (.intro-figure, .intro-text, .intro-dim in index.css) is CSS scroll-driven animation:
    // it runs on the compositor in step with the scroll, so it can't lag a frame behind and shake.
    <section id="top" data-dark-intro="" aria-labelledby="intro-name" className="dark sticky top-0 z-0 h-svh min-h-[560px] overflow-hidden bg-[#0c0b0d] text-foreground">
      {/* The painting's sky, glowing faintly out of the dark behind him, drifting very slowly. */}
      {sky && (
        <motion.div aria-hidden="true" className="absolute -inset-[6%]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduced ? 1.2 : 2.4, ease: EASE }}>
          {/* Fainter on a phone, where his face fills the screen and the painting would compete with it. */}
          <div className="absolute inset-0 bg-cover bg-center opacity-[0.05] grayscale [mask-image:radial-gradient(70%_70%_at_38%_40%,#000,transparent_75%)] lg:opacity-[0.12]" style={{ backgroundImage: sky }} />
        </motion.div>
      )}

      {/* Him, in black and white, melting into the dark, with the painting's swirls faintly over him. */}
      <div className="intro-figure absolute inset-y-0 left-0 w-full lg:w-[62%]">
        <motion.div
          className={`absolute inset-0 ${fade}`}
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 2.2, ease: EASE, delay: 0.1 }}
        >
          <Picture src={portrait.image} avif={portrait.avif} alt={portrait.alt} decoding="async" className="size-full object-cover object-[40%_35%] brightness-[0.82] contrast-[1.15] grayscale" />
          {sky && <div aria-hidden="true" className="absolute inset-0 bg-cover bg-center opacity-[0.06] grayscale mix-blend-soft-light lg:opacity-[0.18]" style={{ backgroundImage: sky }} />}
        </motion.div>
      </div>

      {/* Corners fall away into the dark. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_40%_45%,transparent_55%,rgb(0_0_0/0.65))]" />

      {/* Name, tags and a way in. */}
      <div className="intro-text relative z-10 mx-auto flex h-full w-full max-w-[1440px] items-end px-5 pb-14 sm:px-8 lg:items-center lg:pb-0">
        <div className="lg:ml-[56%]">
          <h1 className="m-0">
            <RevealHeading as="span" id="intro-name" by="letter" text={site.name.toUpperCase()} className="display block text-[clamp(3.75rem,1.5rem+9vw,9.5rem)] leading-[0.9] tracking-[0.12em]" />
          </h1>
          <motion.ul
            className="mt-5 flex list-none flex-wrap gap-x-6 gap-y-2 p-0 lg:mt-7"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE, delay: 0.8 }}
          >
            {["Artist"].map((tag) => (
              <li key={tag} className="label flex items-center gap-2 text-foreground/85">
                <span aria-hidden="true" className="size-1.5 bg-signal" />
                {tag}
              </li>
            ))}
          </motion.ul>
          <motion.a
            href="#contact"
            // The site's primary button: a pill, sentence case, like "Explore all works" and "Send inquiry".
            className="group mt-8 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground outline-none transition-colors duration-300 hover:bg-primary/85 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none lg:mt-10"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE, delay: 1 }}
          >
            Get in touch
            <ArrowRight className="size-4 transition-transform duration-500 ease-(--ease-gallery) group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </motion.a>
        </div>
      </div>

      {/* As the next section slides over, the scene dims. */}
      <div aria-hidden="true" className="intro-dim pointer-events-none absolute inset-0 bg-black opacity-0" />
    </section>
  );
}
