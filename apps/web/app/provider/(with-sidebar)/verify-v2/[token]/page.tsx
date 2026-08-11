export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProviderByToken } from "@/lib/provider-tokens";
import { ProviderPickerV2, ServiceItem } from "@/app/admin/providers/verify/_components/provider-picker-v2";
import { getApiBaseUrl } from "@/lib/config";
import { ShieldCheck } from "lucide-react";

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const provider = getProviderByToken(token);
  if (!provider) {
    return { title: "Invalid Link" };
  }
  return {
    title: `${provider.name} — Working Services Picker (V2)`,
    description: `Pick and verify working services for ${provider.name}.`,
    robots: { index: false, follow: false },
  };
}

async function getServices(): Promise<ServiceItem[]> {
  try {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/services?all=true`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch services");
    const data = await res.json();
    return data.services || [];
  } catch (error) {
    console.error("Provider portal v2: backend fetch error:", error);
    return [];
  }
}

export default async function ProviderPortalV2Page({ params }: PageProps) {
  const { token } = await params;
  const provider = getProviderByToken(token);

  if (!provider) {
    return <InvalidTokenPage />;
  }

  const allServices = await getServices();

  // Filter services for this provider
  const providerServices = allServices.filter((s: any) => {
    const sProvider = (
      s.source ||
      s.providerKey ||
      (s.id && s.id.includes(":") ? s.id.split(":")[0] : "topsmm")
    ).toLowerCase();

    return sProvider === provider.key.toLowerCase();
  });

  return (
    <div className="flex-1 w-full min-h-screen bg-background">
      <ProviderPickerV2
        initialServices={providerServices}
        providerName={provider.name}
      />
    </div>
  );
}

function InvalidTokenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="flex justify-center">
          <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20">
            <ShieldCheck className="w-10 h-10 text-destructive" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Invalid or Expired Link</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This verification link is invalid or has expired. Please contact your account manager for a fresh link.
          </p>
        </div>
      </div>
    </div>
  );
}
