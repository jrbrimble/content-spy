from apify_client import ApifyClient

API_TOKEN = os.environ.get("APIFY_API_KEY", "")
client = ApifyClient(API_TOKEN)

run = client.run("4E0aYqdrTRweRRvIH").get()
dataset_id = getattr(run, "default_dataset_id", getattr(run, "defaultDatasetId", None))
print("Dataset ID:", dataset_id)
items = list(client.dataset(dataset_id).iterate_items())
print("Total items:", len(items))

for i, item in enumerate(items[:10]):
    print(f"\nItem {i+1}:")
    print("Keys:", list(item.keys()))
    print("Page/URL:", item.get("facebookUrl"), item.get("url"), item.get("pageUrl"), item.get("user"))
