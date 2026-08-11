import urllib.request
import re

url = "https://wowsmmpanel.com/services"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})

with urllib.request.urlopen(req) as resp:
    html = resp.read().decode('utf-8')

# Search for modal divs in HTML
modals = re.findall(r'id=["\']service-description-(\d+)["\'][^>]*>(.*?)</div>', html, re.DOTALL)
print(f"Direct modal divs: {len(modals)}")

# Search for JS object or AJAX URL for description
ajax_urls = re.findall(r'url:\s*["\']([^"\']*description[^"\']*)["\']', html)
print("AJAX URLs:", ajax_urls)

# Search for popup / modal text container in script
scripts = re.findall(r'<script[^>]*>([\s\S]*?)</script>', html)
for s in scripts:
    if "description" in s.lower() and "service" in s.lower():
        print("Script snippet:", s[:300].strip())

# Check for modal content block
modals2 = re.findall(r'<div[^>]*class=["\'][^"\']*modal-body[^"\']*["\'][^>]*>(.*?)</div>', html, re.DOTALL)
print("Modal bodies found:", len(modals2))
if modals2:
    print("Sample modal body:", modals2[0][:200].strip())
