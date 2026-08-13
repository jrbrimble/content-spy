"""
Add new columns to competitors table in Supabase.
Run once to migrate the schema.
"""
import os
os.environ.setdefault("SUPABASE_URL", "https://kmswdyuzatobdfuelyyu.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "sb_publishable_wui8qrPXc6lj8qMGti2nkw_RwzcFcK5")

# We can't run raw SQL via the anon key - let's just test if columns exist
# by trying to read/write them. If they don't exist we'll see an error.
from db_write import get_client
db = get_client()

try:
    r = db.table("competitors").select("ai_summary, ai_summary_at, last_scraped_at").limit(1).execute()
    print("SUCCESS: Columns already exist!")
    print(r.data)
except Exception as e:
    print(f"ERROR: {e}")
    print("\nPlease run this SQL in your Supabase SQL Editor:")
    print("""
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS ai_summary text;
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS ai_summary_at timestamptz;
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS last_scraped_at timestamptz;
""")
