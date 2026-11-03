import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { SiteLayout } from "@/components/site/site-layout";
import { WorksPage } from "@/pages/works";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SiteLayout>
      <WorksPage />
    </SiteLayout>
  </StrictMode>,
);
