import urllib.request
import json
import urllib.parse

# Check if WowSMM supports currency via the balance/user endpoint
api_url = "https://wowsmmpanel.com/api/v2"
api_key = "YOUR_WOWSMM_API_KEY"

print("=== WowSMM balance endpoint ===")
data = urllib.parse.urlencode({"key": api_key, "action": "balance"}).encode()
req = urllib.request.Request(api_url, data=data, method="POST")
req.add_header("Content-Type", "application/x-www-form-urlencoded")
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        print(json.dumps(json.loads(resp.read().decode()), indent=2))
except Exception as e:
    print("Error:", e)

print("\n=== Try GET with currency in URL ===")
url_inr = f"https://wowsmmpanel.com/api/v2?key={api_key}&action=services&currency=INR"
try:
    with urllib.request.urlopen(url_inr, timeout=10) as resp:
        services = json.loads(resp.read().decode())
        print("First service rate (GET, currency=INR):", services[0].get("rate"))
except Exception as e:
    print("Error:", e)
