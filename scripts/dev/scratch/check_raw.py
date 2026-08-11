import urllib.request
import json

req = urllib.request.Request(
    "http://localhost:8080/api/admin/provider-services",
    headers={"Cookie": ""}
)

try:
    with urllib.request.urlopen(req, timeout=5) as resp:
        data = json.loads(resp.read().decode())
        wowsmm = [x for x in data if x.get("providerKey") == "wowsmm"]
        if wowsmm:
            print("WOWSMM SAMPLE:")
            print(json.dumps(wowsmm[0], indent=2))
        else:
            all_keys = list(set(x.get("providerKey", "?") for x in data))
            print("Keys found:", all_keys)
            print("FIRST ITEM:", json.dumps(data[0], indent=2) if data else "empty")
except Exception as e:
    print("Error:", e)
