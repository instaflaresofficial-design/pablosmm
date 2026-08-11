import urllib.request
import json

# Try to hit the API with a cookie-less request to see the raw data structure
# First, let's call the wowsmm API directly using the key from the insert script
api_url = "https://wowsmmpanel.com/api/v2"
api_key = "YOUR_WOWSMM_API_KEY"

import urllib.parse

data = urllib.parse.urlencode({"key": api_key, "action": "services"}).encode()
req = urllib.request.Request(api_url, data=data, method="POST")
req.add_header("Content-Type", "application/x-www-form-urlencoded")

try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        raw = resp.read().decode()
        services = json.loads(raw)
        if isinstance(services, list) and len(services) > 0:
            print(f"Total services: {len(services)}")
            print("=== First 2 services (full structure) ===")
            for s in services[:2]:
                print(json.dumps(s, indent=2))
        else:
            print("Response:", raw[:500])
except Exception as e:
    print("Error:", e)
