import urllib.request
import re
import json

url = "https://wowsmmpanel.com/services"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})

try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        html = resp.read().decode('utf-8')

    # Regex to capture row data: service_id, avg_time
    rows = re.findall(r'<tr[^>]*>([\s\S]*?)</tr>', html)
    print(f"Total table rows found: {len(rows)}")

    parsed_data = {}

    for row in rows:
        # Match service ID
        id_match = re.search(r'service-cell-id["\'][^>]*>\s*(\d+)\s*<', row)
        if not id_match:
            id_match = re.search(r'data-description-id=["\'](\d+)["\']', row)
        if not id_match:
            continue

        svc_id = id_match.group(1)

        # Match Average Time
        avg_match = re.search(r'data-label=["\']Average time["\'][^>]*>\s*([^<]+)\s*<', row)
        avg_time = avg_match.group(1).strip() if avg_match else ""

        parsed_data[svc_id] = {
            "average_time": avg_time
        }

    print(f"Successfully extracted Average Time for {len(parsed_data)} WowSMM services!")
    # Show sample extracted items
    sample_keys = list(parsed_data.keys())[:5]
    for k in sample_keys:
        print(f"  Service #{k}: Avg Time = '{parsed_data[k]['average_time']}'")

except Exception as e:
    print("Error:", e)
