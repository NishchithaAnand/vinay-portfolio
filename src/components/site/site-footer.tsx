import { Reveal, RevealHeading, Stagger, StaggerItem } from "@/components/motion/reveal";
import { site } from "@/content/site";

const year = new Date().getFullYear();

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <StaggerItem>
      <p className="label text-muted-foreground">{title}</p>
      <ul className="mt-4 space-y-2.5 text-sm">{children}</ul>
    </StaggerItem>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-[1440px] px-5 pt-section sm:px-8">
      <div className="grid gap-12 border-t border-border pt-12 lg:grid-cols-12 lg:pt-16">
        <div className="lg:col-span-6">
          <a href="/" aria-label={`${site.name}, home`} className="display-italic font-display text-[clamp(3.5rem,2rem+6vw,7.5rem)] leading-[0.9] tracking-[-0.035em]">
            <RevealHeading as="span" text={site.name} by="letter" />
          </a>
          <Reveal delay={0.3} y={12}>
            <p className="mt-5 max-w-xs text-sm text-muted-foreground">Independent artist in {site.city}, working across mediums and styles.</p>
          </Reveal>
        </div>

        <Stagger as="nav" label="Footer" delay={0.15} className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-6">
          <Column title="Explore">
            {site.nav.map((item) => (
              <li key={item.href}><a href={item.href} className="link-draw pb-0.5">{item.label}</a></li>
            ))}
          </Column>
          <Column title="Follow">
            {site.socials.map((social) => (
              <li key={social.href}>
                <a href={social.href} target="_blank" rel="noreferrer" className="link-draw pb-0.5">{social.label}</a>
                <span className="mt-0.5 block text-[13px] text-muted-foreground">{social.handle}</span>
              </li>
            ))}
          </Column>
          <Column title="Write">
            <li><a href={`mailto:${site.email}`} className="link-draw break-all pb-0.5">{site.email}</a></li>
            <li className="text-muted-foreground">{site.city}, {site.region}</li>
          </Column>
        </Stagger>
      </div>

      <Reveal delay={0.2} y={8} className="mt-16 flex flex-col gap-4 border-t border-border py-6 text-[13px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© {year} {site.name}. All artwork © {site.name}; please ask before reproducing.</p>
        <a href="#top" className="group inline-flex items-center gap-2 transition-colors hover:text-foreground">
          Back to top
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 14 14" className="transition-transform duration-300 group-hover:-translate-y-0.5 motion-reduce:transition-none"><path d="M7 12V2M3 6l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </a>
      </Reveal>
    </footer>
  );
}
