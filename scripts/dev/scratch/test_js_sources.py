with open('wowsmm_web_services.html', 'r', encoding='utf-8') as f:
    html = f.read()

import re
# Find all script tags or external js references
js_files = re.findall(r'src=["\']([^"\']+\.js[^"\'\>]*)["\']', html)
print("External JS files:", js_files)

# Find inline scripts containing description
scripts = re.findall(r'<script[^>]*>([\s\S]*?)</script>', html)
print(f"Inline script tags: {len(scripts)}")
for idx, s in enumerate(scripts):
    if "description" in s.lower():
        print(f"\n--- Script #{idx} ---")
        print(s[:400])
