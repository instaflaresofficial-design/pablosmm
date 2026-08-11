import urllib.request
import json
import urllib.parse

api_url = "https://wowsmmpanel.com/api/v2"
api_key = "YOUR_WOWSMM_API_KEY"

data = urllib.parse.urlencode({"key": api_key, "action": "services"}).encode()
req = urllib.request.Request(api_url, data=data, method="POST")
req.add_header("Content-Type", "application/x-www-form-urlencoded")

with urllib.request.urlopen(req, timeout=10) as resp:
    services = json.loads(resp.read().decode())

# Print all unique keys across all services
all_keys = set()
for s in services:
    all_keys.update(s.keys())
print("ALL FIELD KEYS:", sorted(all_keys))

# Find any that have description or average_time
with_desc = [s for s in services if s.get("description") or s.get("desc") or s.get("average_time")]
print(f"\nServices with description/desc/average_time: {len(with_desc)}")

# Print rate range to confirm currency
rates = [float(s["rate"]) for s in services if s.get("rate")]
print(f"\nRate range: min={min(rates):.4f}, max={max(rates):.4f}")
print("Sample rates:", [f"{float(s['rate']):.4f}" for s in services[:5]])
