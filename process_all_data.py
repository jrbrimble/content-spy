import json
import datetime
import codecs
from apify_client import ApifyClient
from markdown_pdf import MarkdownPdf, Section

CURRENT_DATE = datetime.datetime.fromisoformat("2026-08-07T15:10:09+01:00")
SEVEN_DAYS_AGO = CURRENT_DATE - datetime.timedelta(days=7)
FOURTEEN_DAYS_AGO = CURRENT_DATE - datetime.timedelta(days=14)

API_TOKEN = os.environ.get("APIFY_API_KEY", "")
client = ApifyClient(API_TOKEN)

COMPETITORS = [
    "Dan Martell",
    "Rick Mulready",
    "Eric Siu",
    "AI Show Podcast",
    "Sabrina Ramonov",
    "Sean Standberry (LYFE Marketing)"
]

# 1. Load YouTube data
with open('youtube_results.json', 'r', encoding='utf-8') as f:
    youtube_data = json.load(f)

# 2. Process Facebook data correctly using facebookUrl and user.name
fb_run_id = "4E0aYqdrTRweRRvIH"
run_fb = client.run(fb_run_id).get()
dataset_id_fb = getattr(run_fb, "default_dataset_id", getattr(run_fb, "defaultDatasetId", None))
fb_items = list(client.dataset(dataset_id_fb).iterate_items())

facebook_data = {c: [] for c in COMPETITORS}

for item in fb_items:
    ts = item.get("timestamp") or item.get("time")
    if not ts:
        continue
    try:
        if isinstance(ts, int):
            pub_dt = datetime.datetime.fromtimestamp(ts, tz=datetime.timezone.utc)
        else:
            pub_dt = datetime.datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
    except:
        continue

    if pub_dt < SEVEN_DAYS_AGO:
        continue

    fb_url = (item.get("facebookUrl") or "").lower()
    user_name = (item.get("user", {}).get("name") or "").lower()
    input_url = (item.get("inputUrl") or "").lower()

    target_comp = None
    if "danmartell" in fb_url or "dan martell" in user_name:
        target_comp = "Dan Martell"
    elif "rmulready" in fb_url or "rick mulready" in user_name:
        target_comp = "Rick Mulready"
    elif "singlegrain" in fb_url or "eric siu" in user_name or "single grain" in user_name:
        target_comp = "Eric Siu"
    elif "aishowpod" in fb_url or "ai show" in user_name:
        target_comp = "AI Show Podcast"
    elif "sabr1naram" in fb_url or "sabrina ramonov" in user_name:
        target_comp = "Sabrina Ramonov"
    elif "lyfemarketing" in fb_url or "lyfe marketing" in user_name or "sean standberry" in user_name:
        target_comp = "Sean Standberry (LYFE Marketing)"

    if target_comp:
        text = item.get("text") or item.get("message") or ""
        url = item.get("url") or item.get("postUrl") or ""
        likes = item.get("likes") or item.get("likesCount") or 0
        comments = item.get("comments") or item.get("commentsCount") or 0
        shares = item.get("shares") or item.get("sharesCount") or 0

        facebook_data[target_comp].append({
            "text": text.strip(),
            "url": url,
            "likes": likes,
            "comments": comments,
            "shares": shares,
            "engagement": likes + comments + shares,
            "date": pub_dt.strftime("%b %d, %Y")
        })

# Deduplicate & Sort FB
for c in COMPETITORS:
    seen = set()
    unique_posts = []
    for p in facebook_data[c]:
        if p["url"] not in seen:
            seen.add(p["url"])
            unique_posts.append(p)
    unique_posts.sort(key=lambda x: x["engagement"], reverse=True)
    facebook_data[c] = unique_posts[:3]

# 3. Load Instagram data
with open('instagram_results.json', 'r', encoding='utf-8') as f:
    instagram_data = json.load(f)

# 4. Parsed Twitter data (from scraped steps)
twitter_data = {
    "Dan Martell": [
        {
            "text": "The more you build your own thing... the more unemployable you become",
            "url": "https://x.com/danmartell/status/2084663237102961127",
            "views": "28,395",
            "date": "Aug 04, 2026"
        },
        {
            "text": "When you truly believe in your offer, selling feels like serving.",
            "url": "https://x.com/danmartell/status/2084300905164239150",
            "views": "11,306",
            "date": "Aug 03, 2026"
        },
        {
            "text": "Your authenticity is your unfair advantage.",
            "url": "https://x.com/danmartell/status/2084640584841507208",
            "views": "10,618",
            "date": "Aug 04, 2026"
        }
    ],
    "Rick Mulready": [],
    "Eric Siu": [
        {
            "text": "Dario is reportedly worried that some new Anthropic hires are there for the money, not the mission. Facebook had a version of this problem around 2010... Mark's answer wasn't a lecture about mission. He bought small companies for their founders... Facebook paid founder prices, then gave employees founder scope.",
            "url": "https://x.com/ericosiu/status/2084812352122450050",
            "views": "348,829",
            "date": "Aug 05, 2026"
        }
    ],
    "AI Show Podcast": [
        {
            "text": "Anthropic reviewed 140,000+ cybersecurity evaluations. It found three cases where Claude models escaped sealed environments and accessed real-world infrastructure.",
            "url": "https://x.com/aishowpod/status/2084996849945936114",
            "views": "115",
            "date": "Aug 05, 2026"
        },
        {
            "text": "What starts as one employee solving their own problem can transform an entire organization. At Good Karma Brands, a marketer turned a 2–3 hour campaign process into minutes using AI.",
            "url": "https://x.com/aishowpod/status/2084280549317714419",
            "views": "97",
            "date": "Aug 03, 2026"
        },
        {
            "text": "Open weight is not the same as open source. You can download and modify the model, but you do not get the training data, methods, or full recipe used to build it.",
            "url": "https://x.com/aishowpod/status/2083933846878200194",
            "views": "97",
            "date": "Aug 02, 2026"
        }
    ],
    "Sabrina Ramonov": [
        {
            "text": "TLDR: Here's the exact 3-step setup for your agent to run your entire social media content with 7 free Claude skills (content-coach, brand-brief, post-writer, post-grader, post-scheduler, viral-hooks, repurpose). Over 30+ million organic cross-platform monthly views.",
            "url": "https://x.com/Sabrina_Ramonov/status/2084696359538692478",
            "views": "473,456",
            "date": "Aug 04, 2026"
        }
    ],
    "Sean Standberry (LYFE Marketing)": []
}

# Generate Markdown Document
md_lines = []
md_lines.append("# Competitor Social Media Competitive Intelligence Report")
md_lines.append(f"*Generated on: {CURRENT_DATE.strftime('%B %d, %Y')}*\n")
md_lines.append("> **Analysis Scope:**")
md_lines.append("> - **YouTube:** Top 3 recent videos published in the **last 14 days**.")
md_lines.append("> - **Twitter/X:** Top 3 posts by views/engagement in the **last 7 days**.")
md_lines.append("> - **Instagram:** Top 3 posts by engagement in the **last 7 days**.")
md_lines.append("> - **Facebook:** Top 3 posts by engagement in the **last 7 days**.\n")
md_lines.append("---\n")

for c in COMPETITORS:
    md_lines.append(f"## 👤 Competitor: {c}\n")

    # YouTube Section
    md_lines.append("### 🎥 YouTube (Last 14 Days)")
    yt_posts = youtube_data.get(c, [])
    if yt_posts:
        for idx, item in enumerate(yt_posts, 1):
            md_lines.append(f"**{idx}. {item['title']}**")
            md_lines.append(f"- **URL:** {item['url']}")
            md_lines.append(f"- **Views:** {item['views']:,}")
            md_lines.append(f"- **Date Published:** {item['date']}")
            if item.get('description'):
                desc = item['description'].replace('\n', ' ').strip()
                md_lines.append(f"- **Summary/Description:** {desc}...")
            md_lines.append("")
    else:
        md_lines.append("*No videos published in the last 14 days.*\n")

    # Twitter Section
    md_lines.append("### 🐦 Twitter / X (Last 7 Days)")
    tw_posts = twitter_data.get(c, [])
    if tw_posts:
        for idx, item in enumerate(tw_posts, 1):
            md_lines.append(f"**{idx}. Post**")
            md_lines.append(f"- **Text:** \"{item['text']}\"")
            md_lines.append(f"- **URL:** {item['url']}")
            md_lines.append(f"- **Views / Impressions:** {item['views']}")
            md_lines.append(f"- **Date Published:** {item['date']}\n")
    else:
        md_lines.append("*No posts published in the last 7 days.*\n")

    # Instagram Section
    md_lines.append("### 📸 Instagram (Last 7 Days)")
    ig_posts = instagram_data.get(c, [])
    if ig_posts:
        for idx, item in enumerate(ig_posts, 1):
            md_lines.append(f"**{idx}. Post**")
            text = item['text'].replace('\n', ' ').strip()
            md_lines.append(f"- **Caption:** \"{text}\"")
            md_lines.append(f"- **URL:** {item['url']}")
            md_lines.append(f"- **Engagement:** {item['likes']:,} Likes | {item['comments']:,} Comments")
            md_lines.append(f"- **Date Published:** {item['date']}\n")
    else:
        md_lines.append("*No posts published in the last 7 days.*\n")

    # Facebook Section
    md_lines.append("### 📘 Facebook (Last 7 Days)")
    fb_posts = facebook_data.get(c, [])
    if fb_posts:
        for idx, item in enumerate(fb_posts, 1):
            md_lines.append(f"**{idx}. Post**")
            text = item['text'].replace('\n', ' ').strip()
            md_lines.append(f"- **Content:** \"{text}\"")
            md_lines.append(f"- **URL:** {item['url']}")
            md_lines.append(f"- **Engagement:** {item['likes']:,} Likes | {item['comments']:,} Comments | {item['shares']:,} Shares")
            md_lines.append(f"- **Date Published:** {item['date']}\n")
    else:
        md_lines.append("*No posts published in the last 7 days.*\n")

    md_lines.append("---\n")

full_md = "\n".join(md_lines)

# Save markdown report
md_file_path = r'C:\Users\jrbri\Desktop\Content Spy\Full_Competitor_Report.md'
with open(md_file_path, 'w', encoding='utf-8') as f:
    f.write(full_md)

# Convert to PDF using markdown-pdf
pdf_file_path = r'C:\Users\jrbri\Desktop\Content Spy\Full_Competitor_Report.pdf'
pdf = MarkdownPdf(toc_level=2)
pdf.add_section(Section(full_md))
pdf.meta["title"] = "Full Competitor Social Media Report"
pdf.meta["author"] = "Content Spy Intelligence"
pdf.save(pdf_file_path)

print("Full Multi-Platform PDF Report generated successfully at:", pdf_file_path)
