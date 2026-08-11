import os
import io

src = r"d:\Works\pablosmm\apps\web\app\admin\providers\verify\_components\provider-picker-v3.tsx"
dst = r"d:\Works\pablosmm\apps\web\app\admin\catalog\_components\catalog-picker.tsx"

with io.open(src, "r", encoding="utf-8") as f:
    content = f.read()

# Replace ProviderPickerV3 with CatalogPicker
content = content.replace("ProviderPickerV3", "CatalogPicker")

# Add catalogServices to props
content = content.replace(
    "export function CatalogPicker({ initialServices, providerName }: CatalogPickerProps) {",
    "export function CatalogPicker({ catalogServices, rawServices, providerName, providerKey, onRefresh }: any) {\n  const initialServices = rawServices;"
)
content = content.replace(
    "interface CatalogPickerProps {\n  initialServices: ServiceItem[];\n  providerName: string;\n}",
    ""
)

# We need to change the save logic
# Find handleFinalSubmit
import re
submit_pattern = re.compile(r"const handleFinalSubmit = async \(\) => \{.*?(?=const handleReject =)", re.DOTALL)

new_submit = """const handleFinalSubmit = async () => {
    if (currentWorkingList.length === 0) return;
    setIsSubmitting(true);
    
    try {
      let successCount = 0;
      for (const svc of currentWorkingList) {
        const cId = getCleanId(svc);
        const gName = groupNameMap[cId] || `${currentPlatformObj.name} ${currentCategoryObj.name} - #${cId}`;
        const vName = variantNameMap[cId] || "";
        const sPrice = sellPriceMap[cId] || "0";
        
        const payload = {
          name: gName,
          platform: selectedPlatform,
          category: selectedCategory,
          variant_name: vName,
          sell_price_inr: parseFloat(sPrice) || 0,
          provider_id: providerKey,
          provider_service_id: cId,
          is_active: true
        };

        await apiClient.post("/admin/catalog", payload);
        successCount++;
      }
      
      toast.success(`Successfully mapped ${successCount} services to Catalog`);
      
      // Clear working list
      const updated = { ...workingSelections };
      delete updated[slotKey];
      setWorkingSelections(updated);
      
      if (onRefresh) onRefresh();
      
    } catch (err: any) {
      toast.error(err.message || "Failed to submit mapping");
    } finally {
      setIsSubmitting(false);
    }
  };

  """

content = submit_pattern.sub(new_submit, content)


with io.open(dst, "w", encoding="utf-8") as f:
    f.write(content)
