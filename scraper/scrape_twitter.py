"""
Twitter/X scraper — reads pre-scraped Twitter data from twitter_data.json and writes to Supabase.
"""
import os
import json
import datetime
from db_write import get_competitor_id, write_twitter_posts

DATA_FILE = os.path.join(os.path.dirname(__file__), "twitter_data.json")

def run():
    print("=== Twitter/X Scraper ===")
    if not os.path.exists(DATA_FILE):
        print(f"  WARNING: Twitter data file not found: {DATA_FILE}")
        return

    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"  ERROR reading Twitter data: {e}")
        return

    for slug, posts in data.items():
        print(f"\nProcessing Twitter for: {slug}")
        competitor_id = get_competitor_id(slug)
        if not competitor_id:
            print(f"  WARNING: Competitor not found in DB: {slug}")
            continue
        print(f"  Writing {len(posts)} tweet(s) to Supabase")
        write_twitter_posts(competitor_id, posts)
    print("\nTwitter scraping complete.")


if __name__ == "__main__":
    run()
