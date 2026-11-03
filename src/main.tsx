import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { SiteLayout } from "@/components/site/site-layout";
import { HomePage } from "@/pages/home";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SiteLayout>
      <HomePage />
    </SiteLayout>
  </StrictMode>,
);
