"""
YouTube scraper — fetches last 14 days of videos and writes to Supabase.
"""
import datetime
import yt_dlp
from db_write import get_competitor_id, write_youtube_posts

CURRENT_DATE = datetime.datetime.now(datetime.timezone.utc)
FOURTEEN_DAYS_AGO = CURRENT_DATE - datetime.timedelta(days=14)

CHANNELS = {
    "dan-martell":       "https://www.youtube.com/@danmartell",
    "rick-mulready":     "https://www.youtube.com/@RickMulready",
    "eric-siu":          "https://www.youtube.com/@LevelingUpOfficial",
    "ai-show-podcast":   "https://www.youtube.com/@aishowpod",
    "sabrina-ramonov":   "https://www.youtube.com/@sabrina_ramonov",
    "sean-standberry":   "https://www.youtube.com/@SeanStandberry",
}

ydl_opts = {
    "extract_flat": False,
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
            for entry in info["entries"]:
                if not entry:
                    continue
                upload_date_str = entry.get("upload_date")
                if not upload_date_str:
                    continue
                pub_dt = datetime.datetime.strptime(upload_date_str, "%Y%m%d").replace(
                    tzinfo=datetime.timezone.utc
                )
                if pub_dt < FOURTEEN_DAYS_AGO:
                    continue
                videos.append({
                    "title": entry.get("title", ""),
                    "url": f"https://www.youtube.com/watch?v={entry.get('id', '')}",
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
    for slug, url in CHANNELS.items():
        print(f"\nFetching: {slug}")
        competitor_id = get_competitor_id(slug)
        if not competitor_id:
            print(f"  WARNING: Competitor not found in DB: {slug}")
            continue
        posts = fetch_youtube(slug, url)
        print(f"  Found {len(posts)} video(s) in last 14 days")
        write_youtube_posts(competitor_id, posts)
    print("\nYouTube scraping complete.")


if __name__ == "__main__":
    run()
