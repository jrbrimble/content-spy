"""
Instagram + Facebook scraper using Apify.
Detects Reels, fetches transcripts via Apify trakk actor, writes all to Supabase.
"""
import os
import datetime
from apify_client import ApifyClient
from db_write import get_client, get_competitor_id, write_instagram_posts, write_facebook_posts

APIFY_TOKEN = os.environ.get("APIFY_API_KEY", "")
client = ApifyClient(APIFY_TOKEN)

CURRENT_DATE = datetime.datetime.now(datetime.timezone.utc)
THIRTY_DAYS_AGO = CURRENT_DATE - datetime.timedelta(days=30)


def load_profiles() -> dict[str, dict]:
    db = get_client()
    try:
        competitors = db.table("competitors").select("id, name, slug, instagram_url, facebook_url").execute().data or []
    except Exception as e:
        print(f"  ERROR loading competitors from DB: {e}")
        return {}

    profiles = {}
    for comp in competitors:
        slug = comp["slug"]
        profiles[slug] = {
            "instagram": comp.get("instagram_url") or "",
            "facebook": comp.get("facebook_url") or "",
            "name": comp.get("name") or "",
        }
    return profiles


def _get_dataset_id(run):
    """Safely extract defaultDatasetId from an Apify run object or dict."""
    if isinstance(run, dict):
        return run.get("defaultDatasetId")
    return getattr(run, "default_dataset_id", getattr(run, "defaultDatasetId", None))


def parse_ts(ts) -> datetime.datetime | None:
    if not ts:
        return None
    try:
        if isinstance(ts, int):
            return datetime.datetime.fromtimestamp(ts, tz=datetime.timezone.utc)
        return datetime.datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
    except Exception:
        return None


# ─── Instagram ───────────────────────────────────────────────

def scrape_instagram(profiles: dict[str, dict]) -> dict[str, list[dict]]:
    print("Launching Apify Instagram scraper for all profiles...")
    ig_urls = [data["instagram"] for data in profiles.values() if data.get("instagram")]
    if not ig_urls:
        print("  No Instagram URLs configured.")
        return {slug: [] for slug in profiles}

    run_input = {
        "directUrls": ig_urls,
        "resultsType": "posts",
        "resultsLimit": 15,
    }
    run = client.actor("apify/instagram-scraper").call(run_input=run_input)
    items = list(client.dataset(_get_dataset_id(run)).iterate_items())
    print(f"  Total IG items fetched: {len(items)}")

    results: dict[str, list[dict]] = {slug: [] for slug in profiles}

    for item in items:
        owner = (item.get("ownerUsername") or "").lower()
        input_url = (item.get("inputUrl") or "").lower()
        item_url = (item.get("url") or "").lower()

        slug = None
        for s, data in profiles.items():
            if not data.get("instagram"):
                continue
            handle = data["instagram"].rstrip("/").split("/")[-1].lower()
            if handle and (handle in owner or handle in input_url or handle in item_url):
                slug = s
                break
        if not slug:
            continue

        pub_dt = parse_ts(item.get("timestamp")) or CURRENT_DATE
        if pub_dt < THIRTY_DAYS_AGO:
            continue

        # Detect reel/video
        is_reel = item.get("isVideo", False) or item.get("type", "") in ("Video", "Reel")

        raw_url = item.get("url") or item.get("shortCode") or ""
        if raw_url and not raw_url.startswith("http"):
            if is_reel:
                raw_url = f"https://www.instagram.com/reel/{raw_url}/"
            else:
                raw_url = f"https://www.instagram.com/p/{raw_url}/"

        results[slug].append({
            "caption": (item.get("caption") or ""),
            "url": raw_url,
            "likes": item.get("likesCount") or 0,
            "comments": item.get("commentsCount") or 0,
            "is_reel": is_reel,
            "transcript": None,  # filled in next step
            "date": pub_dt.strftime("%Y-%m-%d"),
            "video_url": item.get("videoUrl") or raw_url,
        })

    # Sort by engagement
    for slug in results:
        results[slug].sort(
            key=lambda x: x["likes"] + x["comments"], reverse=True
        )
        results[slug] = results[slug][:3]

    return results


def fetch_reel_transcripts(ig_results: dict[str, list[dict]]) -> dict[str, list[dict]]:
    """For each Reel, call the Apify transcript actor to get text."""
    reel_urls = []
    # Build a shortcode dictionary to match transcripts reliably regardless of /p/ or /reel/ URL formats
    shortcode_to_post = {}
    for slug, posts in ig_results.items():
        for post in posts:
            if post["is_reel"] and post.get("url"):
                sc = post["url"].rstrip("/").split("/")[-1]
                shortcode_to_post[sc] = post
                reel_urls.append(post["url"])

    if not reel_urls:
        print("  No Reels found — skipping transcript step.")
        return ig_results

    print(f"  Fetching transcripts for {len(reel_urls)} Reel(s)...")
    if not reel_urls:
        return ig_results
        
    try:
        # We must format the URLs exactly as requestListSources expects: [{'url': '...'}]
        # Using mode='urls' to fetch exact posts instead of profile monitoring
        target_urls = [{"url": url} for url in reel_urls]
        
        run_input = {
            "mode": "urls",
            "urls": target_urls,
        }
        run = client.actor("trakk/instagram-transcript-scraper-reels-monitor").call(
            run_input=run_input
        )
        transcript_items = list(client.dataset(_get_dataset_id(run)).iterate_items())
        print(f"  Transcripts received: {len(transcript_items)}")
        print(f"  Target shortcodes: {list(shortcode_to_post.keys())}")

        for t_item in transcript_items:
            t_url = t_item.get("url") or t_item.get("reelUrl") or ""
            print(f"  Received transcript URL: {t_url}")
            if not t_url:
                continue
            sc = t_url.rstrip("/").split("/")[-1]
            print(f"  Parsed shortcode: {sc}")
            
            transcript_text = (
                t_item.get("transcript")
                or t_item.get("text")
                or t_item.get("transcription")
                or ""
            )
            if sc in shortcode_to_post:
                shortcode_to_post[sc]["transcript"] = transcript_text.strip() or None
                print(f"  -> Matched and assigned transcript for {sc}!")
            else:
                print(f"  -> {sc} not in shortcode_to_post keys")

    except Exception as e:
        print(f"  WARNING: Transcript actor failed: {e}")

    return ig_results


# ─── Facebook ────────────────────────────────────────────────

def scrape_facebook(profiles: dict[str, dict]) -> dict[str, list[dict]]:
    print("Launching Apify Facebook scraper for all pages...")
    fb_urls = [{"url": data["facebook"]} for data in profiles.values() if data.get("facebook")]
    if not fb_urls:
        print("  No Facebook URLs configured.")
        return {slug: [] for slug in profiles}

    run_input = {
        "startUrls": fb_urls,
        "resultsLimit": 15,
    }
    run = client.actor("apify/facebook-posts-scraper").call(run_input=run_input)
    items = list(client.dataset(_get_dataset_id(run)).iterate_items())
    print(f"  Total FB items fetched: {len(items)}")

    results: dict[str, list[dict]] = {slug: [] for slug in profiles}

    for item in items:
        fb_url = (item.get("facebookUrl") or item.get("inputUrl") or item.get("url") or "").lower()
        user_name = (item.get("user", {}).get("name") or item.get("pageName") or "").lower()

        slug = None
        for s, data in profiles.items():
            if not data.get("facebook"):
                continue
            handle = data["facebook"].rstrip("/").split("/")[-1].lower()
            name_kw = data.get("name", "").lower()
            if handle and (handle in fb_url or handle in user_name) or (name_kw and name_kw in user_name):
                slug = s
                break

        if not slug:
            continue

        pub_dt = parse_ts(item.get("timestamp") or item.get("time")) or CURRENT_DATE
        if pub_dt < THIRTY_DAYS_AGO:
            continue

        results[slug].append({
            "text": (item.get("text") or item.get("message") or "").strip(),
            "url": item.get("url") or item.get("postUrl") or "",
            "likes": item.get("likes") or 0,
            "comments": item.get("comments") or 0,
            "shares": item.get("shares") or 0,
            "date": pub_dt.strftime("%Y-%m-%d"),
        })

    # Deduplicate, sort, limit
    for slug in results:
        seen = set()
        unique = []
        for p in results[slug]:
            if p["url"] not in seen:
                seen.add(p["url"])
                unique.append(p)
        unique.sort(key=lambda x: x["likes"] + x["comments"] + x["shares"], reverse=True)
        results[slug] = unique[:3]

    return results


# ─── Run ─────────────────────────────────────────────────────

def run():
    print("=== Instagram + Facebook Scraper ===\n")
    profiles = load_profiles()
    if not profiles:
        print("  WARNING: No active profiles loaded from DB.")
        return

    # Instagram
    print("--- Instagram ---")
    ig_results = scrape_instagram(profiles)
    ig_results = fetch_reel_transcripts(ig_results)

    for slug, posts in ig_results.items():
        competitor_id = get_competitor_id(slug)
        if not competitor_id:
            print(f"  WARNING: Competitor not found: {slug}")
            continue
        print(f"\nWriting Instagram for {slug}: {len(posts)} post(s)")
        write_instagram_posts(competitor_id, posts)

    # Facebook
    print("\n--- Facebook ---")
    fb_results = scrape_facebook(profiles)

    for slug, posts in fb_results.items():
        competitor_id = get_competitor_id(slug)
        if not competitor_id:
            print(f"  WARNING: Competitor not found: {slug}")
            continue
        print(f"\nWriting Facebook for {slug}: {len(posts)} post(s)")
        write_facebook_posts(competitor_id, posts)

    print("\nInstagram + Facebook scraping complete.")


if __name__ == "__main__":
    run()
