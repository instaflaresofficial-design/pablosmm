import subprocess
import sys

# Run psql to fix WowSMM currency
result = subprocess.run(
    ["psql", "-h", "localhost", "-U", "postgres", "-d", "pablosmm", "-c", 
     "UPDATE smm_providers SET currency = 'USD' WHERE key = 'wowsmm'; SELECT key, name, currency FROM smm_providers;"],
    capture_output=True, text=True
)
print("STDOUT:", result.stdout)
print("STDERR:", result.stderr)
print("Return code:", result.returncode)
