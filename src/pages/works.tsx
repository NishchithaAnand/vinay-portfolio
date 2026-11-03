import { Collection } from "@/components/site/collection";
import { Contact } from "@/components/site/contact";
import { artworks, subjects } from "@/content/artworks";

const categories = subjects.filter((s) => artworks.some((work) => work.subject === s)).length;

/** Every work, to browse by category, newest first by default. */
export function WorksPage() {
  return (
    <>
      <Collection
        id="works"
        title="All works"
        headingLevel="h1"
        works={artworks}
        browse
        layout="editorial"
        intro={<p>{artworks.length} works across {categories} categories, from wildlife to portraits. Open any piece for its story, size and price.</p>}
      />
      <Contact />
    </>
  );
}
