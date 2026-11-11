#!/usr/bin/env node
/**
 * The Edge Search — static site generator for Cloudflare Pages.
 * No dependencies (Node stdlib only).
 *
 * Reads data/articles.json, generates static HTML into dist/.
 * ONLY articles with publish_date <= today (Asia/Jakarta) are generated
 * or linked anywhere: homepage, categories, tags, search.json, sitemaps.
 * Future articles stay invisible until the daily rebuild passes their date.
 *
 * Override the "today" date for testing:  BUILD_DATE=2026-11-13 node build.js
 * or: node build.js --date=2026-11-13
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const SITE_URL = 'https://theedgesearch.my.id';
const SITE_NAME = 'The Edge Search';
const SITE_DESC = 'Clear, practical guides on search engines, AI search, tech trends, digital tools and online safety — one new article every day.';
const PUBLISHER_ID = 'ca-pub-8784618714761378'; // user's existing default — confirm before AdSense review
const PER_PAGE = 10;

// ---------------------------------------------------------------- dates
function jakartaToday() {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return fmt.format(new Date()); // YYYY-MM-DD
}
let TODAY = process.env.BUILD_DATE || jakartaToday();
for (const a of process.argv.slice(2)) {
  const m = a.match(/^--date=(.+)$/);
  if (m) TODAY = m[1];
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(TODAY)) { console.error('Bad date:', TODAY); process.exit(1); }

// ---------------------------------------------------------------- data
const CATEGORIES = [
  { slug: 'search-engines-seo', name: 'Search Engines & SEO', desc: 'How search engines work, ranking, and SEO that actually helps readers.' },
  { slug: 'ai-search-chatbots', name: 'AI Search & Chatbots', desc: 'AI answers, chatbots, and how search is changing.' },
  { slug: 'tech-trends-gadgets', name: 'Tech Trends & Gadgets', desc: 'New technology and gadgets worth your attention — and your money.' },
  { slug: 'how-to-guides-tutorials', name: 'How-To Guides & Tutorials', desc: 'Step-by-step guides you can follow and finish.' },
  { slug: 'digital-tools-apps', name: 'Digital Tools & Apps', desc: 'Apps and tools that make work and daily life easier.' },
  { slug: 'online-safety-privacy', name: 'Online Safety & Privacy', desc: 'Stay safe online: privacy, scams, passwords, and data protection.' },
];
const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.slug, c]));

const articles = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'articles.json'), 'utf8'));
// Validation: unique slugs + unique images (duplicate check for the 365-article run)
const seenSlug = new Set(); const seenImg = new Set();
for (const a of articles) {
  if (seenSlug.has(a.slug)) throw new Error('Duplicate slug: ' + a.slug);
  if (seenImg.has(a.image)) throw new Error('Duplicate image: ' + a.image);
  seenSlug.add(a.slug); seenImg.add(a.image);
  if (!CAT[a.category_slug]) throw new Error('Unknown category: ' + a.category_slug + ' in ' + a.slug);
  if (!Array.isArray(a.tags) || a.tags.length !== 10) throw new Error('Article must have exactly 10 tags: ' + a.slug);
}
articles.sort((a, b) => (a.publish_date < b.publish_date ? 1 : -1));
const published = articles.filter((a) => a.publish_date <= TODAY);
const scheduled = articles.filter((a) => a.publish_date > TODAY);

// ---------------------------------------------------------------- helpers
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const tagSlug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const fmtDate = (d) => new Date(d + 'T00:00:00+07:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const postUrl = (a) => `${SITE_URL}/post/${a.slug}/`;
const wordCount = (html) => html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;

function write(rel, content) {
  const p = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}
function cleanDist() { fs.rmSync(DIST, { recursive: true, force: true }); fs.mkdirSync(DIST, { recursive: true }); }

// Tag counts / latest, computed from PUBLISHED only (future articles never leak)
const tagCounts = {};
for (const a of published) for (const t of a.tags) tagCounts[t] = (tagCounts[t] || 0) + 1;
const popularTags = Object.entries(tagCounts).sort((x, y) => y[1] - x[1]).slice(0, 12);
const latest = published.slice(0, 5);

// ---------------------------------------------------------------- CSS
const CSS = `:root{--ink:#1f2937;--muted:#6b7280;--line:#e5e7eb;--bg:#ffffff;--soft:#f9fafb;--brand:#0f766e;--brand2:#b45309;--max:1120px}
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:var(--ink);line-height:1.65;background:var(--bg)}
a{color:var(--brand);text-decoration:none}a:hover{text-decoration:underline}
img{max-width:100%;height:auto;display:block}
header.site{border-bottom:1px solid var(--line);background:#fff;position:sticky;top:0;z-index:20}
.wrap{max-width:var(--max);margin:0 auto;padding:0 16px}
.topbar{display:flex;align-items:center;gap:18px;min-height:60px;flex-wrap:wrap}
.logo{font-size:1.45rem;font-weight:800;color:var(--ink);letter-spacing:-.02em}.logo span{color:var(--brand)}
nav.main{display:flex;gap:4px;align-items:center;flex-wrap:wrap;margin-left:auto}
nav.main>a,nav.main .dropbtn{padding:8px 10px;color:var(--ink);font-weight:600;font-size:.95rem;background:none;border:0;cursor:pointer;font-family:inherit}
nav.main a:hover,nav.main .dropbtn:hover{color:var(--brand);text-decoration:none}
.dropdown{position:relative}.dropdown-content{display:none;position:absolute;left:0;top:100%;background:#fff;border:1px solid var(--line);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.12);min-width:250px;padding:6px;z-index:30}
.dropdown-content a{display:block;padding:8px 10px;color:var(--ink);border-radius:6px}.dropdown-content a:hover{background:var(--soft);color:var(--brand)}
.dropdown.open .dropdown-content{display:block}
.layout{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:32px;padding:28px 16px 40px;max-width:var(--max);margin:0 auto}
@media(max-width:900px){.layout{grid-template-columns:1fr}}
article.card{border-bottom:1px solid var(--line);padding:0 0 22px;margin:0 0 22px}
article.card h2{margin:10px 0 6px;font-size:1.45rem;line-height:1.3}article.card h2 a{color:var(--ink)}
.meta{color:var(--muted);font-size:.88rem;margin:4px 0 8px}.meta a{color:var(--muted)}
.excerpt{margin:8px 0 10px}.tag{display:inline-block;background:var(--soft);border:1px solid var(--line);border-radius:999px;padding:2px 10px;font-size:.82rem;margin:0 6px 6px 0;color:var(--ink)}
aside .box{border:1px solid var(--line);border-radius:10px;padding:16px;margin-bottom:20px;background:#fff}
aside h3{margin:0 0 10px;font-size:1rem;text-transform:uppercase;letter-spacing:.04em;color:var(--brand)}
aside ul{list-style:none;margin:0;padding:0}aside li{padding:5px 0;border-bottom:1px dashed var(--line)}aside li:last-child{border:0}
aside .count{float:right;color:var(--muted);font-size:.85rem}
.searchbox{display:flex}.searchbox input{flex:1;padding:9px 10px;border:1px solid var(--line);border-radius:8px 0 0 8px;font-size:1rem;min-width:0}
.searchbox button{padding:9px 14px;border:1px solid var(--brand);background:var(--brand);color:#fff;border-radius:0 8px 8px 0;cursor:pointer;font-weight:600}
.post h1{font-size:2rem;line-height:1.25;margin:6px 0 8px}.post .hero{border-radius:10px;margin:14px 0}
.post .body h2{margin-top:28px;font-size:1.35rem}.post .body p{margin:0 0 14px}
.share{display:flex;gap:8px;flex-wrap:wrap;margin:22px 0;padding:14px;border:1px solid var(--line);border-radius:10px;background:var(--soft)}
.share a,.share button{border:1px solid var(--line);background:#fff;border-radius:8px;padding:7px 12px;font-size:.9rem;color:var(--ink);cursor:pointer}
.related{margin-top:26px}.related h2{font-size:1.25rem}
footer.site{background:#111827;color:#d1d5db;margin-top:20px}footer.site .cols{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;padding:32px 16px}
@media(max-width:700px){footer.site .cols{grid-template-columns:1fr}}
footer.site h4{color:#fff;margin:0 0 10px}footer.site a{color:#d1d5db}footer.site ul{list-style:none;margin:0;padding:0}footer.site li{padding:3px 0}
footer.site .bottom{border-top:1px solid #374151;padding:14px 16px;text-align:center;font-size:.88rem;color:#9ca3af}
.pagination{display:flex;gap:8px;justify-content:center;margin:24px 0}.pagination a,.pagination span{border:1px solid var(--line);border-radius:8px;padding:7px 13px}
.pagination .cur{background:var(--brand);color:#fff;border-color:var(--brand)}
.breadcrumb{font-size:.88rem;color:var(--muted);margin-bottom:6px}
.empty{background:var(--soft);border:1px solid var(--line);border-radius:10px;padding:22px;text-align:center}
form.contact label{display:block;font-weight:600;margin:14px 0 4px}form.contact input,form.contact textarea,form.contact select{width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;font:inherit}
form.contact button{margin-top:16px;padding:11px 20px;background:var(--brand);color:#fff;border:0;border-radius:8px;font-weight:700;cursor:pointer}
`;

// ---------------------------------------------------------------- layout
function sidebarHtml() {
  const cats = CATEGORIES.map((c) => {
    const n = published.filter((a) => a.category_slug === c.slug).length;
    return `<li><a href="/category/${c.slug}/">${esc(c.name)}</a><span class="count">${n}</span></li>`;
  }).join('');
  const lat = latest.map((a) => `<li><a href="/post/${a.slug}/">${esc(a.title)}</a><br><small>${fmtDate(a.publish_date)}</small></li>`).join('') || '<li>No articles yet.</li>';
  const tags = popularTags.map(([t, n]) => `<a class="tag" href="/tag/${tagSlug(t)}/">${esc(t)} (${n})</a>`).join('') || 'No tags yet.';
  return `<aside>
    <div class="box"><h3>Search</h3><form class="searchbox" action="/search/" method="get"><input type="search" name="q" placeholder="Search articles…" aria-label="Search articles"><button type="submit">Search</button></form></div>
    <div class="box"><h3>Categories</h3><ul>${cats}</ul></div>
    <div class="box"><h3>Latest Posts</h3><ul>${lat}</ul></div>
    <div class="box"><h3>Popular Tags</h3>${tags}</div>
  </aside>`;
}

function pageHtml({ title, desc, canonical, ogImage, extraHead = '', body, jsonLd = null }) {
  const catLinks = CATEGORIES.map((c) => `<a href="/category/${c.slug}/">${esc(c.name)}</a>`).join('');
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canonical)}">
${ogImage ? `<meta property="og:image" content="${esc(ogImage)}">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:image" content="${esc(ogImage)}">` : '<meta name="twitter:card" content="summary">'}
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/style.css">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ''}
${extraHead}</head>
<body>
<header class="site"><div class="wrap topbar">
<a class="logo" href="/">${SITE_NAME.replace(' ', ' <span>')} </a>
<nav class="main" aria-label="Main navigation">
<a href="/">Home</a>
<div class="dropdown" id="catDrop"><button class="dropbtn" type="button" aria-haspopup="true" onclick="document.getElementById('catDrop').classList.toggle('open')">Categories ▾</button><div class="dropdown-content">${catLinks}</div></div>
<a href="/about/">About</a><a href="/contact/">Contact</a>
</nav></div></header>
<main class="layout"><div>${body}</div>${sidebarHtml()}</main>
<footer class="site"><div class="wrap cols">
<div><h4>${SITE_NAME}</h4><p>${esc(SITE_DESC)}</p></div>
<div><h4>Categories</h4><ul>${CATEGORIES.map((c) => `<li><a href="/category/${c.slug}/">${esc(c.name)}</a></li>`).join('')}</ul></div>
<div><h4>Information</h4><ul>
<li><a href="/about/">About Us</a></li><li><a href="/contact/">Contact</a></li>
<li><a href="/privacy-policy/">Privacy Policy</a></li><li><a href="/disclaimer/">Disclaimer</a></li>
<li><a href="/terms/">Terms of Service</a></li><li><a href="/sitemap.xml">Sitemap</a></li>
</ul></div></div>
<div class="bottom">© ${new Date().getFullYear()} ${SITE_NAME} (${SITE_URL.replace('https://', '')}). All rights reserved. · A new article is published every day at 09:00 WIB.</div>
</footer>
<script>document.addEventListener('click',function(e){var d=document.getElementById('catDrop');if(d&&!d.contains(e.target))d.classList.remove('open');});</script>
</body></html>`;
}

function cardHtml(a) {
  return `<article class="card">
<a href="/post/${a.slug}/"><img src="${esc(a.image)}" alt="${esc(a.image_alt)}" loading="lazy" width="1200" height="630"></a>
<h2><a href="/post/${a.slug}/">${esc(a.title)}</a></h2>
<p class="meta"><time datetime="${a.publish_date}">${fmtDate(a.publish_date)}</time> · <a href="/category/${a.category_slug}/">${esc(a.category)}</a> · ${wordCount(a.body_html)} words</p>
<p class="excerpt">${esc(a.excerpt)}</p>
<p><a href="/post/${a.slug}/">Read more →</a></p></article>`;
}

function paginationHtml(base, page, totalPages) {
  if (totalPages <= 1) return '';
  let links = '';
  for (let i = 1; i <= totalPages; i++) {
    const href = i === 1 ? `${base}` : `${base}page/${i}/`;
    links += i === page ? `<span class="cur">${i}</span>` : `<a href="${href}">${i}</a>`;
  }
  return `<nav class="pagination" aria-label="Pagination">${links}</nav>`;
}

function listPage({ items, title, desc, canonical, base, page = 1, heading, intro = '' }) {
  const totalPages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const slice = items.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const body = slice.length
    ? slice.map(cardHtml).join('') + paginationHtml(base, page, totalPages)
    : `<div class="empty"><p><strong>No articles published here yet.</strong></p><p>The first article is scheduled for 12 November 2026, and a new article is published every day after that at 09:00 WIB. Please check back soon.</p></div>`;
  const pageTitle = page > 1 ? `${title} — Page ${page}` : title;
  const fullTitle = pageTitle === SITE_NAME ? SITE_NAME : `${pageTitle} | ${SITE_NAME}`;
  return pageHtml({ title: fullTitle, desc, canonical, body: `<h1>${esc(heading)}</h1>${intro ? `<p>${esc(intro)}</p>` : ''}${body}` });
}

// ---------------------------------------------------------------- build
cleanDist();
write('style.css', CSS);
write('favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#0f766e"/><text x="32" y="44" font-family="Arial,sans-serif" font-size="36" font-weight="bold" fill="#fff" text-anchor="middle">E</text></svg>`);
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
write('ads.txt', `# Google AdSense — Publisher ID to confirm before review\n# Default ID already used by the owner on other sites: ${PUBLISHER_ID}\ngoogle.com, pub-${PUBLISHER_ID.replace('ca-pub-', '')}, DIRECT, f08c47fec0942fa0\n`);

// --- homepage + pagination (published only)
const homePages = Math.max(1, Math.ceil(published.length / PER_PAGE));
for (let p = 1; p <= homePages; p++) {
  write(p === 1 ? 'index.html' : `page/${p}/index.html`,
    listPage({ items: published, title: SITE_NAME, desc: SITE_DESC, canonical: p === 1 ? `${SITE_URL}/` : `${SITE_URL}/page/${p}/`, base: '/', page: p, heading: 'Latest Articles', intro: 'One new, practical article every day — search, AI, tech, tools, and staying safe online.' }));
}

// --- category pages (published only)
for (const c of CATEGORIES) {
  const items = published.filter((a) => a.category_slug === c.slug);
  const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  for (let p = 1; p <= pages; p++) {
    write(p === 1 ? `category/${c.slug}/index.html` : `category/${c.slug}/page/${p}/index.html`,
      listPage({ items, title: `${c.name}`, desc: `${c.desc} Articles on ${SITE_NAME}.`, canonical: p === 1 ? `${SITE_URL}/category/${c.slug}/` : `${SITE_URL}/category/${c.slug}/page/${p}/`, base: `/category/${c.slug}/`, page: p, heading: c.name, intro: c.desc }));
  }
}

// --- tag pages (published only)
const allTags = [...new Set(published.flatMap((a) => a.tags))];
for (const t of allTags) {
  const items = published.filter((a) => a.tags.includes(t));
  const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  for (let p = 1; p <= pages; p++) {
    write(p === 1 ? `tag/${tagSlug(t)}/index.html` : `tag/${tagSlug(t)}/page/${p}/index.html`,
      listPage({ items, title: `Tag: ${t}`, desc: `Articles tagged "${t}" on ${SITE_NAME}.`, canonical: p === 1 ? `${SITE_URL}/tag/${tagSlug(t)}/` : `${SITE_URL}/tag/${tagSlug(t)}/page/${p}/`, base: `/tag/${tagSlug(t)}/`, page: p, heading: `Tag: ${t}` }));
  }
}

// --- article pages (published only)
for (const a of published) {
  const sameCat = published.filter((x) => x.slug !== a.slug && x.category_slug === a.category_slug);
  const others = published.filter((x) => x.slug !== a.slug && x.category_slug !== a.category_slug);
  const related = [...sameCat, ...others].slice(0, 3);
  const encUrl = encodeURIComponent(postUrl(a)); const encTitle = encodeURIComponent(a.title);
  const share = `<div class="share"><strong>Share:</strong>
<a href="https://wa.me/?text=${encTitle}%20${encUrl}" target="_blank" rel="noopener">WhatsApp</a>
<a href="https://www.facebook.com/sharer/sharer.php?u=${encUrl}" target="_blank" rel="noopener">Facebook</a>
<a href="https://twitter.com/intent/tweet?text=${encTitle}&amp;url=${encUrl}" target="_blank" rel="noopener">X</a>
<a href="https://t.me/share/url?url=${encUrl}&amp;text=${encTitle}" target="_blank" rel="noopener">Telegram</a>
<a href="https://www.linkedin.com/sharing/share-offsite/?url=${encUrl}" target="_blank" rel="noopener">LinkedIn</a>
<a href="mailto:?subject=${encTitle}&amp;body=${encUrl}">Email</a>
<button type="button" onclick="navigator.clipboard.writeText('${postUrl(a)}').then(()=>{this.textContent='Copied!';})">Copy link</button></div>`;
  const relatedHtml = related.length ? `<section class="related"><h2>Related Articles</h2>${related.map(cardHtml).join('')}</section>` : '';
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: a.title, description: a.excerpt, image: [a.image],
    datePublished: a.publish_date, dateModified: a.publish_date,
    author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl(a) },
    wordCount: wordCount(a.body_html),
  };
  const body = `<article class="post"><p class="breadcrumb"><a href="/">Home</a> › <a href="/category/${a.category_slug}/">${esc(a.category)}</a></p>
<h1>${esc(a.title)}</h1>
<p class="meta"><time datetime="${a.publish_date}">${fmtDate(a.publish_date)}</time> · ${esc(a.author)} · <a href="/category/${a.category_slug}/">${esc(a.category)}</a> · ${wordCount(a.body_html)} words</p>
<img class="hero" src="${esc(a.image)}" alt="${esc(a.image_alt)}" width="1200" height="630">
<div class="body">${a.body_html}</div>
<p>${a.tags.map((t) => `<a class="tag" href="/tag/${tagSlug(t)}/">${esc(t)}</a>`).join('')}</p>
${share}${relatedHtml}</article>`;
  write(`post/${a.slug}/index.html`, pageHtml({
    title: `${a.title} | ${SITE_NAME}`, desc: a.excerpt, canonical: postUrl(a), ogImage: a.image,
    extraHead: `<meta property="og:type" content="article">\n<meta property="article:published_time" content="${a.publish_date}">\n<meta property="article:section" content="${esc(a.category)}">`,
    body, jsonLd,
  }));
}

// --- search (client-side, published only)
write('search.json', JSON.stringify(published.map((a) => ({ title: a.title, excerpt: a.excerpt, url: `/post/${a.slug}/`, date: a.publish_date, category: a.category, tags: a.tags })), null, 2));
write('search/index.html', pageHtml({
  title: `Search | ${SITE_NAME}`, desc: `Search articles on ${SITE_NAME}.`, canonical: `${SITE_URL}/search/`,
  body: `<h1>Search</h1><form class="searchbox" action="/search/" method="get"><input type="search" name="q" id="q" placeholder="Type a keyword…" aria-label="Search articles"><button type="submit">Search</button></form><div id="results" style="margin-top:18px"></div>
<script>
const q=new URLSearchParams(location.search).get('q')||'';
document.getElementById('q').value=q;
fetch('/search.json').then(r=>r.json()).then(items=>{
  const box=document.getElementById('results');
  if(!q){box.innerHTML='<p>Type a keyword above to search published articles.</p>';return;}
  const needle=q.toLowerCase();
  const hits=items.filter(a=>(a.title+' '+a.excerpt+' '+a.category+' '+a.tags.join(' ')).toLowerCase().includes(needle));
  box.innerHTML=hits.length?('<p>'+hits.length+' result(s) for &ldquo;'+q.replace(/</g,'&lt;')+'&rdquo;:</p>'+hits.map(a=>'<article class="card"><h2><a href="'+a.url+'">'+a.title.replace(/</g,'&lt;')+'</a></h2><p class="meta">'+a.date+' · '+a.category+'</p><p>'+a.excerpt.replace(/</g,'&lt;')+'</p></article>').join('')):'<p>No results for &ldquo;'+q.replace(/</g,'&lt;')+'&rdquo;. Try another keyword.</p>';
});
</script>`,
}));

// --- static AdSense pages
const staticPages = {
  'about': ['About Us', 'The Edge Search is an independent online publication about how people find information on the internet. We write clear, practical articles about search engines, AI search, technology trends, how-to guides, digital tools, and online safety. A new article is published every day at 09:00 WIB (Jakarta time). Our goal is simple: help readers understand technology without jargon, make better decisions, and stay safe online. Articles are written for general readers, not only for specialists, and every article is reviewed for accuracy before publication. If you spot an error, please tell us through the contact page — corrections matter to us.'],
  'contact': ['Contact Us', 'We welcome questions, corrections, and suggestions. Use the form below to send us a message — it opens your email app, because this site has no server or database and does not store messages itself. For advertising or partnership enquiries, please include “Partnership” in the subject line. We aim to reply within 3 working days.'],
  'privacy-policy': ['Privacy Policy', 'This website is a static site hosted on Cloudflare Pages. We do not run our own server, database, or user accounts, and we do not collect names, email addresses, or passwords. When you use the search box, the search runs entirely in your browser using a public list of published articles; your search terms are not sent to us or stored. This site may use Google AdSense and Google Analytics in the future. Those services may use cookies to show ads and measure visits, as described in Google’s own privacy policy. You can control cookies in your browser settings. External links on this site lead to other websites, and we are not responsible for their content or privacy practices. This policy may change from time to time; the latest version is always published on this page.'],
  'disclaimer': ['Disclaimer', 'The information on this website is provided for general information and education only. While we work to keep articles accurate and up to date, technology changes quickly, and we make no guarantee that every article is complete or correct at the time you read it. Always check official sources before making important decisions, especially about money, health, or security. Any product, price, or feature mentioned in an article may have changed since publication. This site is not professional advice — financial, legal, medical, or technical — and should not replace advice from a qualified professional. We are not liable for any loss or damage from using information on this site. Links to external websites are provided for convenience; we do not control those sites and do not endorse everything they publish.'],
  'terms': ['Terms of Service', 'By using this website, you agree to these terms. Content on this site is for personal, non-commercial use. You may share links to our articles, but please do not copy, republish, or sell our articles without written permission. You agree not to misuse the site, attempt to disrupt it, or use it for unlawful purposes. We may update these terms at any time, and continued use of the site means you accept the updated terms. If any part of these terms is found unenforceable, the remaining parts still apply. These terms are governed by the laws of Indonesia.'],
};
for (const [slug, [title, text]] of Object.entries(staticPages)) {
  let body = `<h1>${esc(title)}</h1><p>${esc(text)}</p>`;
  if (slug === 'contact') {
    body += `<form class="contact" action="mailto:hello@theedgesearch.my.id" method="post" enctype="text/plain">
<label for="c-name">Your name</label><input id="c-name" name="name" required>
<label for="c-email">Your email</label><input id="c-email" name="email" type="email" required>
<label for="c-subject">Subject</label><select id="c-subject" name="subject"><option>General question</option><option>Correction</option><option>Partnership</option><option>Other</option></select>
<label for="c-msg">Message</label><textarea id="c-msg" name="message" rows="6" required></textarea>
<button type="submit">Send via Email</button></form>
<p><small>Note: this form opens your email app (mailto). This site has no backend server, so messages are not stored on the site itself.</small></p>`;
  }
  if (slug === 'about') body += `<p><strong>Publication schedule:</strong> one new article every day at 09:00 WIB, from 12 November 2026 to 11 November 2027.</p>`;
  write(`${slug}/index.html`, pageHtml({ title: `${title} | ${SITE_NAME}`, desc: text.slice(0, 150), canonical: `${SITE_URL}/${slug}/`, body }));
}

// --- 404
write('404.html', pageHtml({ title: `Page Not Found | ${SITE_NAME}`, desc: 'The page you are looking for does not exist.', canonical: `${SITE_URL}/404.html`, body: '<h1>Page Not Found (404)</h1><p>The page you are looking for may have moved or no longer exists. <a href="/">Return to the homepage</a> or use the search box in the sidebar.</p>' }));

// --- sitemaps: index + posts + pages (published only)
const postUrls = published.map((a) => `  <url><loc>${postUrl(a)}</loc><lastmod>${a.publish_date}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`).join('\n');
write('sitemap-posts.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${postUrls}\n</urlset>\n`);
const staticUrls = ['', ...Object.keys(staticPages), 'search', ...CATEGORIES.map((c) => `category/${c.slug}`), ...allTags.map((t) => `tag/${tagSlug(t)}`)];
write('sitemap-pages.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${staticUrls.map((u) => `  <url><loc>${SITE_URL}/${u ? u + '/' : ''}</loc><changefreq>weekly</changefreq><priority>${u === '' ? '1.0' : '0.6'}</priority></url>`).join('\n')}\n</urlset>\n`);
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${SITE_URL}/sitemap-posts.xml</loc></sitemap>\n  <sitemap><loc>${SITE_URL}/sitemap-pages.xml</loc></sitemap>\n</sitemapindex>\n`);

// ---------------------------------------------------------------- report
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else files.push(path.relative(DIST, p)); } })(DIST);
console.log(`Build date (Asia/Jakarta): ${TODAY}`);
console.log(`Articles total: ${articles.length} | published: ${published.length} | scheduled (future, hidden): ${scheduled.length}`);
if (scheduled.length) console.log('Hidden future slugs:', scheduled.map((a) => a.slug).join(', '));
console.log(`Generated ${files.length} files in dist/`);
