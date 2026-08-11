"use client";

import * as React from "react";
import { ProviderPickerV3, ServiceItem } from "@/app/admin/providers/verify/_components/provider-picker-v3";
import { apiClient } from "@/lib/apiClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select";
import { Server } from "lucide-react";

export interface SmmProvider {
  id: number;
  key: string;
  name: string;
  api_url: string;
  api_key: string;
  currency: string;
  is_active: boolean;
}

export function ProviderMappingV2Wrapper({ allServices }: { allServices: ServiceItem[] }) {
  const [providers, setProviders] = React.useState<SmmProvider[]>([]);
  const [selectedProviderKey, setSelectedProviderKey] = React.useState<string>("");

  React.useEffect(() => {
    async function loadProviders() {
      try {
        const data = await apiClient.get<SmmProvider[]>("/admin/providers");
        if (data && data.length > 0) {
          setProviders(data);
          setSelectedProviderKey(data[0].key);
        }
      } catch (err) {
        console.error("Failed to load providers", err);
      }
    }
    loadProviders();
  }, []);

  const providerServices = React.useMemo(() => {
    if (!selectedProviderKey) return [];
    return allServices.filter((s: any) => {
      const sProvider = (
        s.source ||
        s.providerKey ||
        (s.id && s.id.includes(":") ? s.id.split(":")[0] : "topsmm")
      ).toLowerCase();

      return sProvider === selectedProviderKey.toLowerCase();
    });
  }, [allServices, selectedProviderKey]);

  const selectedProviderName = providers.find(p => p.key === selectedProviderKey)?.name || selectedProviderKey;

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Admin Top Bar */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm mx-4 mt-4">
        <Server className="w-5 h-5 text-gray-500" />
        <span className="text-sm font-['GPB'] text-gray-700">Select Provider to Audit:</span>
        <Select value={selectedProviderKey} onValueChange={setSelectedProviderKey}>
          <SelectTrigger className="w-64 font-['GM'] h-10 bg-[#F7F8F9] border-gray-200">
            <SelectValue placeholder="Select a provider" />
          </SelectTrigger>
          <SelectContent>
            {providers.map((p) => (
              <SelectItem key={p.key} value={p.key} className="font-['GM'] text-sm">
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs font-['GM'] text-gray-400">
            Mapping V2 Panel (Total Provider Services: {providerServices.length})
          </span>
        </div>
      </div>

      {/* Main Workspace */}
      {selectedProviderKey && (
        <div className="flex-1 w-full relative">
          <ProviderPickerV3 
            initialServices={providerServices} 
            providerName={selectedProviderName} 
            key={selectedProviderKey} // Force remount on provider change to clear draft states
          />
        </div>
      )}
    </div>
  );
}
