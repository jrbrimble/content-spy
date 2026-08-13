"""
Twitter/X scraper — reads previously scraped HTML files from the steps directory
and writes top 3 posts (last 7 days) to Supabase.
"""
import datetime
from bs4 import BeautifulSoup
from db_write import get_competitor_id, write_twitter_posts

CURRENT_DATE = datetime.datetime.now(datetime.timezone.utc)
SEVEN_DAYS_AGO = CURRENT_DATE - datetime.timedelta(days=7)

# Map slug → scraped HTML file path
TWITTER_FILES = {
    "dan-martell":     r"C:\Users\jrbri\.gemini\antigravity\brain\4e077980-55c5-4679-bd1f-3344bb9be29c\.system_generated\steps\52\content.md",
    "rick-mulready":   r"C:\Users\jrbri\.gemini\antigravity\brain\4e077980-55c5-4679-bd1f-3344bb9be29c\.system_generated\steps\58\content.md",
    "eric-siu":        r"C:\Users\jrbri\.gemini\antigravity\brain\4e077980-55c5-4679-bd1f-3344bb9be29c\.system_generated\steps\59\content.md",
    "ai-show-podcast": r"C:\Users\jrbri\.gemini\antigravity\brain\4e077980-55c5-4679-bd1f-3344bb9be29c\.system_generated\steps\60\content.md",
    "sabrina-ramonov": r"C:\Users\jrbri\.gemini\antigravity\brain\4e077980-55c5-4679-bd1f-3344bb9be29c\.system_generated\steps\61\content.md",
    "sean-standberry": r"C:\Users\jrbri\.gemini\antigravity\brain\4e077980-55c5-4679-bd1f-3344bb9be29c\.system_generated\steps\62\content.md",
}


def parse_twitter_file(file_path: str) -> list[dict]:
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:
        print(f"  Could not read {file_path}: {e}")
        return []

    soup = BeautifulSoup(content, "html.parser")
    articles = soup.find_all("article", attrs={"itemtype": "https://schema.org/SocialMediaPosting"})
    posts = []
    for article in articles:
        url_meta = article.find("meta", itemprop="url")
        url = url_meta["content"] if url_meta else ""

        date_meta = article.find("meta", itemprop="dateCreated")
        if not date_meta:
            continue
        try:
            pub_dt = datetime.datetime.strptime(date_meta["content"], "%Y-%m-%dT%H:%M:%S.%fZ")
            pub_dt = pub_dt.replace(tzinfo=datetime.timezone.utc)
        except Exception:
            continue

        if pub_dt < SEVEN_DAYS_AGO:
            continue

        body = article.find("div", itemprop="articleBody")
        text = body.get_text(separator=" ").strip() if body else ""
        if not text:
            continue

        views = 0
        counters = article.find_all("div", attrs={"itemtype": "https://schema.org/InteractionCounter"})
        for counter in counters:
            name_meta = counter.find("meta", itemprop="name")
            if name_meta and name_meta.get("content") == "Views":
                count_span = counter.find("span", itemprop="userInteractionCount")
                if count_span:
                    try:
                        views = int(count_span.text.replace(",", ""))
                    except Exception:
                        pass

        posts.append({
            "text": text,
            "url": url,
            "views": views,
            "date": pub_dt.strftime("%Y-%m-%d"),
        })

    posts.sort(key=lambda x: x["views"], reverse=True)
    return posts[:3]


def run():
    print("=== Twitter/X Scraper ===")
    for slug, file_path in TWITTER_FILES.items():
        print(f"\nProcessing: {slug}")
        competitor_id = get_competitor_id(slug)
        if not competitor_id:
            print(f"  WARNING: Competitor not found in DB: {slug}")
            continue
        posts = parse_twitter_file(file_path)
        print(f"  Found {len(posts)} tweet(s) in last 7 days")
        write_twitter_posts(competitor_id, posts)
    print("\nTwitter scraping complete.")


if __name__ == "__main__":
    run()
