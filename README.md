# Vinay — artist portfolio

Portfolio site for Vinay, an independent artist in Montréal. React 19, TypeScript, Vite, Tailwind CSS v4 (shadcn structure), Motion and Three.js.

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check and build to dist/
npm run images   # regenerate the web images from images/ (see below)
```

## Where things live

| What | File |
| --- | --- |
| Artist name, links, email, contact form endpoint | `src/content/site.ts` |
| Artworks (title, price, medium, size, description, notes) and the featured list | `src/content/artworks.ts` |
| About section text and portrait | `src/content/about.ts` |
| Design tokens (colours, type, spacing) | `src/index.css` |

Several artwork details are still **dummy data** for Vinay to replace; they are marked in `src/content/artworks.ts`.

## Images

Originals go in `images/` (never deployed): `images/art/` for artworks, `images/about/` for the portrait. `npm run images` writes an AVIF plus a JPEG fallback for each into `public/`, at quality settings checked by eye under the detail-view lens.

## Contact form

Until `formEndpoint` in `src/content/site.ts` is set to a form service URL (e.g. Formspree), "Send inquiry" opens the visitor's email app with the message written out.
