import urllib.request
import json
import urllib.parse

# Check TopSMM API fields
topsmm_url = "https://topsmm.com/api/v2"

# Read DB to get topsmm key - we'll try common methods
# First let's try reading from the .env file
import os

env_path = r"d:\Works\pablosmm\apps\api\.env"
db_url = ""
try:
    with open(env_path) as f:
        for line in f:
            if line.startswith("DATABASE_URL="):
                db_url = line.strip().split("=", 1)[1]
                break
    print("DB URL found:", db_url[:50] + "...")
except Exception as e:
    print("Error reading .env:", e)

# Try to connect via pg8000 or asyncpg
# Check what's available
try:
    import pg8000
    import pg8000.native
    
    # Parse connection string
    # postgresql://user:password@host:port/dbname
    import re
    m = re.match(r'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)', db_url)
    if m:
        user, password, host, port, dbname = m.groups()
        conn = pg8000.native.Connection(host=host, port=int(port), database=dbname, user=user, password=password)
        rows = conn.run("SELECT key, api_url, api_key, currency FROM smm_providers WHERE is_active = true ORDER BY key")
        for r in rows:
            print(r)
        conn.close()
    else:
        print("Couldn't parse DB URL")
except ModuleNotFoundError:
    print("pg8000 not available")
