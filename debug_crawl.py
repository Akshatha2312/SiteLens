import traceback
import json
from backend.app.crawler import crawl_site

url = "https://example.com"
print(f"Starting crawl for {url}")
try:
    pages = crawl_site(url)
    print(f"Crawled {len(pages)} pages")
    # Print first page preview
    if pages:
        print(json.dumps(pages[0], indent=2)[:500])
except Exception as e:
    print("Exception occurred:")
    traceback.print_exc()
