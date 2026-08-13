import json
import re
import datetime
from bs4 import BeautifulSoup
import yt_dlp
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

TWITTER_FILES = {
    "Dan Martell": r"C:\Users\jrbri\.gemini\antigravity\brain\4e077980-55c5-4679-bd1f-3344bb9be29c\.system_generated\steps\52\content.md",
    "Rick Mulready": r"C:\Users\jrbri\.gemini\antigravity\brain\4e077980-55c5-4679-bd1f-3344bb9be29c\.system_generated\steps\58\content.md",
    "Eric Siu": r"C:\Users\jrbri\.gemini\antigravity\brain\4e077980-55c5-4679-bd1f-3344bb9be29c\.system_generated\steps\59\content.md",
    "AI Show Podcast": r"C:\Users\jrbri\.gemini\antigravity\brain\4e077980-55c5-4679-bd1f-3344bb9be29c\.system_generated\steps\60\content.md",
    "Sabrina Ramonov": r"C:\Users\jrbri\.gemini\antigravity\brain\4e077980-55c5-4679-bd1f-3344bb9be29c\.system_generated\steps\61\content.md",
    "Lyfe Marketing": r"C:\Users\jrbri\.gemini\antigravity\brain\4e077980-55c5-4679-bd1f-3344bb9be29c\.system_generated\steps\62\content.md"
}

YOUTUBE_URLS = {
    "Dan Martell": "https://www.youtube.com/@danmartell",
    "Rick Mulready": "https://www.youtube.com/@RickMulready",
    "Eric Siu": "https://www.youtube.com/@EricSiu",
    "AI Show Podcast": "https://www.youtube.com/@MarketingAIInstitute",
    "Sabrina Ramonov": "https://www.youtube.com/@sabrina_ramonov",
    "Lyfe Marketing": "https://www.youtube.com/@LYFEMarketingAtlanta"
}

CURRENT_DATE = datetime.datetime.fromisoformat("2026-08-07T14:56:06+01:00")
SEVEN_DAYS_AGO = CURRENT_DATE - datetime.timedelta(days=7)
THIRTY_DAYS_AGO = CURRENT_DATE - datetime.timedelta(days=30)

def extract_twitter(name, file_path):
    print(f"**{name} — Top 3 Posts (Last 7 Days)**\n")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {name} file: {e}\n")
        return

    soup = BeautifulSoup(content, 'html.parser')
    articles = soup.find_all('article', attrs={'itemtype': 'https://schema.org/SocialMediaPosting'})
    
    posts = []
    for article in articles:
        # url
        url_meta = article.find('meta', itemprop='url')
        url = url_meta['content'] if url_meta else "URL unavailable"
        
        # date
        date_meta = article.find('meta', itemprop='dateCreated')
        if not date_meta:
            continue
        date_str = date_meta['content']
        try:
            pub_date = datetime.datetime.strptime(date_str, "%Y-%m-%dT%H:%M:%S.%fZ")
            pub_date = pub_date.replace(tzinfo=datetime.timezone.utc)
        except:
            continue
            
        if pub_date < SEVEN_DAYS_AGO:
            continue
            
        # text
        body = article.find('div', itemprop='articleBody')
        if body:
            text = body.get_text(separator=' ').strip()
        else:
            text = ""
            
        # exclude pure retweets unless they have substantial added comment (which usually has articleBody)
        if not text:
            continue
            
        # views or impressions
        views = 0
        view_action = article.find('div', attrs={'itemtype': 'https://schema.org/InteractionCounter'})
        # Actually need to find the one where itemprop="name" is "Views"
        counters = article.find_all('div', attrs={'itemtype': 'https://schema.org/InteractionCounter'})
        for counter in counters:
            name_meta = counter.find('meta', itemprop='name')
            if name_meta and name_meta.get('content') == 'Views':
                count_span = counter.find('span', itemprop='userInteractionCount')
                if count_span:
                    try:
                        views = int(count_span.text.replace(',', ''))
                    except:
                        pass
        
        posts.append({
            'text': text,
            'url': url,
            'views': views,
            'date': pub_date.strftime("%b %d, %Y")
        })

    posts.sort(key=lambda x: x['views'], reverse=True)
    top_posts = posts[:3]
    
    if len(posts) == 0:
        print("No posts published in the last 7 days.\n")
    else:
        if len(posts) < 3:
            print(f"Only {len(posts)} post(s) found in the last 7 days.\n")
        for i, p in enumerate(top_posts, 1):
            print(f"Post {i}:")
            print(f"- Text: {p['text']}")
            print(f"- URL: {p['url']}")
            views_str = p['views'] if p['views'] > 0 else "Metric unavailable"
            metric = "Views" if p['views'] > 0 else "N/A"
            print(f"- Views/Impressions: {views_str} ({metric})")
            print(f"- Date: {p['date']}\n")

def extract_youtube(name, channel_url):
    print(f"**{name} — 3 Most Recent Videos**\n")
    
    ydl_opts = {
        'extract_flat': True,
        'quiet': True,
        'playlistend': 3,
        'nocheckcertificate': True
    }
    
    videos = []
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info = ydl.extract_info(channel_url, download=False)
            if 'entries' in info:
                videos = list(info['entries'])
        except Exception as e:
            print(f"Error fetching YouTube: {e}\n")
            return

    # Filter for last 30 days
    recent_videos = []
    for v in videos:
        # fetch full metadata to get upload_date accurately if needed, but extract_flat might have it
        # Actually yt-dlp might just give it. Let's check 'upload_date' in v
        if 'url' not in v:
            continue
        url = v['url']
        if not url.startswith('http'):
             url = f"https://www.youtube.com/watch?v={v.get('id', '')}"
             
        title = v.get('title', 'Unknown')
        views = v.get('view_count', 'Metric unavailable')
        
        # Youtube date format is YYYYMMDD
        u_date = v.get('upload_date')
        if u_date:
            try:
                dt = datetime.datetime.strptime(u_date, "%Y%m%d").replace(tzinfo=datetime.timezone.utc)
                if dt < THIRTY_DAYS_AGO:
                    continue
                pub_date = dt.strftime("%b %d, %Y")
            except:
                pub_date = "Unknown"
        else:
            pub_date = "Unknown"
            
        recent_videos.append({
            'title': title,
            'url': url,
            'views': views,
            'date': pub_date
        })
        
    recent_videos = recent_videos[:3]
    
    if len(recent_videos) == 0:
        print("No videos published in the last 30 days.\n")
    else:
        if len(recent_videos) < 3:
            print(f"Only {len(recent_videos)} video(s) found in the last 30 days.\n")
            
        for i, p in enumerate(recent_videos, 1):
            print(f"Video {i}:")
            print(f"- Title: {p['title']}")
            print(f"- URL: {p['url']}")
            print(f"- Views: {p['views']}")
            print(f"- Published: {p['date']}\n")

print("========== YOUTUBE DATA ==========\n")
for k, v in YOUTUBE_URLS.items():
    extract_youtube(k, v)

print("========== TWITTER DATA ==========\n")
for k, v in TWITTER_FILES.items():
    extract_twitter(k, v)
