import { MotionConfig } from "motion/react";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { ThemeProvider } from "@/components/theme/theme-provider";

/** What every page shares: theme, motion settings, header and footer. */
export function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </MotionConfig>
    </ThemeProvider>
  );
}
