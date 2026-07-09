import { Skeleton } from "@/components/admin/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card";

export default function Loading() {
    return (
        <div className="flex-1 space-y-4 md:space-y-6 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
                <div className="space-y-1">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48" />
                </div>
            </div>

            <Card className="flex-1 flex flex-col overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 shrink-0">
                    <CardTitle>
                        <Skeleton className="h-6 w-32" />
                    </CardTitle>
                    <div className="flex gap-2">
                        <Skeleton className="h-9 w-24" />
                        <Skeleton className="h-9 w-32" />
                    </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden">
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <Skeleton className="h-10 flex-1" />
                            <Skeleton className="h-10 w-32" />
                        </div>
                        <div className="space-y-2">
                            {Array.from({ length: 10 }).map((_, i) => (
                                <div key={i} className="flex gap-4">
                                    <Skeleton className="h-12 w-12 rounded-full" />
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-4 w-[60%]" />
                                        <Skeleton className="h-4 w-[40%]" />
                                    </div>
                                    <Skeleton className="h-12 w-24" />
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
