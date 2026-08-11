import urllib.request
import re

js_urls = [
    'https://storage.perfectcdn.com/global/kldsorwft7cd20qz.js',
    'https://storage.perfectcdn.com/global/tlrgcybojkfxdlfj.js',
    'https://storage.perfectcdn.com/global/06a2geqox8hhng7p.js',
    'https://storage.perfectcdn.com/global/l25nlbi0k2c7ackj.js'
]

for url in js_urls:
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            code = resp.read().decode('utf-8')
            if 'description' in code.lower():
                print(f"MATCH IN {url}:")
                for match in re.finditer(r'description[^\n]{0,100}', code, re.IGNORECASE):
                    print("  ", match.group(0))
    except Exception as e:
        print(f"Error {url}: {e}")
