"""
Applies the Supabase schema via the Management API SQL endpoint.
Uses requests with SSL verification disabled for local dev.
"""
import requests
import json
import warnings
warnings.filterwarnings("ignore")

SUPABASE_URL = "https://kmswdyuzatobdfuelyyu.supabase.co"
ANON_KEY = "sb_publishable_wui8qrPXc6lj8qMGti2nkw_RwzcFcK5"

HEADERS = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}",
    "Content-Type": "application/json",
}

schema_path = r"C:\Users\jrbri\.gemini\antigravity\brain\4e077980-55c5-4679-bd1f-3344bb9be29c\supabase_schema.sql"
with open(schema_path, "r", encoding="utf-8") as f:
    full_sql = f.read()

print("Testing REST API connection...")
resp = requests.get(
    f"{SUPABASE_URL}/rest/v1/",
    headers=HEADERS,
    verify=False
)
print(f"Status: {resp.status_code}")

# Check if competitors table exists
print("\nChecking if 'competitors' table exists...")
resp2 = requests.get(
    f"{SUPABASE_URL}/rest/v1/competitors?select=name&limit=3",
    headers=HEADERS,
    verify=False
)
print(f"Status: {resp2.status_code} | Body: {resp2.text[:300]}")

if resp2.status_code == 200:
    data = json.loads(resp2.text)
    print(f"\n✅ competitors table exists — {len(data)} row(s) found.")
    if len(data) > 0:
        for row in data:
            print(f"   • {row['name']}")
    else:
        print("   Table is empty — seed data needs to be inserted.")
elif resp2.status_code == 404:
    print("\n❌ Table does not exist yet — schema must be run first.")
else:
    print(f"\n⚠ Unexpected: {resp2.status_code}")
    print(resp2.text[:500])
