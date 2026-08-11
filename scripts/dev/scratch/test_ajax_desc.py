import urllib.request

endpoints = [
    "https://wowsmmpanel.com/service/description/2716",
    "https://wowsmmpanel.com/services/description/2716",
    "https://wowsmmpanel.com/service/2716",
    "https://wowsmmpanel.com/services?description=2716"
]

for ep in endpoints:
    try:
        req = urllib.request.Request(ep, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            body = resp.read().decode('utf-8')
            print(f"SUCCESS {ep} -> Length: {len(body)}")
            print("Content:", body[:200].strip())
    except Exception as e:
        print(f"FAILED {ep} -> {e}")
