"""
Shared Supabase write helpers for Content Spy pipeline.
Set environment variables before running:
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_KEY=your-anon-key
"""
import os
import httpx

# Fix SSL certificate verification on Windows Python 3.14 for httpx (used by Supabase)
original_client_init = httpx.Client.__init__
httpx.Client.__init__ = lambda self, *args, **kwargs: original_client_init(self, *args, **{**kwargs, 'verify': False})
original_async_client_init = httpx.AsyncClient.__init__
httpx.AsyncClient.__init__ = lambda self, *args, **kwargs: original_async_client_init(self, *args, **{**kwargs, 'verify': False})

os.environ.setdefault("SUPABASE_URL", "https://rbjzruynjahyvpzkcvgf.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "sb_publishable_-T34HLnZo5KSaeoVZF9oYQ_DbuAVOnn")

import datetime
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL") or "https://rbjzruynjahyvpzkcvgf.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_KEY") or "sb_publishable_-T34HLnZo5KSaeoVZF9oYQ_DbuAVOnn"

_client: Client = None

def get_client() -> Client:
    global _client
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError(
                "Missing SUPABASE_URL or SUPABASE_KEY environment variables.\n"
                "Set them before running: set SUPABASE_URL=https://... and set SUPABASE_KEY=..."
            )
        _client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _client


def get_competitor_id(slug: str) -> str | None:
    """Lookup competitor ID by slug."""
    client = get_client()
    result = client.table("competitors").select("id").eq("slug", slug).single().execute()
    if result.data:
        return result.data["id"]
    return None


def clear_posts_for_competitor(competitor_id: str):
    """Delete all existing posts for a competitor before re-inserting."""
    client = get_client()
    client.table("youtube_posts").delete().eq("competitor_id", competitor_id).execute()
    client.table("twitter_posts").delete().eq("competitor_id", competitor_id).execute()
    client.table("instagram_posts").delete().eq("competitor_id", competitor_id).execute()
    client.table("facebook_posts").delete().eq("competitor_id", competitor_id).execute()
    print(f"  Cleared old posts for competitor {competitor_id}")


def write_youtube_posts(competitor_id: str, posts: list[dict]):
    """Upsert YouTube posts for a competitor."""
    client = get_client()
    client.table("youtube_posts").delete().eq("competitor_id", competitor_id).execute()
    rows = []
    for p in posts:
        rows.append({
            "competitor_id": competitor_id,
            "title": p.get("title", ""),
            "url": p.get("url", ""),
            "views": p.get("views") or 0,
            "published_at": p.get("date"),
            "description": (p.get("description") or "")[:2000],
            "scraped_at": datetime.datetime.utcnow().isoformat()
        })
    if rows:
        client.table("youtube_posts").insert(rows).execute()
        print(f"  Wrote {len(rows)} YouTube posts")


def write_twitter_posts(competitor_id: str, posts: list[dict]):
    """Upsert Twitter posts for a competitor."""
    client = get_client()
    client.table("twitter_posts").delete().eq("competitor_id", competitor_id).execute()
    rows = []
    for p in posts:
        rows.append({
            "competitor_id": competitor_id,
            "text": p.get("text", ""),
            "url": p.get("url", ""),
            "views": int(str(p.get("views") or "0").replace(",", "")) if p.get("views") else 0,
            "published_at": p.get("date"),
            "scraped_at": datetime.datetime.utcnow().isoformat()
        })
    if rows:
        client.table("twitter_posts").insert(rows).execute()
        print(f"  Wrote {len(rows)} Twitter posts")


def write_instagram_posts(competitor_id: str, posts: list[dict]):
    """Upsert Instagram posts for a competitor."""
    client = get_client()
    client.table("instagram_posts").delete().eq("competitor_id", competitor_id).execute()
    rows = []
    for p in posts:
        rows.append({
            "competitor_id": competitor_id,
            "caption": p.get("caption") or p.get("text", ""),
            "url": p.get("url", ""),
            "likes": p.get("likes") or 0,
            "comments": p.get("comments") or 0,
            "is_reel": p.get("is_reel", False),
            "transcript": p.get("transcript"),
            "published_at": p.get("date"),
            "scraped_at": datetime.datetime.utcnow().isoformat()
        })
    if rows:
        client.table("instagram_posts").insert(rows).execute()
        print(f"  Wrote {len(rows)} Instagram posts")


def write_facebook_posts(competitor_id: str, posts: list[dict]):
    """Upsert Facebook posts for a competitor."""
    client = get_client()
    client.table("facebook_posts").delete().eq("competitor_id", competitor_id).execute()
    rows = []
    for p in posts:
        rows.append({
            "competitor_id": competitor_id,
            "text": p.get("text", ""),
            "url": p.get("url", ""),
            "likes": p.get("likes") or 0,
            "comments": p.get("comments") or 0,
            "shares": p.get("shares") or 0,
            "published_at": p.get("date"),
            "scraped_at": datetime.datetime.utcnow().isoformat()
        })
    if rows:
        client.table("facebook_posts").insert(rows).execute()
        print(f"  Wrote {len(rows)} Facebook posts")


def write_viral_posts(posts: list[dict]):
    """Insert or update viral posts for a niche."""
    client = get_client()
    rows = []
    for p in posts:
        rows.append({
            "niche": p.get("niche", "AI Agents"),
            "platform": p.get("platform", "instagram"),
            "creator_name": p.get("creator_name", ""),
            "creator_handle": p.get("creator_handle", ""),
            "caption": (p.get("caption") or "")[:2000],
            "url": p.get("url", ""),
            "views": p.get("views") or 0,
            "likes": p.get("likes") or 0,
            "estimated_reach": p.get("estimated_reach") or 0,
            "published_at": p.get("published_at") or p.get("date"),
            "scraped_at": datetime.datetime.utcnow().isoformat()
        })
    if rows:
        # Delete old viral posts for this niche and platform before writing fresh top 10
        niche = posts[0].get("niche", "AI Agents") if posts else "AI Agents"
        platform = posts[0].get("platform") if posts else None
        if platform:
            client.table("viral_posts").delete().eq("niche", niche).eq("platform", platform).execute()
        client.table("viral_posts").insert(rows).execute()
        print(f"  Wrote {len(rows)} viral posts to DB")
