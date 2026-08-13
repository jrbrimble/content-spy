import json
import datetime
from apify_client import ApifyClient

API_TOKEN = os.environ.get("APIFY_API_KEY", "")
client = ApifyClient(API_TOKEN)

CURRENT_DATE = datetime.datetime.fromisoformat("2026-08-07T15:10:09+01:00")
SEVEN_DAYS_AGO = CURRENT_DATE - datetime.timedelta(days=7)

PROFILES = {
    "Dan Martell": {
        "instagram": "https://www.instagram.com/danmartell",
        "facebook": "https://www.facebook.com/danmartell"
    },
    "Rick Mulready": {
        "instagram": "https://www.instagram.com/rickmulready",
        "facebook": "https://www.facebook.com/rmulready"
    },
    "Eric Siu": {
        "instagram": "https://www.instagram.com/ericosiu",
        "facebook": "https://www.facebook.com/singlegrain/"
    },
    "AI Show Podcast": {
        "instagram": "https://www.instagram.com/aishowpod",
        "facebook": "https://www.facebook.com/aishowpod"
    },
    "Sabrina Ramonov": {
        "instagram": "https://www.instagram.com/sabrina_ramonov",
        "facebook": "https://www.facebook.com/sabr1naram"
    },
    "Sean Standberry (LYFE Marketing)": {
        "instagram": "https://www.instagram.com/lyfemarketing",
        "facebook": "https://www.facebook.com/lyfemarketing/"
    }
}

print("=== Starting Apify Instagram Scraping ===")
ig_urls = [data["instagram"] for data in PROFILES.values()]
run_input_ig = {
    "directUrls": ig_urls,
    "resultsType": "posts",
    "resultsLimit": 15,
}

ig_results = {}

try:
    print("Launching apify/instagram-scraper for all profile URLs...")
    run_ig = client.actor("apify/instagram-scraper").call(run_input=run_input_ig)
    dataset_id_ig = run_ig["defaultDatasetId"] if isinstance(run_ig, dict) else getattr(run_ig, "default_dataset_id", getattr(run_ig, "defaultDatasetId", None))
    items_ig = list(client.dataset(dataset_id_ig).iterate_items())
    print(f"Total IG items fetched: {len(items_ig)}")
    
    # Process IG items by profile
    for name, data in PROFILES.items():
        profile_url = data["instagram"].rstrip('/').lower()
        profile_handle = profile_url.split('/')[-1]
        
        person_posts = []
        for item in items_ig:
            # Check owner/username
            owner = item.get("ownerUsername", "").lower()
            if profile_handle in owner or profile_handle in item.get("inputUrl", "").lower():
                ts_str = item.get("timestamp")
                if ts_str:
                    try:
                        pub_dt = datetime.datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                    except:
                        pub_dt = None
                else:
                    pub_dt = None
                
                if pub_dt and pub_dt >= SEVEN_DAYS_AGO:
                    text = item.get("caption", "") or ""
                    likes = item.get("likesCount", 0) or 0
                    comments = item.get("commentsCount", 0) or 0
                    url = item.get("url", "")
                    
                    person_posts.append({
                        "text": text[:300],
                        "url": url,
                        "likes": likes,
                        "comments": comments,
                        "engagement": likes + comments,
                        "date": pub_dt.strftime("%b %d, %Y")
                    })
        
        person_posts.sort(key=lambda x: x["engagement"], reverse=True)
        ig_results[name] = person_posts[:3]

except Exception as e:
    print("Error during IG Scraping:", e)

with open('instagram_results.json', 'w', encoding='utf-8') as f:
    json.dump(ig_results, f, indent=2)


print("\n=== Starting Apify Facebook Scraping ===")
fb_urls = [{"url": data["facebook"]} for data in PROFILES.values()]
run_input_fb = {
    "startUrls": fb_urls,
    "resultsLimit": 15,
}

fb_results = {}

try:
    print("Launching apify/facebook-posts-scraper for all Facebook pages...")
    run_fb = client.actor("apify/facebook-posts-scraper").call(run_input=run_input_fb)
    dataset_id_fb = run_fb["defaultDatasetId"] if isinstance(run_fb, dict) else getattr(run_fb, "default_dataset_id", getattr(run_fb, "defaultDatasetId", None))
    items_fb = list(client.dataset(dataset_id_fb).iterate_items())
    print(f"Total FB items fetched: {len(items_fb)}")
    
    for name, data in PROFILES.items():
        page_url = data["facebook"].rstrip('/').lower()
        page_name = page_url.split('/')[-1]
        
        person_posts = []
        for item in items_fb:
            ts_str = item.get("time") or item.get("timestamp")
            if ts_str:
                try:
                    if isinstance(ts_str, int):
                        pub_dt = datetime.datetime.fromtimestamp(ts_str, tz=datetime.timezone.utc)
                    else:
                        pub_dt = datetime.datetime.fromisoformat(str(ts_str).replace("Z", "+00:00"))
                except:
                    pub_dt = None
            else:
                pub_dt = None
                
            # Filter last 7 days
            if pub_dt and pub_dt >= SEVEN_DAYS_AGO:
                text = item.get("text", "") or item.get("message", "") or ""
                url = item.get("url", "") or item.get("postUrl", "")
                likes = item.get("likes", 0) or item.get("likesCount", 0) or 0
                shares = item.get("shares", 0) or item.get("sharesCount", 0) or 0
                comments = item.get("comments", 0) or item.get("commentsCount", 0) or 0
                
                person_posts.append({
                    "text": text[:300],
                    "url": url,
                    "likes": likes,
                    "comments": comments,
                    "shares": shares,
                    "engagement": likes + comments + shares,
                    "date": pub_dt.strftime("%b %d, %Y")
                })
                
        person_posts.sort(key=lambda x: x["engagement"], reverse=True)
        fb_results[name] = person_posts[:3]

except Exception as e:
    print("Error during FB Scraping:", e)

with open('facebook_results.json', 'w', encoding='utf-8') as f:
    json.dump(fb_results, f, indent=2)

print("\nApify Facebook and Instagram Scraping Finished!")
