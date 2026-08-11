import * as React from "react";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import { Trash2, Edit } from "lucide-react";

export function CatalogManagerList({ catalogServices, onRefresh }: { catalogServices: any[], onRefresh: () => void }) {
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this mapped service? This will remove it from the catalog.")) return;
    try {
      await apiClient.delete(`/admin/catalog/${id}`);
      toast.success("Service deleted");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete service");
    }
  };

  return (
    <div className="p-6 h-[calc(100vh-100px)] overflow-y-auto bg-white rounded-xl shadow-sm m-4 border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-['GPB'] text-gray-900">Manage Catalog</h2>
          <p className="text-sm text-gray-500 font-['GM']">View and manage all services currently available to your customers.</p>
        </div>
        <Badge variant="secondary" className="px-3 py-1 text-sm font-['GPB'] bg-purple-50 text-purple-700">
          Total: {catalogServices.length} Services
        </Badge>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600 font-['GM']">
          <thead className="bg-gray-50 text-gray-500 font-['GPB'] text-xs uppercase sticky top-0 shadow-sm z-10">
            <tr>
              <th className="px-4 py-3 rounded-tl-lg">Service Name</th>
              <th className="px-4 py-3">Platform / Category</th>
              <th className="px-4 py-3">Provider Binding</th>
              <th className="px-4 py-3">Sell Price (INR)</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right rounded-tr-lg">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {catalogServices.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400">No services mapped to the catalog yet.</td>
              </tr>
            ) : (
              catalogServices.map(svc => (
                <tr key={svc.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-['GPB'] text-gray-900">{svc.name}</div>
                    {svc.variant_name && <div className="text-xs text-gray-400 mt-0.5">{svc.variant_name}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="bg-white">{svc.platform}</Badge>
                    <Badge variant="secondary" className="ml-2 bg-gray-100">{svc.category}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs">
                      <span className="font-['GPB']">{svc.provider_id}</span>
                      <span className="text-gray-400 ml-1">#{svc.provider_service_id}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-['GPB'] text-green-600">
                    ₹{svc.sell_price_inr?.toFixed(2) || "0.00"}
                  </td>
                  <td className="px-4 py-3">
                    {svc.is_active ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-400">Hidden</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(svc.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
