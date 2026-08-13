import re
import json

with open(r'C:\Users\jrbri\.gemini\antigravity\brain\4e077980-55c5-4679-bd1f-3344bb9be29c\.system_generated\steps\602\content.md', encoding='utf-8') as f:
    html = f.read()

m = re.search(r'"inputSchema"\s*:\s*(\{.*?\})\s*,\s*"readme"', html)
if m:
    try:
        data = json.loads(m.group(1))
        print(json.dumps(data, indent=2)[:2000])
    except Exception as e:
        print("JSON parse error:", e)
        print("Raw:", m.group(1)[:200])
else:
    print("No match")
