#!/usr/bin/env python3
"""Scrapling search for the props visible in design/views; metadata only."""

import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import json
from pathlib import Path
import time
from urllib.parse import urlencode
from scrapling.fetchers import Fetcher

STEAM_QUERIES = ["Overwatch Kings Row", "Overwatch props", "Victorian street", "Overwatch effects"]
SKETCHFAB_QUERIES = ["window flower box", "street bollard", "drainpipe", "arched window", "cobblestone pavement", "metal trash bin", "road barrier", "victorian wall lantern"]


def get(url):
    return Fetcher.get(url, follow_redirects=False, verify=True, timeout=30, retries=1)


def steam_search(query):
    url = "https://steamcommunity.com/workshop/browse/?" + urlencode({
        "appid": 1840, "searchtext": query, "browsesort": "textsearch", "section": "readytouseitems"})
    page = get(url)
    items = {}
    if page.status == 200:
        for link in page.css("a"):
            href = link.attrib.get("href", "")
            title = " ".join(link.xpath(".//text()").getall()).strip()
            if "filedetails/?id=" in href and title:
                items[href] = {"name": title, "url": href, "status": "listing_found_details_not_verified"}
    time.sleep(1)
    return {"query": query, "url": url, "http_status": page.status, "models": list(items.values())[:12]}


def sketchfab_search(query):
    url = "https://api.sketchfab.com/v3/search?" + urlencode({
        "type": "models", "q": query, "downloadable": "true", "count": 4})
    page = get(url)
    items = []
    if page.status == 200:
        for item in page.json().get("results", []):
            license = item.get("license") or {}
            items.append({
                "id": item["uid"], "name": item["name"],
                "url": "https://sketchfab.com/models/" + item["uid"],
                "author": item.get("user", {}).get("displayName"),
                "license": license.get("label"), "license_url": license.get("url"),
                "downloadable_on_platform": item.get("isDownloadable"),
                "triangles": item.get("faceCount"), "animations": item.get("animationCount"),
                "status": "metadata_only_not_downloaded_not_imported",
            })
    time.sleep(1)
    return {"query": query, "url": url, "http_status": page.status, "models": items}


def safe_query(task):
    site, query = task
    try:
        result = (steam_search if site == "steam" else sketchfab_search)(query)
        result["site"] = site
        return result
    except Exception as error:
        return {"site": site, "query": query, "error_type": type(error).__name__, "models": []}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    tasks = [("steam", q) for q in STEAM_QUERIES] + [("sketchfab", q) for q in SKETCHFAB_QUERIES]
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(safe_query, tasks))
    output = {"checked_at": datetime.now(timezone.utc).isoformat(),
              "method": "Scrapling 0.5 Fetcher; public listings and official API; maximum two workers; delays; TLS verified; no authentication bypass.",
              "robots_observation": "Steam rules checked and search/details permitted. Sketchfab API robots redirects to website robots, which returned a 202 challenge; API returned public search metadata. No website page crawl performed on Sketchfab.",
              "results": results}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"queries": len(results), "results": sum(len(r["models"]) for r in results),
                      "failures": sum(bool(r.get("error_type")) or r.get("http_status") != 200 for r in results)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
