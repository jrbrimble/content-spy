"""
YouTube scraper — fetches last 14 days of videos and writes to Supabase.
"""
import datetime
import yt_dlp
from db_write import get_client, write_youtube_posts

CURRENT_DATE = datetime.datetime.now(datetime.timezone.utc)
FOURTEEN_DAYS_AGO = CURRENT_DATE - datetime.timedelta(days=14)

ydl_opts = {
    "extract_flat": True,
    "quiet": True,
    "playlistend": 10,
    "nocheckcertificate": True,
}


def fetch_youtube(slug: str, channel_url: str) -> list[dict]:
    videos = []
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info = ydl.extract_info(f"{channel_url}/videos", download=False)
            if not info or "entries" not in info:
                return []
            for entry in info.get("entries", []):
                if not entry:
                    continue
                
                # Extract date from timestamp or default to today
                ts = entry.get("timestamp")
                if ts:
                    pub_dt = datetime.datetime.fromtimestamp(ts, tz=datetime.timezone.utc)
                else:
                    pub_dt = CURRENT_DATE

                video_id = entry.get("id") or ""
                url = f"https://www.youtube.com/watch?v={video_id}" if video_id else entry.get("url", "")
                
                videos.append({
                    "title": entry.get("title", ""),
                    "url": url,
                    "views": entry.get("view_count") or 0,
                    "date": pub_dt.strftime("%Y-%m-%d"),
                    "description": (entry.get("description") or "")[:2000],
                })
        except Exception as e:
            print(f"  ERROR fetching YouTube for {slug}: {e}")
    videos.sort(key=lambda x: x["views"], reverse=True)
    return videos[:3]


def run():
    print("=== YouTube Scraper ===")
    client = get_client()
    try:
        competitors = client.table("competitors").select("id, name, slug, youtube_url").execute().data or []
    except Exception as e:
        print(f"  ERROR fetching competitors from DB: {e}")
        return

    for comp in competitors:
        competitor_id = comp["id"]
        slug = comp["slug"]
        url = comp.get("youtube_url")
        if not url:
            print(f"\nSkipping {slug} (no YouTube URL configured)")
            continue

        print(f"\nFetching YouTube for: {slug} ({url})")
        posts = fetch_youtube(slug, url)
        print(f"  Found {len(posts)} video(s)")
        write_youtube_posts(competitor_id, posts)
    print("\nYouTube scraping complete.")


if __name__ == "__main__":
    run()
