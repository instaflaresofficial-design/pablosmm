import urllib.request
import urllib.parse

url = "https://wowsmmpanel.com/services/description"
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'X-Requested-With': 'XMLHttpRequest'}

# Test POST with id=2716
try:
    data = urllib.parse.urlencode({'id': '2716'}).encode()
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')
    with urllib.request.urlopen(req, timeout=5) as resp:
        print("SUCCESS POST:", resp.read().decode('utf-8')[:300])
except Exception as e:
    print("FAILED POST:", e)

# Test GET with id=2716
try:
    req = urllib.request.Request("https://wowsmmpanel.com/services/description?id=2716", headers=headers)
    with urllib.request.urlopen(req, timeout=5) as resp:
        print("SUCCESS GET:", resp.read().decode('utf-8')[:300])
except Exception as e:
    print("FAILED GET:", e)
