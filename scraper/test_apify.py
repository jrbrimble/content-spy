from apify_client import ApifyClient

API_TOKEN = os.environ.get("APIFY_API_KEY", "")
client = ApifyClient(API_TOKEN)

print("Testing Instagram Scraper...")
run_input = {
    "directUrls": ["https://www.instagram.com/danmartell/"],
    "resultsType": "posts",
    "resultsLimit": 5,
}

try:
    run = client.actor("apify/instagram-scraper").call(run_input=run_input)
    print("Instagram run completed!")
    items = list(client.dataset(run["defaultDatasetId"]).iterate_items())
    print(f"Fetched {len(items)} Instagram posts.")
    if items:
        print("Sample IG post:", items[0].get("caption"), items[0].get("url"), items[0].get("likesCount"), items[0].get("timestamp"))
except Exception as e:
    print("IG Error:", e)

print("\nTesting Facebook Scraper...")
fb_input = {
    "startUrls": [{"url": "https://www.facebook.com/danmartell"}],
    "resultsLimit": 5,
}

try:
    run_fb = client.actor("apify/facebook-posts-scraper").call(run_input=fb_input)
    print("FB run completed!")
    fb_items = list(client.dataset(run_fb["defaultDatasetId"]).iterate_items())
    print(f"Fetched {len(fb_items)} FB posts.")
    if fb_items:
        print("Sample FB post:", fb_items[0])
except Exception as e:
    print("FB Error:", e)
