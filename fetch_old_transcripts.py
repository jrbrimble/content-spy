from apify_client import ApifyClient
from db_write import get_client
import json

APIFY_TOKEN = os.environ.get("APIFY_API_KEY", "")
apify = ApifyClient(APIFY_TOKEN)
db = get_client()

actor = apify.actor("trakk/instagram-transcript-scraper-reels-monitor").get()
print("Actor ID:", actor.id)

runs = apify.actor(actor.id).runs().list(limit=5, desc=True).items
for run in runs:
    dataset_id = run.default_dataset_id
    items = list(apify.dataset(dataset_id).iterate_items())
    print(f"Run {run.id} has {len(items)} items in dataset {dataset_id}")
    
    # Check if there are transcripts
    updates = 0
    for item in items:
        url = item.get("url") or item.get("reelUrl")
        transcript = item.get("transcript") or item.get("text") or item.get("transcription")
        
        if url and transcript:
            # We must find the corresponding post in the database
            # Extract shortcode
            sc = url.rstrip("/").split("/")[-1]
            
            # Find the row in supabase where url like %shortcode%
            result = db.table("instagram_posts").select("id").like("url", f"%{sc}%").execute()
            if result.data:
                db.table("instagram_posts").update({"transcript": transcript.strip()}).eq("id", result.data[0]["id"]).execute()
                updates += 1
                
    if updates > 0:
        print(f"Restored {updates} transcripts from this dataset!")
        break
