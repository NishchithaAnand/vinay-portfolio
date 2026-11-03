/**
 * The About section: a heading, one short paragraph, and his portrait. The paragraph is written from confirmed facts
 * only (an independent artist who works across styles) and should be replaced with Vinay's own words.
 */
export const about = {
  heading: "The man behind every stroke",
  // PLACEHOLDER: replace with Vinay's own words. Keep it to about four lines (40–50 words).
  paragraph:
    "An independent artist, Vinay moves freely between styles and subjects: from a leopard stepping out of the dark to an old hand holding a young one, every piece built one patient stroke at a time.",
  /** From images/about/vinay.jpg via `npm run images`. Set to null to fall back to the stand-in drawing. */
  portrait: { image: "/about/vinay.jpg", avif: "/about/vinay.avif" } as { image: string; avif?: string } | null,
  standIn: { image: "/art/hands.jpg", avif: "/art/hands.avif", alt: "Hands, a drawing by Vinay" },
  /**
   * The opening screen's picture: Vinay at his desk, drawing. A frame from his reel "Pursuit of Happiness" (Instagram,
   * 26 Jul 2023), enhanced from 409 px (denoised, enlarged 2×, sharpened). Shown in black and white. A full-resolution
   * photo of him at work would be sharper.
   */
  introPortrait: { image: "/about/vinay-drawing.jpg", avif: "/about/vinay-drawing.avif", alt: "Vinay at his desk, drawing" },
  /** A square crop of the same photo around his face, for the circle set into his name on the home page. */
  introFace: { image: "/about/vinay-face.jpg", avif: "/about/vinay-face.avif", alt: "Vinay" },
  caption: "Vinay",
} as const;
