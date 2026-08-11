import re

with open('wowsmm_web_services.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Look for data-description-id in JS code or inline attributes
matches = re.findall(r'\[data-description-id\][\s\S]*?\}', html)
print("JS matches for data-description-id:", len(matches))
for m in matches[:5]:
    print("MATCH:", m[:300])

# Search for any hidden div or popup template
modals = re.findall(r'class=["\']modal[^"\'\>]*["\'][^>]*>([\s\S]*?)</div>\s*</div>\s*</div>', html)
print("\nModal count:", len(modals))
for idx, m in enumerate(modals[:3]):
    print(f"Modal {idx}:", m[:300].strip())
