import re

with open('wowsmm_web_services.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Search for service 2716 in the HTML table
pattern = r'tr[^>]*data-filter-table-category-id[^>]*>.*?2716.*?</tr>'
matches = re.findall(pattern, html, re.DOTALL)
print("Found service 2716 table row:", len(matches))
if matches:
    print(matches[0][:500])

# Search for any description modal content
modals = re.findall(r'<div[^>]*class=["\'][^"\']*modal[^"\']*["\'][^>]*>(.*?)</div>\s*</div>\s*</div>', html, re.DOTALL)
print("Found modals:", len(modals))
if modals:
    print(modals[0][:300])
