import urllib.request
import json
import urllib.parse

api_url = "https://wowsmmpanel.com/api/v2"
api_key = "YOUR_WOWSMM_API_KEY"

print("=== Testing WowSMM with currency=INR parameter ===")
data = urllib.parse.urlencode({"key": api_key, "action": "services", "currency": "INR"}).encode()
req = urllib.request.Request(api_url, data=data, method="POST")
req.add_header("Content-Type", "application/x-www-form-urlencoded")

try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        services_inr = json.loads(resp.read().decode())
        print(f"Total services with currency=INR: {len(services_inr)}")
        print("First service (INR):", json.dumps(services_inr[0], indent=2))
except Exception as e:
    print("Error:", e)

print("\n=== Default (no currency param) ===")
data2 = urllib.parse.urlencode({"key": api_key, "action": "services"}).encode()
req2 = urllib.request.Request(api_url, data=data2, method="POST")
req2.add_header("Content-Type", "application/x-www-form-urlencoded")
try:
    with urllib.request.urlopen(req2, timeout=10) as resp2:
        services_default = json.loads(resp2.read().decode())
        # Compare same service
        svc1_inr = services_inr[0] if services_inr else {}
        svc1_def = services_default[0] if services_default else {}
        print(f"Service #{svc1_def.get('service')} rate (default): {svc1_def.get('rate')}")
        print(f"Service #{svc1_inr.get('service')} rate (INR):     {svc1_inr.get('rate')}")
except Exception as e:
    print("Error:", e)
