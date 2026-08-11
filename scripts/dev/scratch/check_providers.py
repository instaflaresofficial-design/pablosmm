import urllib.request
import json
import urllib.parse

print("=== TopSMM - checking fields ===")
api_url = "https://topsmm.com/api/v2"

# We need to find the topsmm API key from the DB
# Let's check the Go env instead
import subprocess, os

result = subprocess.run(
    ["go", "run", "-"],
    input=b'''package main

import (
    "context"
    "fmt"
    "os"
    "github.com/jackc/pgx/v5"
    "github.com/joho/godotenv"
)

func main() {
    _ = godotenv.Load(".env")
    conn, _ := pgx.Connect(context.Background(), os.Getenv("DATABASE_URL"))
    defer conn.Close(context.Background())
    rows, _ := conn.Query(context.Background(), "SELECT key, api_url, api_key, currency FROM smm_providers")
    defer rows.Close()
    for rows.Next() {
        var key, apiUrl, apiKey, currency string
        rows.Scan(&key, &apiUrl, &apiKey, &currency)
        fmt.Printf("%s|%s|%s|%s\\n", key, apiUrl, apiKey, currency)
    }
}
''',
    capture_output=True, text=True, cwd=r"d:\Works\pablosmm\apps\api"
)
print(result.stdout)
print(result.stderr[:500] if result.stderr else "")
