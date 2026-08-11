with open('wowsmm_web_services.html', 'r', encoding='utf-8') as f:
    html = f.read()

import re
matches = [line.strip() for line in html.splitlines() if 'data-description-id' in line]
print(f"Total lines with data-description-id: {len(matches)}")
for line in matches[:10]:
    print("LINE:", line)
