#!/usr/bin/env python3
"""
Siam Supply drip publisher for /guides/.

Reads articles.json and, for TODAY in Asia/Singapore, makes each guide:
  - live  (indexable, listed on /guides/, in sitemap.xml and llms.txt)  if date <= today
  - held  (noindex, not listed, absent from sitemap and llms.txt)       if date >  today

Idempotent in both directions, so it can run on every build. The Pages workflow
runs it at build time and on a daily cron (see .github/workflows/pages.yml), so a
guide goes live on its date with no commit. The repo keeps whatever state the
last local build wrote; the deployed site is always recomputed.

This script owns everything under /guides/ in sitemap.xml and llms.txt. The
local generators (sitemap.py, llms_txt.py in the WHOLESALE build) skip guides/
and call this at the end, so there is one owner and nothing drifts.

Usage:  python3 scripts/publish_due.py              # apply for today
        python3 scripts/publish_due.py 2026-10-09   # simulate a date
"""
import json
import os
import re
import sys
from datetime import date, datetime, timedelta, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE_URL = "https://siamsupply.sg"
SG = timezone(timedelta(hours=8))

LIVE_ROBOTS = "index, follow, max-image-preview:large"
HELD_ROBOTS = "noindex, follow"
ROBOTS_RE = re.compile(r'<meta name="robots" content="[^"]*" data-drip>')

LIST_BEGIN, LIST_END = "<!-- GUIDES-LIST -->", "<!-- END GUIDES-LIST -->"
LLMS_BEGIN, LLMS_END = "<!-- GENERATED-GUIDES -->", "<!-- END GENERATED-GUIDES -->"


def today():
    if len(sys.argv) > 1:
        return date.fromisoformat(sys.argv[1])
    return datetime.now(SG).date()


def path(*p):
    return os.path.join(ROOT, *p)


def read(p):
    return open(path(p), encoding="utf-8").read()


def write(p, s):
    open(path(p), "w", encoding="utf-8").write(s)


def esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def set_robots(rel, live):
    s = read(rel)
    if not ROBOTS_RE.search(s):
        raise SystemExit(f"{rel}: no data-drip robots meta, refusing to guess")
    s = ROBOTS_RE.sub(f'<meta name="robots" content="{LIVE_ROBOTS if live else HELD_ROBOTS}" data-drip>', s)
    write(rel, s)


def card(a):
    return f'''      <a class="gcard" href="/guides/{a["slug"]}/">
        <img src="/assets/guides/{a["slug"]}/{a["hero"]}" alt="{esc(a["hero_alt"])}" width="1200" height="675" loading="lazy" decoding="async">
        <span class="gcat">{esc(a["category"])}</span>
        <h2>{esc(a["title"])}</h2>
        <p>{esc(a["desc"])}</p>
      </a>'''


def replace_block(s, begin, end, body, where):
    if begin not in s or end not in s:
        raise SystemExit(f"{where}: missing {begin} markers")
    return re.sub(re.escape(begin) + r".*?" + re.escape(end),
                  lambda _: f"{begin}\n{body}\n{end}", s, flags=re.S)


def main():
    t = today()
    arts = json.load(open(path("articles.json"), encoding="utf-8"))["articles"]
    live = sorted([a for a in arts if date.fromisoformat(a["date"]) <= t],
                  key=lambda a: a["date"], reverse=True)
    for a in arts:
        set_robots(f"guides/{a['slug']}/index.html", a in live)

    # hub: list live guides; keep the hub out of the index until one exists
    hub = "guides/index.html"
    s = read(hub)
    body = "\n".join(card(a) for a in live) if live else \
        '      <p class="gempty">The first guides are on their way.</p>'
    s = replace_block(s, LIST_BEGIN, LIST_END, body, hub)
    write(hub, s)
    set_robots(hub, bool(live))

    # sitemap: drop every /guides/ entry, then add the live ones
    sm = read("sitemap.xml")
    sm = re.sub(r"\s*<url>\s*<loc>[^<]*/guides/[^<]*</loc>.*?</url>", "", sm, flags=re.S)
    entries = []
    if live:
        entries.append((f"{SITE_URL}/guides/", live[0].get("modified", live[0]["date"])))
    entries += [(f"{SITE_URL}/guides/{a['slug']}/", a.get("modified", a["date"])) for a in live]
    add = "".join(f"\n  <url>\n    <loc>{u}</loc>\n    <lastmod>{m}</lastmod>\n  </url>"
                  for u, m in entries)
    sm = sm.replace("</urlset>", add.lstrip("\n") + "\n</urlset>" if add else "</urlset>")
    sm = re.sub(r"\n{2,}", "\n", sm)
    write("sitemap.xml", sm)

    # llms.txt
    ll = read("llms.txt")
    lines = [f"- [{a['title']}]({SITE_URL}/guides/{a['slug']}/): {a['desc']}" for a in live]
    block = "## Guides\n\n" + ("\n".join(lines) if lines else "None published yet.")
    if LLMS_BEGIN not in ll:
        ll = ll.rstrip("\n") + f"\n\n{LLMS_BEGIN}\n{LLMS_END}\n"
    ll = replace_block(ll, LLMS_BEGIN, LLMS_END, block, "llms.txt")
    write("llms.txt", ll)

    held = [a for a in arts if a not in live]
    print(f"publish_due {t}: {len(live)} live, {len(held)} held"
          + (f", next {min(a['date'] for a in held)}" if held else ""))


if __name__ == "__main__":
    main()
