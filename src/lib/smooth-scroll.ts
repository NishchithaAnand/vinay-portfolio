import * as React from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

let lenis: Lenis | null = null;

/**
 * Gliding scroll for the page it is used on (Lenis): wheel and trackpad ease to a stop instead of stepping. Pinned
 * sections and scroll-linked motion keep working, since Lenis moves the real page scroll. Anything marked
 * data-lenis-prevent (the artwork detail view, the phone menu) scrolls on its own. Off for reduced motion.
 */
export function useSmoothScroll() {
  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const instance = new Lenis({ autoRaf: true, lerp: 0.09 });
    lenis = instance;

    // Links to a section of this page ("#contact", "/#about") glide there too.
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as HTMLElement | null)?.closest("a[href*='#']");
      if (!(link instanceof HTMLAnchorElement)) return;
      const url = new URL(link.href);
      if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;
      const target = url.hash === "#top" ? 0 : document.querySelector<HTMLElement>(decodeURIComponent(url.hash));
      if (target === null) return;
      event.preventDefault();
      instance.scrollTo(target);
      history.pushState(null, "", url.hash);
    };
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      instance.destroy();
      if (lenis === instance) lenis = null;
    };
  }, []);
}

/** Bring an element to the top of the screen: gliding with Lenis when it is on, the browser's smooth scroll otherwise. */
export function glideTo(element: HTMLElement) {
  if (lenis) lenis.scrollTo(element);
  else element.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}
