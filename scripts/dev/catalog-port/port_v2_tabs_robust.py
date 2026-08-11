import os
import io
import re

dst = r"d:\Works\pablosmm\apps\web\app\admin\catalog\_components\catalog-picker.tsx"

with io.open(dst, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove AdminSubmissionsView import
content = re.sub(r'import \{ AdminSubmissionsView \}.*?;\n', '', content)

# 2. Update state tab type
content = re.sub(
    r'const \[activeTab, setActiveTab\] = React.useState<"picker" \| "edits" \| "sales">',
    r'const [activeTab, setActiveTab] = React.useState<"picker" | "edits" | "manage">',
    content
)

# 3. Update UI tab button
content = re.sub(
    r'onClick=\{\(\) => setActiveTab\("sales"\)\}.*?Live Sales\n\s*</button>',
    r'''onClick={() => setActiveTab("manage")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm transition-colors border-b-2 font-['GPB'] ${
              activeTab === "manage"
                ? "border-purple-500 text-purple-700 bg-purple-50/50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Manage Catalog
          </button>''',
    content,
    flags=re.DOTALL
)

# 4. Update the actual render block for sales -> manage
manage_content = """{activeTab === "manage" ? (
            <div className="p-4 h-full overflow-y-auto">
              <h3 className="font-['GPB'] text-lg mb-4">Mapped Catalog Services</h3>
              <div className="space-y-4">
                {!catalogServices || catalogServices.length === 0 ? (
                  <p className="text-gray-500">No services mapped to catalog yet.</p>
                ) : (
                  catalogServices.map((svc: any) => (
                    <div key={svc.id} className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center justify-between hover:border-gray-300">
                      <div>
                        <div className="font-['GPB'] text-sm">{svc.name} {svc.variant_name ? `(${svc.variant_name})` : ''}</div>
                        <div className="text-xs text-gray-500 flex gap-2 mt-2">
                          <Badge variant="outline" className="text-[10px] bg-gray-50">{svc.platform} / {svc.category}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{svc.provider_id} #{svc.provider_service_id}</Badge>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <div className="font-['GPB'] text-green-600">₹{svc.sell_price_inr?.toFixed(2)}</div>
                        <div className="text-xs text-gray-400 font-['GM']">{svc.is_active ? 'Active' : 'Hidden'}</div>
                        <button 
                          onClick={async () => {
                            if(confirm('Delete this mapped service? This will permanently remove it from the catalog.')) {
                              try {
                                await apiClient.delete(`/admin/catalog/${svc.id}`);
                                toast.success("Deleted successfully");
                                if (onRefresh) onRefresh();
                              } catch(e:any) {
                                toast.error(e.message || "Failed to delete");
                              }
                            }
                          }}
                          className="px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 text-xs font-['GPB'] transition-colors"
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

content = re.sub(
    r'\{activeTab === "sales" \? \(.*?</AdminSubmissionsView>\s*\)\s*:\s*activeTab === "edits" \? \(',
    manage_content,
    content,
    flags=re.DOTALL
)

# Fix remaining any errors (479, 615, 625)
content = re.sub(r'some\(\(t\) =>', 'some((t: any) =>', content)
content = re.sub(r'filter\(\(s\) =>', 'filter((s: any) =>', content)
content = re.sub(r'filter\(\(svc\) =>', 'filter((svc: any) =>', content)
content = re.sub(r'map\(\(svc\) =>', 'map((svc: any) =>', content)
content = re.sub(r'map\(\(s\) =>', 'map((s: any) =>', content)


with io.open(dst, "w", encoding="utf-8") as f:
    f.write(content)

print("Done. length:", len(content))
