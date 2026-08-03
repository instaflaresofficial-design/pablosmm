export const dynamic = 'force-dynamic';

import { ProviderMappingAudit, ServiceItem } from "./_components/provider-mapping-audit";
import { getApiBaseUrl } from "@/lib/config";

async function getServices(): Promise<ServiceItem[]> {
  try {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/admin/services`, {
      cache: 'no-store',
    });

    if (!res.ok) throw new Error("Failed to fetch services");
    const data = await res.json();
    return data.services || [];
  } catch (error) {
    console.error("Backend fetch error:", error);
    return [];
  }
}

export default async function ProviderMappingPage() {
  const services = await getServices();

  return (
    <div className="flex-1 w-full min-h-screen">
      <ProviderMappingAudit initialServices={services} />
    </div>
  );
}
