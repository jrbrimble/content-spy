"""
Seeds the competitors table and verifies Supabase connection.
"""
import sys
import json
import warnings
import requests
warnings.filterwarnings("ignore")  # suppress SSL warnings

SUPABASE_URL = "https://kmswdyuzatobdfuelyyu.supabase.co"
ANON_KEY = "sb_publishable_wui8qrPXc6lj8qMGti2nkw_RwzcFcK5"

HEADERS = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

COMPETITORS = [
    {
        "name": "Dan Martell", "slug": "dan-martell",
        "youtube_url": "https://www.youtube.com/@danmartell",
        "twitter_url": "https://twitter.com/danmartell",
        "instagram_url": "https://www.instagram.com/danmartell",
        "facebook_url": "https://www.facebook.com/danmartell",
    },
    {
        "name": "Rick Mulready", "slug": "rick-mulready",
        "youtube_url": "https://www.youtube.com/@RickMulready",
        "twitter_url": "https://twitter.com/rickmulready",
        "instagram_url": "https://www.instagram.com/rickmulready",
        "facebook_url": "https://www.facebook.com/rmulready",
    },
    {
        "name": "Eric Siu", "slug": "eric-siu",
        "youtube_url": "https://www.youtube.com/@LevelingUpOfficial",
        "twitter_url": "https://twitter.com/ericosiu",
        "instagram_url": "https://www.instagram.com/ericosiu",
        "facebook_url": "https://www.facebook.com/singlegrain/",
    },
    {
        "name": "AI Show Podcast", "slug": "ai-show-podcast",
        "youtube_url": "https://www.youtube.com/@aishowpod",
        "twitter_url": "https://twitter.com/aishowpod",
        "instagram_url": "https://www.instagram.com/aishowpod",
        "facebook_url": "https://www.facebook.com/aishowpod",
    },
    {
        "name": "Sabrina Ramonov", "slug": "sabrina-ramonov",
        "youtube_url": "https://www.youtube.com/@sabrina_ramonov",
        "twitter_url": "https://twitter.com/sabrina_ramonov",
        "instagram_url": "https://www.instagram.com/sabrina_ramonov",
        "facebook_url": "https://www.facebook.com/sabr1naram",
    },
    {
        "name": "Sean Standberry (LYFE Marketing)", "slug": "sean-standberry",
        "youtube_url": "https://www.youtube.com/@SeanStandberry",
        "twitter_url": "https://x.com/LYFEMarketing",
        "instagram_url": "https://www.instagram.com/lyfemarketing",
        "facebook_url": "https://www.facebook.com/lyfemarketing/",
    },
]

print("Checking competitors table...")
resp = requests.get(
    f"{SUPABASE_URL}/rest/v1/competitors?select=slug",
    headers=HEADERS,
    verify=False
)
print(f"  Status: {resp.status_code}")

if resp.status_code != 200:
    print(f"  ERROR: {resp.text}")
    sys.exit(1)

existing = {r["slug"] for r in json.loads(resp.text)}
print(f"  Existing competitors: {existing or 'none'}")

to_insert = [c for c in COMPETITORS if c["slug"] not in existing]
if not to_insert:
    print("\nAll competitors already seeded!")
else:
    print(f"\nInserting {len(to_insert)} competitor(s)...")
    resp2 = requests.post(
        f"{SUPABASE_URL}/rest/v1/competitors",
        headers=HEADERS,
        json=to_insert,
        verify=False
    )
    print(f"  Insert status: {resp2.status_code}")
    if resp2.status_code not in (200, 201):
        print(f"  ERROR: {resp2.text}")
        sys.exit(1)

# Verify final state
resp3 = requests.get(
    f"{SUPABASE_URL}/rest/v1/competitors?select=name,slug&order=name",
    headers=HEADERS,
    verify=False
)
final = json.loads(resp3.text)
print(f"\nCompetitors in database ({len(final)} total):")
for c in final:
    print(f"  - {c['name']} ({c['slug']})")

print("\nSupabase setup complete! Ready to run scrapers.")
