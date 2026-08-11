import os
import io
import re

dst = r"d:\Works\pablosmm\apps\web\app\admin\catalog\_components\catalog-picker.tsx"

with io.open(dst, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace('import { AdminSubmissionsView } from "./admin-submissions-view";', '')

# Replace activeTab logic
content = content.replace(
    'const [activeTab, setActiveTab] = React.useState<"picker" | "edits" | "sales">("picker");',
    'const [activeTab, setActiveTab] = React.useState<"picker" | "edits" | "manage">("picker");'
)

# Update Tab UI buttons
# Let's find the tabs header
content = content.replace(
    """<button
            onClick={() => setActiveTab("sales")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm transition-colors border-b-2 font-['GPB'] ${
              activeTab === "sales"
                ? "border-purple-500 text-purple-700 bg-purple-50/50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Live Sales
          </button>""",
    """<button
            onClick={() => setActiveTab("manage")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm transition-colors border-b-2 font-['GPB'] ${
              activeTab === "manage"
                ? "border-purple-500 text-purple-700 bg-purple-50/50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Manage Catalog
          </button>"""
)

# In the render body:
# {activeTab === "sales" ? (
#            <AdminSubmissionsView platform={selectedPlatform} category={selectedCategory} providerName={providerName} />
#          )
content = content.replace(
    """{activeTab === "sales" ? (
            <AdminSubmissionsView platform={selectedPlatform} category={selectedCategory} providerName={providerName} />
          ) : activeTab === "edits" ? (""",
    """{activeTab === "manage" ? (
            <div className="p-4">
              <h3 className="font-['GPB'] text-lg mb-4">Mapped Catalog Services</h3>
              <div className="space-y-4">
                {catalogServices.length === 0 ? (
                  <p className="text-gray-500">No services mapped to catalog yet.</p>
                ) : (
                  catalogServices.map((svc: any) => (
                    <div key={svc.id} className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center justify-between">
                      <div>
                        <div className="font-['GPB'] text-sm">{svc.name} {svc.variant_name ? `(${svc.variant_name})` : ''}</div>
                        <div className="text-xs text-gray-500 flex gap-2 mt-1">
                          <Badge variant="outline">{svc.platform} / {svc.category}</Badge>
                          <Badge variant="secondary">{svc.provider_id} #{svc.provider_service_id}</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-['GPB'] text-green-600">₹{svc.sell_price_inr?.toFixed(2)}</div>
                        <div className="text-xs text-gray-400 font-['GM']">{svc.is_active ? 'Active' : 'Hidden'}</div>
                        <button 
                          onClick={async () => {
                            if(confirm('Delete this mapping?')) {
                              try {
                                await apiClient.delete(`/admin/catalog/${svc.id}`);
                                toast.success("Deleted successfully");
                                if (onRefresh) onRefresh();
                              } catch(e:any) {
                                toast.error(e.message || "Failed to delete");
                              }
                            }
                          }}
                          className="mt-2 text-red-500 hover:text-red-700 text-xs font-['GPB']"
                        >
                          Delete Mapping
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : activeTab === "edits" ? ("""
)

with io.open(dst, "w", encoding="utf-8") as f:
    f.write(content)
