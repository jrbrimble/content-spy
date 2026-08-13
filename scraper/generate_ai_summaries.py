import os
import datetime
import time
import httpx
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Patch httpx SSL verification (required on this machine's Python 3.14)
_orig_client = httpx.Client.__init__
httpx.Client.__init__ = lambda self, *a, **kw: _orig_client(self, *a, **{**kw, 'verify': False})
_orig_async = httpx.AsyncClient.__init__
httpx.AsyncClient.__init__ = lambda self, *a, **kw: _orig_async(self, *a, **{**kw, 'verify': False})

os.environ.setdefault("SUPABASE_URL", "https://rbjzruynjahyvpzkcvgf.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "sb_publishable_-T34HLnZo5KSaeoVZF9oYQ_DbuAVOnn")

from db_write import get_client
from google import genai

GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = "gemini-3.1-flash-lite"


def build_prompt(competitor_name: str, posts: dict) -> str:
    lines = [
        f"You are a sharp marketing intelligence analyst. Summarise the recent content activity of '{competitor_name}' based on the data below.",
        "Write 2-3 punchy sentences (max 80 words total) highlighting: what topics/themes they're focusing on, their most engaging content, and any notable patterns or strategies visible.",
        "Be specific and insightful — avoid vague generalities. If a platform has no data, skip it entirely.\n",
    ]

    if posts.get("youtube"):
        lines.append("YouTube (last 14 days):")
        for p in posts["youtube"][:3]:
            lines.append(f'  - "{p.get("title","")}" ({p.get("views", 0):,} views, {p.get("published_at", "")})')

    if posts.get("twitter"):
        lines.append("Twitter/X (last 7 days):")
        for p in posts["twitter"][:3]:
            text = (p.get("text") or "")[:120]
            lines.append(f'  - "{text}"')

    if posts.get("instagram"):
        lines.append("Instagram (last 7 days):")
        for p in posts["instagram"][:3]:
            cap = (p.get("caption") or "")[:120]
            transcript = p.get("transcript")
            tag = " [Reel]" if p.get("is_reel") else ""
            line = f'  -{tag} "{cap}"'
            if transcript:
                line += f' | Transcript: "{transcript[:100]}"'
            lines.append(line)

    if posts.get("facebook"):
        lines.append("Facebook (last 7 days):")
        for p in posts["facebook"][:3]:
            text = (p.get("text") or "")[:120]
            lines.append(f'  - "{text}" ({p.get("likes", 0)} likes)')

    return "\n".join(lines)


def generate_summary(prompt: str) -> str:
    client = genai.Client(api_key=GEMINI_KEY)
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
    )
    return response.text.strip()



def run():
    if not GEMINI_KEY:
        print("ERROR: GEMINI_API_KEY not set. Please add it to your environment.")
        return

    db = get_client()
    competitors = db.table("competitors").select("*").execute().data

    for i, comp in enumerate(competitors):
        comp_id = comp["id"]
        name = comp["name"]
        print(f"\nGenerating AI summary for {name}...")

        yt = db.table("youtube_posts").select("*").eq("competitor_id", comp_id).order("published_at", desc=True).limit(5).execute().data
        tw = db.table("twitter_posts").select("*").eq("competitor_id", comp_id).order("published_at", desc=True).limit(5).execute().data
        ig = db.table("instagram_posts").select("*").eq("competitor_id", comp_id).order("published_at", desc=True).limit(5).execute().data
        fb = db.table("facebook_posts").select("*").eq("competitor_id", comp_id).order("published_at", desc=True).limit(5).execute().data

        posts = {"youtube": yt, "twitter": tw, "instagram": ig, "facebook": fb}
        total_posts = sum(len(v) for v in posts.values())

        if total_posts == 0:
            summary = "No recent content activity detected across any tracked platforms in this period."
        else:
            prompt = build_prompt(name, posts)
            try:
                summary = generate_summary(prompt)
                print(f"  OK: {summary[:80]}...")
            except Exception as e:
                print(f"  FAILED: {e}")
                summary = None

        if summary:
            db.table("competitors").update({
                "ai_summary": summary,
                "ai_summary_at": datetime.datetime.utcnow().isoformat()
            }).eq("id", comp_id).execute()
            print(f"  Saved to Supabase.")

        # Small delay to be safe with rate limits (free tier = 15 req/min)
        if i < len(competitors) - 1:
            time.sleep(2)

    print("\nAI summary generation complete.")


if __name__ == "__main__":
    run()
