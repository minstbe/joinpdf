"""Generate static blog post pages and sitemap from partials and metadata.

Usage:
    python generate_posts.py

Reads posts/index.json for metadata and posts/partials/*.html for content.
Outputs full HTML pages to posts/{slug}.html and sitemap.xml to site/.
"""

import json
import os
import sys
from datetime import datetime

BASE_URL = "https://joinpdf.top"
SITE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "site")
POSTS_DIR = os.path.join(SITE_DIR, "posts")
PARTIALS_DIR = os.path.join(POSTS_DIR, "partials")
INDEX_FILE = os.path.join(POSTS_DIR, "index.json")
SITEMAP_FILE = os.path.join(SITE_DIR, "sitemap.xml")
ROBOTS_FILE = os.path.join(SITE_DIR, "robots.txt")

GA_ID = "G-4EXX1BTT8K"

PAGE_TEMPLATE = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="description" content="{description}">
  <meta name="robots" content="index, follow">
  <meta property="og:title" content="{og_title}">
  <meta property="og:description" content="{og_description}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="{url}">
  <meta property="og:site_name" content="PDF Split & Merge">
  <meta property="article:published_time" content="{date}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="{og_title}">
  <meta name="twitter:description" content="{og_description}">
  <link rel="canonical" href="{url}">
  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "{json_title}",
    "description": "{json_description}",
    "datePublished": "{date}",
    "author": {{ "@type": "Organization", "name": "PDF Split & Merge" }},
    "publisher": {{ "@type": "Organization", "name": "PDF Split & Merge", "url": "https://joinpdf.top/" }},
    "mainEntityOfPage": {{ "@type": "WebPage", "@id": "{url}" }}
  }}
  </script>
  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://joinpdf.top/" }},
      {{ "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://joinpdf.top/blog.html" }},
      {{ "@type": "ListItem", "position": 3, "name": "{json_title}", "item": "{url}" }}
    ]
  }}
  </script>
  <title>{title} | PDF Split &amp; Merge Blog</title>
  <link rel="stylesheet" href="../styles.css">
  <script>
    (function(id){{
      var s=document.createElement("script")
      s.async=true
      s.src="https://www.googletagmanager.com/gtag/js?id="+id
      document.head.appendChild(s)
      window.dataLayer=window.dataLayer||[]
      function gtag(){{dataLayer.push(arguments)}}
      window.gtag=gtag
      gtag("js",new Date())
      gtag("config",id,{{anonymize_ip:true,send_page_view:true}})
    }})("{ga_id}")
  </script>
</head>
<body>
  <header class="app-header">
    <div class="brand">PDF Split &amp; Merge</div>
    <div class="subtitle">Articles: tips, guides, and privacy</div>
    <div class="actions">
      <a href="../index.html" class="btn ghost">Home</a>
      <a href="../blog.html" class="btn ghost">Blog</a>
      <button id="themeToggle" class="btn ghost">Toggle Theme</button>
    </div>
  </header>
  <main class="container">
    <article class="card" style="grid-column: 1 / -1;">
      <h1 class="card-title">{title}</h1>
      <p class="card-desc">Published on {date_display} &middot; {description}</p>
      {content}
    </article>
  </main>
  <footer class="footer">
    <div>All processing happens in your browser. No data is ever uploaded to a server.</div>
    <div class="footer-links">
      <a href="../index.html">Home</a>
      <span>&middot;</span>
      <a href="../blog.html">Blog</a>
      <span>&middot;</span>
      <a href="https://github.com" target="_blank" rel="noopener">GitHub</a>
    </div>
  </footer>
  <script>
    function track(event, params){{ try{{ if(typeof gtag==="function") gtag("event", event, params||{{}}) }}catch(e){{}} }}
    function applyTheme(initial){{ var t = initial==="dark" ? "dark" : "light"; document.documentElement.setAttribute("data-theme", t) }}
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    applyTheme(localStorage.getItem("theme") || (prefersDark ? "dark" : "light"))
    document.getElementById("themeToggle").addEventListener("click", function() {{
      var current = document.documentElement.getAttribute("data-theme")
      var next = current==="dark" ? "light" : "dark"
      localStorage.setItem("theme", next)
      applyTheme(next)
      track("theme_toggle", {{ theme: next }})
    }})
    track("blog_post_view", {{ slug: "{slug}" }})
  </script>
</body>
</html>"""

SITEMAP_TEMPLATE = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>{base}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>{base}/blog.html</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
{post_urls}
</urlset>"""

SITEMAP_URL_TEMPLATE = """  <url>
    <loc>{url}</loc>
    <lastmod>{lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>"""

ROBOTS_CONTENT = """User-agent: *
Allow: /
Sitemap: {base}/sitemap.xml
"""


def load_posts():
    if not os.path.exists(INDEX_FILE):
        print(f"Error: {INDEX_FILE} not found")
        sys.exit(1)
    with open(INDEX_FILE, "r", encoding="utf-8") as f:
        posts = json.load(f)
    return posts


def load_content(slug):
    path = os.path.join(PARTIALS_DIR, f"{slug}.html")
    if not os.path.exists(path):
        print(f"Warning: partial not found for '{slug}' at {path}")
        return "<p>Content coming soon.</p>"
    with open(path, "r", encoding="utf-8") as f:
        return f.read().strip()


def escape_json(s):
    return s.replace("\\", "\\\\").replace('"', '\\"')


def generate_post(post):
    slug = post["slug"]
    title = post["title"]
    date = post["date"]
    description = post.get("description", "")
    content = load_content(slug)
    url = f"{BASE_URL}/posts/{slug}.html"

    html = PAGE_TEMPLATE.format(
        title=title,
        description=description,
        og_title=title,
        og_description=description,
        url=url,
        date=date,
        date_display=date,
        content=content,
        slug=slug,
        json_title=escape_json(title),
        json_description=escape_json(description),
        ga_id=GA_ID,
    )
    return html


def generate_sitemap(posts):
    urls = []
    for p in posts:
        url = f"{BASE_URL}/posts/{p['slug']}.html"
        urls.append(SITEMAP_URL_TEMPLATE.format(url=url, lastmod=p.get("date", "")))
    return SITEMAP_TEMPLATE.format(base=BASE_URL, post_urls="\n".join(urls))


def main():
    posts = load_posts()
    print(f"Found {len(posts)} post(s) in index.json")

    for p in posts:
        html = generate_post(p)
        out_path = os.path.join(POSTS_DIR, f"{p['slug']}.html")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"  Generated: {out_path}")

    sitemap = generate_sitemap(posts)
    with open(SITEMAP_FILE, "w", encoding="utf-8") as f:
        f.write(sitemap)
    print(f"  Generated: {SITEMAP_FILE}")

    robots = ROBOTS_CONTENT.format(base=BASE_URL)
    with open(ROBOTS_FILE, "w", encoding="utf-8") as f:
        f.write(robots)
    print(f"  Generated: {ROBOTS_FILE}")

    print("\nDone. Blog pages, sitemap.xml, and robots.txt are up to date.")


if __name__ == "__main__":
    main()
