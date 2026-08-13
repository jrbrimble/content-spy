"""
Master scraper — run this to refresh ALL competitor data in Supabase.

Usage:
  set SUPABASE_URL=https://your-project.supabase.co
  set SUPABASE_KEY=your-anon-key
  python run_all_scrapers.py
"""
import sys
import datetime
from db_write import get_client

def main():
    print("=" * 55)
    print("  Content Spy — Full Data Refresh")
    print("=" * 55)

    # Verify Supabase connection first
    try:
        client = get_client()
        result = client.table("competitors").select("name").execute()
        competitors = [r["name"] for r in result.data]
        print(f"\nConnected to Supabase. Competitors found: {len(competitors)}")
        for c in competitors:
            print(f"  • {c}")
        print()
    except Exception as e:
        print(f"\nERROR: Could not connect to Supabase.\n{e}")
        print("\nMake sure you have set:")
        print("  set SUPABASE_URL=https://your-project.supabase.co")
        print("  set SUPABASE_KEY=your-anon-key")
        sys.exit(1)

    # Run each scraper
    from scrape_youtube import run as run_youtube
    from scrape_twitter import run as run_twitter
    from scrape_social import run as run_social

    print("\n" + "-" * 55)
    run_youtube()

    print("\n" + "-" * 55)
    run_twitter()

    print("\n" + "-" * 55)
    run_social()

    # Record the scrape timestamp in each competitor row
    print("\n" + "-" * 55)
    print("Recording scrape timestamp...")
    try:
        now = datetime.datetime.utcnow().isoformat()
        client.table("competitors").update({"last_scraped_at": now}).neq("id", "00000000-0000-0000-0000-000000000000").execute()
        print(f"  Timestamp saved: {now}")
    except Exception as e:
        print(f"  WARNING: Could not save timestamp: {e}")

    # Generate AI summaries
    print("\n" + "-" * 55)
    print("Generating AI summaries...")
    try:
        # Ensure GEMINI_API_KEY is available from .env.local or environment
        import pathlib
        env_file = pathlib.Path(__file__).parent / "content-spy-app" / ".env.local"
        if env_file.exists():
            for line in env_file.read_text().splitlines():
                if line.startswith("GEMINI_API_KEY="):
                    os.environ["GEMINI_API_KEY"] = line.split("=", 1)[1].strip()
        from generate_ai_summaries import run as run_ai
        run_ai()
    except Exception as e:
        print(f"  WARNING: AI summary generation failed: {e}")

    print("\n" + "=" * 55)
    print("  All done! Supabase is up to date.")
    print("=" * 55)


if __name__ == "__main__":
    main()
