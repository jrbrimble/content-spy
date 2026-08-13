import json
from apify_client import ApifyClient

API_TOKEN = os.environ.get("APIFY_API_KEY", "")
client = ApifyClient(API_TOKEN)

# Get the latest run of facebook-posts-scraper
runs = list(client.actor("apify/facebook-posts-scraper").runs().list().items)
if runs:
    latest_run = runs[0]
    dataset_id = getattr(latest_run, "default_dataset_id", getattr(latest_run, "defaultDatasetId", None))
    items = list(client.dataset(dataset_id).iterate_items())
    print(f"Total FB items: {len(items)}")
    if items:
        # Print sample fields of first item
        print("Sample item keys:", items[0].keys())
        # Print page identifiers for all items
        for item in items[:10]:
            print("URL/User:", item.get("url"), item.get("postUrl"), item.get("user"), item.get("facebookUrl"), item.get("pageName"))
