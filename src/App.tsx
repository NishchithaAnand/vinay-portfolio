import { MotionConfig } from "motion/react";
import { About } from "@/components/site/about";
import { Collection } from "@/components/site/collection";
import { Contact } from "@/components/site/contact";
import { Featured } from "@/components/site/featured";
import { Hero } from "@/components/site/hero";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { ThemeProvider } from "@/components/theme/theme-provider";

export default function App() {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <SiteHeader />
        <main>
          <Hero />
          <Collection />
          <About />
          <Featured />
          <Contact />
        </main>
        <SiteFooter />
      </MotionConfig>
    </ThemeProvider>
  );
}
