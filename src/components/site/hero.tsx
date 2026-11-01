import * as React from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PictureRailGallery } from "@/components/ui/picture-rail-gallery";
import { artworks } from "@/content/artworks";
import { detailLabels, enquireAbout, requestEnquiry } from "@/content/enquiry";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";

// Three.js arrives in its own chunk; the plain wall colour stands in until it does.
const GalleryWall = React.lazy(() => import("@/components/canvas/gallery-wall").then((m) => ({ default: m.GalleryWall })));

const EASE = [0.16, 1, 0.3, 1] as const;

/** One line of display type rising out of its own baseline mask. */
function Line({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <span className="-mt-[0.1em] -mb-[0.3em] block overflow-x-visible overflow-y-clip pt-[0.1em] pb-[0.3em]">
      <motion.span className="block" initial={{ y: "108%" }} animate={{ y: 0 }} transition={{ duration: 1.1, ease: EASE, delay }}>
        {children}
      </motion.span>
    </span>
  );
}

function FadeUp({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE, delay }}>
      {children}
    </motion.div>
  );
}

export function Hero() {
  return (
    <section id="top" className="relative isolate flex min-h-svh flex-col overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-background" />
      <React.Suspense fallback={null}>
        <GalleryWall className="absolute inset-0 -z-10 bg-background animate-in fade-in duration-1000" />
      </React.Suspense>

      <div className="mx-auto w-full max-w-[1440px] px-5 pt-28 sm:px-8 sm:pt-32 lg:pt-36">
        <div className="grid gap-5 lg:grid-cols-12 lg:items-end lg:gap-8">
          <h1 className="display text-display text-balance lg:col-span-7">
            <Line delay={0.1}>Every canvas holds <em>a world of its own</em></Line>
          </h1>
          <FadeUp delay={0.45} className="max-w-md lg:col-span-5 lg:justify-self-end">
            <p className="text-lede text-muted-foreground">
              An independent artist in {site.city}, moving freely between mediums and styles. The wall below changes as the work does.
            </p>
          </FadeUp>
        </div>
      </div>

      <FadeUp delay={0.6} className="mt-10 lg:mt-14">
        <PictureRailGallery
          id="works"
          aria-label="Selected works"
          items={artworks}
          autoplay
          interval={3200}
          caption="Hover a work to lift it. Click to see its details."
          labels={{ ...detailLabels, open: "Click to view" }}
          onEnquire={enquireAbout}
          className="bg-transparent!"
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <a href="#collection" className={cn(buttonVariants({ size: "lg" }), "group h-10 rounded-full px-5")}>
                Enter the collection
                <ArrowRight className="transition-transform duration-500 ease-(--ease-gallery) group-hover:translate-x-0.5" />
              </a>
              <a href="#contact" onClick={(event) => { event.preventDefault(); requestEnquiry("A commission"); }} className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "h-10 rounded-full px-5")}>
                Commission a work
              </a>
            </div>
          }
        />
      </FadeUp>
    </section>
  );
}
