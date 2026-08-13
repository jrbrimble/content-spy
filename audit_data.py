import requests, json

BASE = 'https://kmswdyuzatobdfuelyyu.supabase.co/rest/v1'
KEY = 'sb_publishable_wui8qrPXc6lj8qMGti2nkw_RwzcFcK5'
H = {'apikey': KEY}

competitors = requests.get(f'{BASE}/competitors?select=id,name,slug', headers=H, verify=False).json()
tables = ['youtube_posts','twitter_posts','instagram_posts','facebook_posts']

for c in competitors:
    print(f"\n=== {c['name']} ===")
    for t in tables:
        posts = requests.get(f"{BASE}/{t}?select=id,published_at&competitor_id=eq.{c['id']}", headers=H, verify=False).json()
        dates = [p.get('published_at','?') for p in posts]
        dates_sorted = sorted([d for d in dates if d], reverse=True)[:5]
        print(f"  {t}: {len(posts)} posts | most recent: {dates_sorted[:3]}")
