import re
import json

with open('wowsmm_web_services.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Look for modal descriptions or data attributes
desc_blocks = re.findall(r'id=["\']service-description-(\d+)["\'][^>]*>(.*?)</div>', html, re.DOTALL)
print(f"Found {len(desc_blocks)} description modals in website HTML!")

if desc_blocks:
    service_id, desc = desc_blocks[0]
    print(f"\nExample for Service ID {service_id}:")
    print(desc.strip()[:300])

# Check for average time in HTML table
avg_times = re.findall(r'class=["\']service-avg-time["\'][^>]*>(.*?)</span>', html, re.DOTALL)
print(f"\nFound {len(avg_times)} average time tags in HTML!")
if avg_times:
    print("Example average time:", avg_times[0].strip())
