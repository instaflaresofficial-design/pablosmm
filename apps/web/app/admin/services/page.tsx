export const dynamic = 'force-dynamic';

import Link from "next/link";
import { CategorizedServices } from "./_components/categorized-services";
import type { Service } from "./_components/schema";
import { getApiBaseUrl } from "@/lib/config";
import { Button } from "@/components/admin/ui/button";
import { Sparkles } from "lucide-react";

async function getServices(): Promise<Service[]> {
    try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/services?all=true`, {
            cache: 'no-store'
        });

        if (!res.ok) throw new Error("Failed to fetch services");
        const data = await res.json();
        return data.services || [];
    } catch (error) {
        console.error("Backend fetch error:", error);
        return [];
    }
}

export default async function ServicesPage() {
    const services = await getServices();

    return (
        <div className="flex-1 space-y-4 md:space-y-6 flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between shrink-0">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Service Management</h2>
                    <p className="text-muted-foreground text-xs">
                        Manage {services.length} services across platforms.
                    </p>
                </div>
                
                <Link href="/admin/services/curated">
                    <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold gap-2 text-xs shadow-md">
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        Curated Verified Catalog Studio
                    </Button>
                </Link>
            </div>

            <CategorizedServices initialData={services} />
        </div>
    );
}
