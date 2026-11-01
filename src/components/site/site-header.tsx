import * as React from "react";
import { Menu, Moon, Sun, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useTheme } from "@/components/theme/theme-provider";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";

function ThemeToggle() {
  const { resolved, setTheme } = useTheme();
  const next = resolved === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={next === "dark" ? "Switch to night gallery" : "Switch to day gallery"}
      className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative rounded-full")}
    >
      <Sun className="size-4 rotate-0 scale-100 transition-transform duration-500 ease-(--ease-gallery) dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-4 rotate-90 scale-0 transition-transform duration-500 ease-(--ease-gallery) dark:rotate-0 dark:scale-100" />
    </button>
  );
}

/**
 * Phone menu: a panel slides in from the left and the links arrive one after another, 0.1s apart, each rule drawing
 * in just after its link. Plain CSS transitions, so closing simply slides the panel away instead of unwinding the stagger.
 */
function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panel = React.useRef<HTMLElement>(null);
  const links = site.nav;

  React.useEffect(() => {
    if (open) panel.current?.querySelector<HTMLElement>("[data-menu-link]")?.focus({ preventScroll: true });
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <aside
      ref={panel}
      id="site-menu"
      aria-label="Menu"
      data-open={open || undefined}
      inert={!open}
      className="group/menu invisible fixed inset-0 z-50 flex -translate-x-[102%] flex-col bg-background/95 px-5 pb-8 backdrop-blur-md transition-[translate,visibility] duration-[850ms] ease-(--ease-lift) will-change-[translate] data-open:visible data-open:translate-x-0 md:hidden motion-reduce:transition-none"
    >
      <div className="flex h-14 items-center justify-between sm:h-16">
        <a href="#top" onClick={onClose} className="display-italic font-display text-xl tracking-tight">{site.name}</a>
        <button type="button" aria-label="Close menu" onClick={onClose} className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "rounded-full")}>
          <X className="size-4" />
        </button>
      </div>

      <nav aria-label="Mobile" className="my-auto text-right">
        <ul>
          {links.map((item, i) => (
            <li
              key={item.href}
              style={{ "--d": `${0.1 + i * 0.1}s` } as React.CSSProperties}
              className="relative -translate-x-10 py-2 opacity-0 transition-[opacity,translate] duration-700 ease-(--ease-lift) group-data-open/menu:translate-x-0 group-data-open/menu:opacity-100 group-data-open/menu:delay-(--d) motion-reduce:transition-none"
            >
              <a data-menu-link href={item.href} onClick={onClose} className="block text-menu font-semibold text-muted-foreground outline-none transition-colors duration-300 hover:text-foreground focus-visible:text-foreground">
                {item.label}
              </a>
              {/* The rule under each link draws in from the left, after its link. */}
              <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-border transition-transform duration-800 ease-(--ease-lift) group-data-open/menu:scale-x-100 group-data-open/menu:delay-[calc(var(--d)+0.15s)] motion-reduce:transition-none" />
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex items-center justify-between gap-4">
        <span className="flex gap-4">
          {site.socials.map((social) => (
            <a key={social.href} href={social.href} target="_blank" rel="noreferrer" className="label link-draw pb-0.5 text-muted-foreground hover:text-foreground">{social.label}</a>
          ))}
        </span>
        <span className="label text-muted-foreground">{site.city} · {site.region}</span>
      </div>
    </aside>
  );
}

export function SiteHeader() {
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const close = React.useCallback(() => setOpen(false), []);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
    <header className={cn("fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500", scrolled ? "border-b border-border/60 bg-background/70 backdrop-blur-md" : "border-b border-transparent")}>
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-6 px-5 sm:h-16 sm:px-8">
        <a href="#top" className="display-italic font-display text-xl tracking-tight sm:text-2xl">
          {site.name}
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-9 md:flex">
          {site.nav.map((item) => (
            <a key={item.href} href={item.href} className="link-draw pb-0.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <a href="#contact" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "hidden rounded-full px-4 sm:inline-flex")}>
            Enquire
          </a>
          <button type="button" aria-label="Open menu" aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen(true)} className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "rounded-full md:hidden")}>
            <Menu className="size-4" />
          </button>
        </div>
      </div>
    </header>
    {/* Outside the header: its backdrop blur would otherwise trap this fixed panel inside the header bar. */}
    <MobileMenu open={open} onClose={close} />
    </>
  );
}
