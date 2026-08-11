export const dynamic = 'force-dynamic';

import { getApiBaseUrl } from "@/lib/config";
import { ServiceItem } from "@/app/admin/providers/verify/_components/provider-picker-v3";
import { ProviderMappingV2Wrapper } from "./_components/provider-mapping-v2-wrapper";

async function getServices(): Promise<ServiceItem[]> {
  try {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/services?all=true`, {
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

export default async function ProviderMappingV2Page() {
  const services = await getServices();

  return (
    <div className="flex-1 w-full h-full min-h-[calc(100vh-4rem)] flex flex-col bg-[#F7F8F9]">
      <ProviderMappingV2Wrapper allServices={services} />
    </div>
  );
}
