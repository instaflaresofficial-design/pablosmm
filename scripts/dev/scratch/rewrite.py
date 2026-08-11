import io
import os

with io.open('temp_picker.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the liveIds hook
content = content.replace(
    'const liveIds = new Set(',
    'const liveIds = React.useMemo(() => new Set((catalogServices || []).map((s: any) => getCleanId(s.provider_service_id || s.source_service_id))), [catalogServices]); // '
)

content = content.replace(
    'provider_id: "topsmm", // or dynamic if you pass it',
    'provider_id: providerKey,'
)

content = content.replace(
    'toast.success(`Successfully mapped ${payload.length} services!`);',
    'toast.success(`Successfully mapped ${payload.length} services!`);\n      if (onRefresh) onRefresh();'
)

with io.open(r'd:\Works\pablosmm\apps\web\app\admin\catalog\_components\catalog-picker.tsx', 'w', encoding='utf-8') as out:
    out.write(content)
print('Done writing catalog-picker.tsx!')
