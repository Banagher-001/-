#!/usr/bin/env python3
"""Query official Steam asset metadata; optionally download to a local library."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen


API = "https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/"


def metadata(ids):
    data = {"itemcount": str(len(ids))}
    data.update({f"publishedfileids[{i}]": value for i, value in enumerate(ids)})
    request = Request(API, data=urlencode(data).encode(), method="POST")
    with urlopen(request, timeout=40) as response:
        result = json.load(response)
    entries = result.get("response", {}).get("publishedfiledetails", [])
    if {str(item.get("publishedfileid")) for item in entries} != set(ids):
        raise RuntimeError("Steam returned incomplete asset metadata")
    return entries


def download(item, folder):
    url = item.get("file_url", "")
    parsed = urlparse(url)
    host = parsed.hostname or ""
    trusted = host.endswith(".steamusercontent.com") or host.endswith(".steamuserimages-a.akamaihd.net")
    if parsed.scheme != "https" or not trusted:
        raise RuntimeError("No supported official HTTPS download URL; use Steam/SFM")
    asset_id = str(item["publishedfileid"])
    folder.mkdir(parents=True, exist_ok=True)
    target = folder / f"steam-{asset_id}.bin"
    partial = target.with_suffix(".part")
    record = folder / f"steam-{asset_id}.json"
    if any(path.exists() for path in (target, partial, record)):
        raise RuntimeError(f"Existing files for {asset_id}; choose a new output directory")
    digest = hashlib.sha256()
    size = 0
    try:
        with urlopen(url, timeout=60) as source, partial.open("xb") as output:
            while chunk := source.read(1024 * 1024):
                output.write(chunk)
                digest.update(chunk)
                size += len(chunk)
        expected = int(item.get("file_size", 0))
        if not size or (expected and size != expected):
            raise RuntimeError(f"File size mismatch: expected {expected}, received {size}")
        os.replace(partial, target)
    except Exception:
        partial.unlink(missing_ok=True)
        raise
    receipt = {
        "id": asset_id,
        "name": item.get("title"),
        "source": f"https://steamcommunity.com/sharedfiles/filedetails/?id={asset_id}",
        "bytes": size,
        "sha256": digest.hexdigest(),
        "note": "Local integrity receipt; SHA256 is calculated locally, not a publisher signature. Original archive format has not been converted.",
    }
    with record.open("x", encoding="utf-8") as output:
        json.dump(receipt, output, ensure_ascii=False, indent=2)
        output.write("\n")
    print(json.dumps({"downloaded": str(target), **receipt}, ensure_ascii=False))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--id", action="append", required=True, dest="ids")
    parser.add_argument("--download", action="store_true")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    if not all(value.isdecimal() for value in args.ids):
        parser.error("Asset IDs must contain only decimal digits")
    ids = list(dict.fromkeys(args.ids))
    if len(ids) > 100:
        parser.error("At most 100 IDs per invocation")
    if args.download and args.output is None:
        parser.error("--download requires --output pointing to your local asset library")
    failures = 0
    try:
        items = metadata(ids)
    except Exception as error:
        # Do not log URLs or HTTP exception details that could contain signed links.
        print(f"Official Steam metadata query failed ({type(error).__name__})", file=sys.stderr)
        return 1
    for item in items:
        asset_id = str(item.get("publishedfileid"))
        if item.get("result") != 1:
            print(f"Steam asset {asset_id} unavailable (result {item.get('result')})", file=sys.stderr)
            failures += 1
            continue
        print(json.dumps({
            "id": asset_id, "name": item.get("title"),
            "bytes": int(item.get("file_size", 0)),
            "official_download_available": bool(item.get("file_url")),
        }, ensure_ascii=False))
        if args.download:
            try:
                download(item, args.output)
            except Exception as error:
                print(f"Download failed for {asset_id} ({type(error).__name__})", file=sys.stderr)
                failures += 1
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
