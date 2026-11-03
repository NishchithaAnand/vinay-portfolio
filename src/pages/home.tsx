import { ArrowRight } from "lucide-react";
import { About } from "@/components/site/about";
import { Collection } from "@/components/site/collection";
import { Contact } from "@/components/site/contact";
import { Featured } from "@/components/site/featured";
import { Hero } from "@/components/site/hero";
import { Intro } from "@/components/site/intro";
import { artworks, selectedIds, worksById } from "@/content/artworks";
import { useSmoothScroll } from "@/lib/smooth-scroll";

const selected = worksById(selectedIds);

/** The home page stays curated: recent works on the hero wall, his strongest pieces below; the rest is on /works/. */
export function HomePage() {
  useSmoothScroll();
  return (
    <>
      <Intro />
      <Hero />
      <Collection
        id="collection"
        title="Selected works"
        works={selected}
        layout="spread"
        action={
          <a href="/works/" className="group inline-flex h-11 items-center gap-2 rounded-full border border-border px-6 text-sm font-medium outline-none transition-colors duration-300 hover:border-foreground/40 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none">
            Explore all {artworks.length} works
            <ArrowRight className="size-4 transition-transform duration-500 ease-(--ease-gallery) group-hover:translate-x-0.5" />
          </a>
        }
      />
      <About />
      <Featured />
      {/* Hands, reaching: fitting for a note to the artist. */}
      <Contact paintingId="hands" />
    </>
  );
}
