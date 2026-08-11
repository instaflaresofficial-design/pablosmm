import io
import re

with io.open(r'd:\Works\pablosmm\apps\web\app\admin\providers\verify\_components\provider-picker-v3.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace ProviderPickerV3 with CatalogPicker
content = content.replace('export function ProviderPickerV3({ initialServices, providerName }: any) {', 'export function CatalogPicker({ catalogServices, rawServices: initialServices, providerName, providerKey, onRefresh }: any) {')

# The liveIds has multiple lines, we need to carefully replace it
content = re.sub(
    r'const liveIds = new Set\(\s*items\.map\(\(item\) => getCleanId\(item\)\)\s*\);',
    'const liveIds = React.useMemo(() => new Set((catalogServices || []).map((s: any) => getCleanId(s.provider_service_id || s.source_service_id))), [catalogServices]);',
    content
)

# And another one in the useEffect or somewhere else if any
content = re.sub(
    r'const liveIds = new Set\(\s*items\.map\(\(item: any\) => getCleanId\(item\)\)\s*\);',
    'const liveIds = React.useMemo(() => new Set((catalogServices || []).map((s: any) => getCleanId(s.provider_service_id || s.source_service_id))), [catalogServices]);',
    content
)

# Replace topsmm
content = content.replace('provider_id: "topsmm",', 'provider_id: providerKey,')

# Add onRefresh
content = content.replace('toast.success(`Successfully mapped ${payload.length} services!`);', 'toast.success(`Successfully mapped ${payload.length} services!`);\n      if (onRefresh) onRefresh();')

with io.open(r'd:\Works\pablosmm\apps\web\app\admin\catalog\_components\catalog-picker.tsx', 'w', encoding='utf-8') as out:
    out.write(content)
