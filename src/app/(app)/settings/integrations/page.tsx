import type { Metadata } from "next";
import { IntegrationsList } from "@/components/settings/IntegrationsList";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Integrations" };

export default function IntegrationsPage() {
  return <IntegrationsList base={site.url} />;
}
