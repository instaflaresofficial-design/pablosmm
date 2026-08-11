import urllib.request
import json

url = "https://wowsmmpanel.com/services/get-service-description/2716"
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'X-Requested-With': 'XMLHttpRequest'
}

try:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as resp:
        content = resp.read().decode('utf-8')
        print("SUCCESS ENDPOINT!")
        print("Content length:", len(content))
        print("Response:", content)
except Exception as e:
    print("Error:", e)
