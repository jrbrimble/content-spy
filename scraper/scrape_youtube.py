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
    ydl_opts_flat = {
        "extract_flat": True,
        "quiet": True,
        "playlistend": 10,
        "nocheckcertificate": True,
    }
    ydl_opts_video = {
        "quiet": True,
        "nocheckcertificate": True,
    }

    with yt_dlp.YoutubeDL(ydl_opts_flat) as ydl, yt_dlp.YoutubeDL(ydl_opts_video) as ydl_vid:
        try:
            info = ydl.extract_info(f"{channel_url}/videos", download=False)
            if not info or "entries" not in info:
                return []
            for entry in info.get("entries", []):
                if not entry:
                    continue

                video_id = entry.get("id") or ""
                if not video_id:
                    continue
                url = f"https://www.youtube.com/watch?v={video_id}"

                # Fetch exact metadata for this video to get accurate upload date & views
                try:
                    vid_info = ydl_vid.extract_info(url, download=False)
                except Exception:
                    vid_info = entry

                ud = vid_info.get("upload_date")
                ts = vid_info.get("timestamp") or vid_info.get("release_timestamp")

                pub_dt = None
                if ud and len(str(ud)) == 8:
                    try:
                        pub_dt = datetime.datetime.strptime(str(ud), "%Y%m%d").replace(tzinfo=datetime.timezone.utc)
                    except Exception:
                        pass
                if not pub_dt and ts:
                    try:
                        pub_dt = datetime.datetime.fromtimestamp(ts, tz=datetime.timezone.utc)
                    except Exception:
                        pass

                # Filter strictly within last 14 days if date is known
                if pub_dt and pub_dt < FOURTEEN_DAYS_AGO:
                    continue

                date_str = pub_dt.strftime("%Y-%m-%d") if pub_dt else None

                videos.append({
                    "title": vid_info.get("title") or entry.get("title", ""),
                    "url": url,
                    "views": vid_info.get("view_count") or entry.get("view_count") or 0,
                    "date": date_str,
                    "description": (vid_info.get("description") or entry.get("description") or "")[:2000],
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
