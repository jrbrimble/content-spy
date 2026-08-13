import datetime
import yt_dlp
import json

YOUTUBE_URLS = {
    "Dan Martell": "https://www.youtube.com/@danmartell",
    "Rick Mulready": "https://www.youtube.com/@RickMulready",
    "Eric Siu": "https://www.youtube.com/@LevelingUpOfficial",
    "AI Show Podcast": "https://www.youtube.com/@aishowpod",
    "Sabrina Ramonov": "https://www.youtube.com/@sabrina_ramonov",
    "Sean Standberry (LYFE Marketing)": "https://www.youtube.com/@SeanStandberry"
}

CURRENT_DATE = datetime.datetime.fromisoformat("2026-08-07T15:10:09+01:00")
FOURTEEN_DAYS_AGO = CURRENT_DATE - datetime.timedelta(days=14)

results = {}

ydl_opts = {
    'extract_flat': False, # get detailed info including description and view count
    'quiet': True,
    'playlistend': 10,
    'nocheckcertificate': True
}

for name, channel_url in YOUTUBE_URLS.items():
    print(f"Fetching YouTube for {name}...")
    videos = []
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info = ydl.extract_info(f"{channel_url}/videos", download=False)
            if info and 'entries' in info:
                for entry in info['entries']:
                    if not entry:
                        continue
                    upload_date_str = entry.get('upload_date')
                    if upload_date_str:
                        pub_dt = datetime.datetime.strptime(upload_date_str, "%Y%m%d").replace(tzinfo=datetime.timezone.utc)
                    else:
                        pub_dt = None
                    
                    # Filter for last 14 days
                    if pub_dt and pub_dt >= FOURTEEN_DAYS_AGO:
                        videos.append({
                            'title': entry.get('title'),
                            'url': f"https://www.youtube.com/watch?v={entry.get('id')}",
                            'views': entry.get('view_count', 0),
                            'date': pub_dt.strftime("%b %d, %Y"),
                            'description': entry.get('description', '')[:300] if entry.get('description') else ''
                        })
        except Exception as e:
            print(f"Error fetching {name}: {e}")
            
    # Sort by views descending
    videos.sort(key=lambda x: x['views'], reverse=True)
    results[name] = videos[:3]

with open('youtube_results.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2)

print("YouTube scraping completed!")
