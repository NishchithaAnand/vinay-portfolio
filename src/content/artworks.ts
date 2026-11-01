import type { PictureRailItem } from "@/components/ui/picture-rail-gallery";
import { site } from "@/content/site";

/** Collection filters, in the order they are offered. Only subjects with at least one work appear. */
export const subjects = ["Wildlife", "Cityscapes", "Portraits", "Hands", "Studies"] as const;
export type Subject = (typeof subjects)[number];

export interface Artwork extends PictureRailItem {
  slug: string;
  subject: Subject;
  status?: "available" | "sold" | "on-request";
}

/**
 * Vinay's works, from instagram.com/vin.gowda (640 px; swap in full-resolution files when available). Originals live in
 * images/art/; `npm run images` writes the .avif and .jpg the site serves into public/art/.
 * Keep `aspect` equal to the photo's width ÷ height so the frame fits the work, not the other way round.
 * `dimensions` is the real size of the work (the image, not the frame); the detail view draws it as measured lines.
 *
 * DUMMY DATA: titles, prices, mediums, years, sizes and most descriptions below are stand-ins for Vinay to replace
 * (each description says whether it is his words or a stand-in). A description reads best at two to three lines.
 */
const works: Artwork[] = [
  {
    // From a photo of the framed piece, straightened and cropped to the canvas. Year and signature are real (lower right, '26).
    id: "starry-night-montreal", slug: "starry-night-montreal", subject: "Cityscapes", title: "Starry Night over Montréal",
    image: "/art/starry-night-montreal.jpg", imageAvif: "/art/starry-night-montreal.avif", aspect: 2400 / 1689, frame: "oak", mat: true,
    price: "$4,800 CAD", medium: "Acrylic on canvas", year: "2026", dimensions: { width: 90, height: 63.3 }, status: "available",
    description: "Van Gogh's sky turned over Montréal: the stars swirl above Mont Royal and its cross, and below them the city keeps its lights on. Every window, tree and wave of sky is built from short, separate strokes.", // dummy, for Vinay to replace
    callouts: [{ label: "Acrylic on canvas", on: "surface" }, { label: "Carved wooden frame", on: "frame" }, { label: "Signed lower right, '26", on: "corner" }],
  },
  {
    id: "lioness", slug: "lioness", subject: "Wildlife", title: "Lioness", image: "/art/lioness.jpg", imageAvif: "/art/lioness.avif", aspect: 543 / 640, frame: "white", mat: true, drop: 0.04,
    price: "$1,200 CAD", medium: "Graphite on paper", year: "2020", dimensions: { width: 42, height: 49.5 }, status: "available",
    description: "A lioness bends to drink at the water's edge, and the water bends her back. Drawn almost entirely in greys, it rests on the stillness between her and her reflection.", // dummy, for Vinay to replace
    callouts: [{ label: "Graphite on paper", on: "surface" }, { label: "Bevel-cut mat", on: "mat" }, { label: "Signed lower right", on: "corner" }],
  },
  {
    id: "leopard", slug: "leopard", subject: "Wildlife", title: "Leopard", image: "/art/leopard.jpg", imageAvif: "/art/leopard.avif", aspect: 490 / 640, frame: "black", mat: true,
    price: "$1,400 CAD", medium: "White charcoal on black paper", year: "2026", dimensions: { width: 46, height: 60 }, status: "available",
    description: "Poised. Each step in the dark is paid for in patience.", // his own words, from the Instagram caption
    callouts: [{ label: "White charcoal on black paper", on: "surface" }, { label: "Bevel-cut mat", on: "mat" }, { label: "Signed lower right", on: "corner" }],
  },
  {
    id: "cupped-hands", slug: "cupped-hands", subject: "Hands", title: "Cupped Hands", image: "/art/cupped-hands.jpg", imageAvif: "/art/cupped-hands.avif", aspect: 640 / 524, frame: "black",
    price: "$950 CAD", medium: "Charcoal on black paper", year: "2021", dimensions: { width: 61, height: 50 }, status: "sold",
    description: "Two hands hold water that will not stay. The light lives in the drops falling through the fingers, worked out of black paper one highlight at a time.", // dummy, for Vinay to replace
    callouts: [{ label: "Charcoal on black paper", on: "surface" }, { label: "Black wood frame", on: "frame" }, { label: "Signed lower right", on: "corner" }],
  },
  {
    id: "elephant", slug: "elephant", subject: "Wildlife", title: "Elephant", image: "/art/elephant.jpg", imageAvif: "/art/elephant.avif", aspect: 502 / 640, frame: "oak", drop: 0.02,
    price: "$1,600 CAD", medium: "Acrylic on canvas", year: "2026", dimensions: { width: 47, height: 60, depth: 2 }, status: "available",
    description: "Unhurried. He has nowhere else he needs to be. A mountain of grace, moving to a rhythm entirely his own.", // his own words, from the Instagram caption
    callouts: [{ label: "Acrylic on canvas", on: "surface" }, { label: "Natural oak frame", on: "frame" }, { label: "Signed lower right", on: "corner" }],
  },
  {
    id: "hands", slug: "hands", subject: "Hands", title: "Hands", image: "/art/hands.jpg", imageAvif: "/art/hands.avif", aspect: 515 / 640, frame: "black", mat: true, drop: 0.06,
    price: "$900 CAD", medium: "Charcoal on black paper", year: "2021", dimensions: { width: 40, height: 50 }, status: "on-request",
    description: "An old hand rests in a young one. Every crease and knuckle is drawn out of the dark, so the two read as one gesture passed between generations.", // dummy, for Vinay to replace
    callouts: [{ label: "Charcoal on black paper", on: "surface" }, { label: "Bevel-cut mat", on: "mat" }, { label: "Signed lower right", on: "corner" }],
  },
];

/** The featured section shows these in order, one full screen at a time. His best work first. */
export const featuredIds = ["starry-night-montreal"];

const statusTag = { available: "Available", sold: "Sold", "on-request": "On request" } as const;

export const artworks: Artwork[] = works.map((work) => ({
  ...work,
  artist: site.name,
  tag: work.status ? statusTag[work.status] : undefined,
}));
