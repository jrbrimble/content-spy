import os
import httpx
from db_write import get_client

client = get_client()

def deduplicate_table(table_name: str, unique_key: str = "url"):
    print(f"Deduplicating {table_name}...")
    response = client.table(table_name).select("*").execute()
    posts = response.data
    
    seen = set()
    to_delete = []
    
    for p in posts:
        # Use competitor_id + unique_key as the uniqueness constraint
        # Or just url if url is globally unique. url is safer.
        key = (p["competitor_id"], p.get(unique_key, p.get("text", p.get("caption", p["id"]))))
        
        if key in seen:
            to_delete.append(p["id"])
        else:
            seen.add(key)
            
    print(f"Found {len(to_delete)} duplicate rows in {table_name}.")
    
    # Delete duplicates in chunks
    chunk_size = 50
    for i in range(0, len(to_delete), chunk_size):
        chunk = to_delete[i:i+chunk_size]
        client.table(table_name).delete().in_("id", chunk).execute()
        
    print(f"Deleted {len(to_delete)} duplicates from {table_name}.\n")

if __name__ == "__main__":
    deduplicate_table("youtube_posts", "url")
    deduplicate_table("twitter_posts", "url")
    deduplicate_table("instagram_posts", "url")
    deduplicate_table("facebook_posts", "url")
    print("Deduplication complete!")
