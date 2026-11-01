import type { ArtworkDetailLabels } from "@/components/ui/artwork-detail";
import type { PictureRailItem } from "@/components/ui/picture-frame";
import { site } from "@/content/site";

/** Words used by every artwork detail view on the site (hero wall, collection, featured). */
export const detailLabels: ArtworkDetailLabels = {
  close: "Close",
  enquire: "Enquire about this work",
  onRequest: "Price on request",
  medium: "Medium",
  size: "Size",
  depth: "Depth",
  year: "Year",
  lookCloser: "Hover the work to look closer · scroll to zoom",
  lookCloserTouch: "Touch and drag the work to look closer",
};

/** A plain email link, for places without the contact form. */
export function enquireHref(work: PictureRailItem) {
  return `mailto:${site.email}?subject=${encodeURIComponent(`Enquiry: ${work.title}`)}`;
}

/*
 * Anywhere on the page can send a visitor to the contact form with the subject filled in: "Enquire about this work"
 * in a detail view, "Commission a work" in the hero. The form listens, takes the topic, and scrolls itself into view.
 */
const EVENT = "vinay:enquire";

export function requestEnquiry(topic: string) {
  window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: topic }));
}

/** For the detail views: enquire about the work that is open. */
export function enquireAbout(work: PictureRailItem) {
  requestEnquiry(work.title);
}

export function onEnquiryRequest(handler: (topic: string) => void) {
  const listener = (event: Event) => handler((event as CustomEvent<string>).detail);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
