import type { PictureRailItem } from "@/components/ui/picture-rail-gallery";
import imageSizes from "@/content/images.json";
import { site } from "@/content/site";

/** Categories, in the order the filters offer them. Only categories with at least one work appear. */
export const subjects = ["Wildlife", "Portraits", "Hands & Figures", "Studies", "Cityscapes"] as const;
export type Subject = (typeof subjects)[number];

export interface Artwork extends PictureRailItem {
  slug: string;
  subject: Subject;
  status?: "available" | "sold" | "on-request";
  /** When it was first shown (the Instagram post date), for "newest first". Falls back to `year`. */
  date?: string;
}

/**
 * Files and proportions for a work, from images/art/<key>.jpg. `npm run images` writes the served files and
 * src/content/images.json (real pixel sizes), so aspect ratios never need typing in by hand.
 */
function art(key: string) {
  const info = (imageSizes as Record<string, { width: number; height: number; small?: number; thumb?: number }>)[`art/${key}`];
  if (!info) throw new Error(`No image for art/${key}: add images/art/${key}.jpg and run npm run images`);
  return {
    image: `/art/${key}.jpg`,
    imageAvif: `/art/${key}.avif`,
    imageWidth: info.width,
    imageSmall: info.small ? { width: info.small, avif: `/art/${key}-sm.avif`, jpg: `/art/${key}-sm.jpg` } : undefined,
    imageThumb: info.thumb ? { width: info.thumb, avif: `/art/${key}-th.avif`, jpg: `/art/${key}-th.jpg` } : undefined,
    aspect: info.width / info.height,
  };
}

/**
 * Every work. Images are from instagram.com/vin.gowda; swap in full-resolution scans when available (same file name in
 * images/art/, then npm run images). `frame`, `mat` and `drop` only style the hero wall.
 *
 * DUMMY DATA, for Vinay to replace: on the first six works, the prices, mediums, sizes, statuses and the descriptions
 * marked "dummy". The fifteen added from Instagram carry only what their posts state: title (from the caption where it
 * names one, otherwise descriptive), year and date (post date), medium where a hashtag names it, and his own caption
 * lines as descriptions. Their prices and sizes are not known yet, so they show "Price on request".
 */
const works: Artwork[] = [
  {
    // From a photo of the framed piece, straightened and cropped to the canvas. Year and signature are real (lower right, '26).
    id: "starry-night-montreal", slug: "starry-night-montreal", subject: "Cityscapes", title: "Starry Night over Montréal", ...art("starry-night-montreal"), frame: "oak", mat: true,
    price: "$4,800 CAD", medium: "Acrylic on canvas", year: "2026", dimensions: { width: 90, height: 63.3 }, status: "available",
    description: "Van Gogh's sky turned over Montréal: the stars swirl above Mont Royal and its cross, and below them the city keeps its lights on. Every window, tree and wave of sky is built from short, separate strokes.", // dummy, for Vinay to replace
    callouts: [{ label: "Acrylic on canvas", on: "surface" }, { label: "Carved wooden frame", on: "frame" }, { label: "Signed lower right, '26", on: "corner" }],
  },
  {
    id: "leopard", slug: "leopard", subject: "Wildlife", title: "Leopard", ...art("leopard"), frame: "black", mat: true, date: "2026-09-19",
    price: "$1,400 CAD", medium: "White charcoal on black paper", year: "2026", dimensions: { width: 46, height: 60 }, status: "available",
    description: "Poised. Each step in the dark is paid for in patience.", // his own words, from the Instagram caption
    callouts: [{ label: "White charcoal on black paper", on: "surface" }, { label: "Bevel-cut mat", on: "mat" }, { label: "Signed lower right", on: "corner" }],
  },
  {
    id: "elephant", slug: "elephant", subject: "Wildlife", title: "Elephant", ...art("elephant"), frame: "oak", drop: 0.02, date: "2026-08-22",
    price: "$1,600 CAD", medium: "Acrylic on canvas", year: "2026", dimensions: { width: 47, height: 60, depth: 2 }, status: "available",
    description: "Unhurried. He has nowhere else he needs to be. A mountain of grace, moving to a rhythm entirely his own.", // his own words, from the Instagram caption
    callouts: [{ label: "Acrylic on canvas", on: "surface" }, { label: "Natural oak frame", on: "frame" }, { label: "Signed lower right", on: "corner" }],
  },
  {
    id: "hands", slug: "hands", subject: "Hands & Figures", title: "Hands", ...art("hands"), frame: "black", mat: true, drop: 0.06, date: "2021-05-18",
    price: "$900 CAD", medium: "Charcoal on black paper", year: "2021", dimensions: { width: 40, height: 50 }, status: "on-request",
    description: "An old hand rests in a young one. Every crease and knuckle is drawn out of the dark, so the two read as one gesture passed between generations.", // dummy, for Vinay to replace
    callouts: [{ label: "Charcoal on black paper", on: "surface" }, { label: "Bevel-cut mat", on: "mat" }, { label: "Signed lower right", on: "corner" }],
  },
  {
    id: "cupped-hands", slug: "cupped-hands", subject: "Hands & Figures", title: "Cupped Hands", ...art("cupped-hands"), frame: "black", date: "2021-01-13",
    price: "$950 CAD", medium: "Charcoal on black paper", year: "2021", dimensions: { width: 61, height: 50 }, status: "sold",
    description: "Two hands hold water that will not stay. The light lives in the drops falling through the fingers, worked out of black paper one highlight at a time.", // dummy, for Vinay to replace
    callouts: [{ label: "Charcoal on black paper", on: "surface" }, { label: "Black wood frame", on: "frame" }, { label: "Signed lower right", on: "corner" }],
  },
  { id: "wild-horses", slug: "wild-horses", subject: "Wildlife", title: "Wild Horses", ...art("wild-horses"), frame: "black", year: "2020", date: "2020-10-11" },
  {
    id: "lioness", slug: "lioness", subject: "Wildlife", title: "Lioness", ...art("lioness"), frame: "white", mat: true, drop: 0.04, date: "2020-08-16",
    price: "$1,200 CAD", medium: "Graphite on paper", year: "2020", dimensions: { width: 42, height: 49.5 }, status: "available",
    description: "A lioness bends to drink at the water's edge, and the water bends her back. Drawn almost entirely in greys, it rests on the stillness between her and her reflection.", // dummy, for Vinay to replace
    callouts: [{ label: "Graphite on paper", on: "surface" }, { label: "Bevel-cut mat", on: "mat" }, { label: "Signed lower right", on: "corner" }],
  },
  { id: "the-king", slug: "the-king", subject: "Wildlife", title: "The King", ...art("the-king"), frame: "oak", year: "2020", date: "2020-07-12" },
  { id: "eye-of-the-tiger", slug: "eye-of-the-tiger", subject: "Wildlife", title: "Eye of the Tiger", ...art("eye-of-the-tiger"), year: "2020", date: "2020-06-28" },
  {
    id: "african-elephant", slug: "african-elephant", subject: "Wildlife", title: "African Elephant", ...art("african-elephant"), year: "2020", date: "2020-06-17",
    description: "From Hindu mythology to the great grasslands of Africa, Elephants are revered for their poise, elegance and their intellect.", // his own words, from the Instagram caption
  },
  { id: "wild-tangled-forest", slug: "wild-tangled-forest", subject: "Portraits", title: "A Wild, Tangled Forest", ...art("wild-tangled-forest"), year: "2020", date: "2020-05-20" },
  { id: "daughters", slug: "daughters", subject: "Portraits", title: "Daughters", ...art("daughters"), medium: "Charcoal", year: "2020", date: "2020-05-10" },
  {
    id: "powerful-beyond-measure", slug: "powerful-beyond-measure", subject: "Portraits", title: "Powerful Beyond Measure", ...art("powerful-beyond-measure"), medium: "Charcoal", year: "2020", date: "2020-04-25",
    description: "A girl with a sea of curls holds a stack of books close, as if they were armour. Every strand of hair and every page edge is drawn in charcoal, and her steady gaze carries the title.", // dummy, for Vinay to replace
  },
  {
    id: "eye-for-detail", slug: "eye-for-detail", subject: "Studies", title: "An Eye for Detail", ...art("eye-for-detail"), year: "2020", date: "2020-04-16",
    description: "An eye for detail.", // his own words, from the Instagram caption
  },
  {
    id: "eagle", slug: "eagle", subject: "Wildlife", title: "Eagle", ...art("eagle"), year: "2020", date: "2020-03-24",
    description: "An eagle earns its honor from the storms it endures.", // his own words, from the Instagram caption
  },
  {
    id: "single-mothers", slug: "single-mothers", subject: "Hands & Figures", title: "An Ode to Single Mothers", ...art("single-mothers"), year: "2020", date: "2020-02-24",
    description: "An ode to all the incredible single mothers out there.", // his own words, from the Instagram caption
  },
  { id: "simple-faith", slug: "simple-faith", subject: "Portraits", title: "Simple Faith", ...art("simple-faith"), medium: "Charcoal", year: "2020", date: "2020-01-14" },
  { id: "my-truth", slug: "my-truth", subject: "Portraits", title: "My Truth", ...art("my-truth"), year: "2020", date: "2020-01-07" },
  { id: "timeless", slug: "timeless", subject: "Portraits", title: "Timeless", ...art("timeless"), medium: "Charcoal", year: "2019", date: "2019-08-23" },
  { id: "smile", slug: "smile", subject: "Portraits", title: "Smile", ...art("smile"), year: "2019", date: "2019-05-09" },
  {
    id: "to-life", slug: "to-life", subject: "Portraits", title: "To Life", ...art("to-life"), year: "2019", date: "2019-01-13",
    description: "To life! Behind weathered hands, an old face peeks out with a child's mischief still in its eyes: a reminder that wonder doesn't have to grow old.", // "To life!" is his caption; the rest is a dummy for Vinay to replace
  },
];

/**
 * Home page, hero wall: six recent works, newest first. The wall fits them side by side, so every work added makes all
 * the frames smaller; six keeps them large. The rest live on the works page.
 */
export const recentIds = ["starry-night-montreal", "leopard", "elephant", "hands", "cupped-hands", "wild-horses"];
/** Home page, "Selected works": his strongest pieces. Everything else waits on the works page. */
export const selectedIds = ["the-king", "eye-of-the-tiger", "wild-tangled-forest", "lioness", "my-truth", "eagle"];
/** Works page: works that always share one row, side by side at the same height, whatever the filter or order. */
export const hangTogether = [["the-king", "eye-of-the-tiger", "african-elephant"]];
/** The featured section shows these in order, one at a time. His best work first. */
export const featuredIds = ["starry-night-montreal"];

const statusTag = { available: "Available", sold: "Sold", "on-request": "On request" } as const;

export const artworks: Artwork[] = works.map((work) => ({
  ...work,
  artist: site.name,
  tag: work.status ? statusTag[work.status] : undefined,
}));

export function worksById(ids: string[]) {
  return ids.map((id) => artworks.find((work) => work.id === id)).filter((work): work is Artwork => Boolean(work));
}

/** Sortable date: the post date, else the end of its year (so a year-only work counts as that year's latest). */
export const whenOf = (work: Artwork) => work.date ?? (work.year ? `${work.year}-12-31` : "");
