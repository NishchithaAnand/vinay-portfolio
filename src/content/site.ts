/** Everything that identifies the artist lives here, so the copy can change without touching components. */
export const site = {
  name: "Vinay",
  role: "Artist",
  city: "Montréal",
  region: "Québec, Canada",
  /** Add more as { label, handle, href }; the about title and the phone menu list them all. */
  socials: [{ label: "Instagram", handle: "@vin.gowda", href: "https://www.instagram.com/vin.gowda/" }],
  // Placeholder until the real address is confirmed.
  email: "hello@example.com",
  /**
   * Where the contact form posts (JSON: name, email, message, topic). Any form service that accepts JSON works, e.g. a
   * Formspree form URL "https://formspree.io/f/xxxxxxx". Until it is set, "Send inquiry" opens the visitor's email app
   * with the message written out to `email`.
   */
  formEndpoint: null as string | null,
  nav: [
    { label: "Works", href: "#collection" },
    { label: "About", href: "#about" },
    { label: "Featured", href: "#featured" },
    { label: "Contact", href: "#contact" },
  ],
} as const;
