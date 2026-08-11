import psycopg2
import json

try:
    conn = psycopg2.connect(
        host="localhost",
        port=5432,
        dbname="pablosmm",
        user="postgres",
        password="postgres"
    )
    cur = conn.cursor()
    cur.execute("SELECT key, name, currency FROM smm_providers WHERE is_active = true;")
    rows = cur.fetchall()
    for r in rows:
        print(r)
    conn.close()
except Exception as e:
    print("Error:", e)
