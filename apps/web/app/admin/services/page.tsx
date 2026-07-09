import { CategorizedServices } from "./_components/categorized-services";
import type { Service } from "./_components/schema";
import { getApiBaseUrl } from "@/lib/config";

async function getServices(): Promise<Service[]> {
    try {
        // Fetch from Go Backend
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/services`, {
            cache: 'no-store' // Always fresh for admin
        });

        if (!res.ok) throw new Error("Failed to fetch services");
        const data = await res.json();

        // Map backend fields to frontend schema if needed
        // The backend NormalizedSmmService already matches mostly
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
                    <p className="text-muted-foreground">
                        Manage {services.length} services across platforms.
                    </p>
                </div>
            </div>

            <CategorizedServices initialData={services} />
        </div>
    );
}
