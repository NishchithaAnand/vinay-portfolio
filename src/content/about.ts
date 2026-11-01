/**
 * The About section: a heading, one short paragraph, and his portrait. The paragraph is written from confirmed facts
 * only (independent, Bengaluru to Montréal, works across styles) and should be replaced with Vinay's own words.
 */
export const about = {
  heading: "The man behind every stroke",
  // PLACEHOLDER: replace with Vinay's own words. Keep it to about four lines (40–50 words).
  paragraph:
    "An independent artist from Bengaluru, now working in Montréal. He moves freely between styles and subjects, from a leopard stepping out of the dark to an old hand holding a young one, building every piece one patient stroke at a time.",
  /** From images/about/vinay.jpg via `npm run images`. Set to null to fall back to the stand-in drawing. */
  portrait: { image: "/about/vinay.jpg", avif: "/about/vinay.avif" } as { image: string; avif?: string } | null,
  standIn: { image: "/art/hands.jpg", avif: "/art/hands.avif", alt: "Hands, a drawing by Vinay" },
  caption: "Vinay · Montréal",
} as const;
