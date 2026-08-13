import httpx
import re
import json

urls = [
    'https://www.youtube.com/@danmartell',
    'https://www.youtube.com/@RickMulready',
    'https://www.youtube.com/@LevelingUpOfficial',
    'https://www.youtube.com/@aishowpod',
    'https://www.youtube.com/@sabrina_ramonov',
    'https://www.youtube.com/@SeanStandberry'
]

for url in urls:
    try:
        r = httpx.get(url, verify=False, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"})
        m = re.search(r'var ytInitialData = ({.*?});</script>', r.text)
        if m:
            data = json.loads(m.group(1))
            # Just extract all image URLs using regex on the raw text since navigating JSON is complex
            img_m = re.findall(r'"url":"(https://yt3\.googleusercontent\.com/[^"]+)"', r.text)
            if img_m:
                # Avatar is usually one of the first few
                print(url, img_m[0])
            else:
                print(url, "No images found")
        else:
            print(url, "ytInitialData Not found")
    except Exception as e:
        print(url, "Error:", e)
