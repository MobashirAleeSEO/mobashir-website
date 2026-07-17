# Mobashir Alee Khan — Deployment Guide
## Senior Architect Review + Launch Documentation

---

## 0. WHAT THIS REVIEW ACTUALLY FOUND

Before the guides, here's the honest state of the project as of this review — not a generic "everything's perfect" summary.

### Bugs found and fixed
| Bug | Where | Fix |
|---|---|---|
| `.accordion-panel` declared twice, second block silently overriding the first | `styles.css` | Merged into one rule |
| `--ease-in-out` used in 7+ places (loading screen, blobs, page transitions) but **never defined** — all those animations were silently falling back to browser default easing | `styles.css` | Added the missing token |
| Share buttons used `href="#" target="_blank"` — opened a blank new tab that went nowhere | `blog-post.html` | Replaced with real LinkedIn/Twitter share-intent URLs |
| Mobile menu had no focus trap and never returned focus to the toggle button on close — a real keyboard-navigation dead end | `script.js` | Added focus trap + focus return |
| **20+ broken internal links** — nav, footer, service cards, industry cards, and blog previews all pointed to pages that were never built (`services.html`, `pricing.html`, `portfolio.html`, etc.) | All 4 original pages | Rerouted every link to a real destination — see §1 |
| Logo linked to `/` (root-absolute) instead of `index.html`, which breaks if the site isn't served from a domain root | `index.html` | Fixed to relative path |
| Meta titles/descriptions running 180-208 characters — Google truncates around 155-160 | All pages | Trimmed to SERP-safe lengths |
| 8 separate CSS/JS requests per page | All pages | Bundled + minified into `app.min.css` / `app.min.js` (2 requests) |

### The one thing I won't paper over
Of the original sitemap, **4 pages now genuinely exist and work**: Home, About, Blog, Blog Post, Contact, 404, Privacy Policy, Terms (8 total). **Still missing**: standalone Services, Pricing, Portfolio, Case Studies, Testimonials, FAQ pages, 6 industry pages, and 8 individual service detail pages.

Rather than leave those as dead links, every nav/footer/card link that pointed to a missing page now routes to either:
- A real, already-built section on the homepage (`index.html#services`, `#portfolio`, `#case-studies`, `#testimonials`, `#faq`) — these sections have real content, just not standalone pages
- `contact.html` — for anything that was a dead-end action link (industry cards, "explore service" links)

This means **the site has zero broken links today**, but it is not the full 20-page site originally scoped. That's a scope call, not a bug — flagging it here so it's a decision you're making knowingly, not a gap you discover after handing this to a client.

---

## 1. FINAL FOLDER STRUCTURE

```
mobashir-alee-khan-website/
├── index.html                 Home
├── about.html                 About
├── blog.html                  Blog listing (search, categories, featured/recent)
├── blog-post.html             Single article template (GEO piece, fully built)
├── contact.html                Contact + lead form + booking modal
├── 404.html                   Error page (set as custom 404 in hosting config)
├── privacy-policy.html
├── terms.html
├── app.min.css                 PRODUCTION — bundled + minified (load this)
├── app.min.js                  PRODUCTION — bundled + minified (load this)
├── styles.css                  SOURCE — design tokens, base layout, components
├── pages.css                   SOURCE — inner-page components (forms, pricing, legal prose)
├── blog.css                    SOURCE — blog listing + single post
├── animations.css              SOURCE — particle/cursor/tilt/parallax
├── cro.css                     SOURCE — modals, floating actions, trust badges
├── script.js                   SOURCE — nav, counters, reveal, carousel, accordion
├── animations.js               SOURCE — cursor, tilt, parallax, text reveal
├── cro.js                      SOURCE — modals, exit intent, lead forms
├── robots.txt
├── sitemap.xml
├── README.md                    Rebuild instructions for the source → bundle pipeline
├── DEPLOYMENT.md                This file
└── assets/
    ├── favicon.svg
    └── photo-placeholder.svg
```

**Rule going forward:** never hand-edit `app.min.css` / `app.min.js`. Edit the source files, then rebuild (commands in `README.md`).

---

## 2. DEPLOYMENT GUIDE (General)

This is a static site — no build step, no server, no database. Any static host works. The two most relevant here are **Cloudflare Pages** (recommended — faster edge network, generous free tier, built-in analytics) and **GitHub Pages** (simplest, free, ties directly to your GitHub repo).

**Pre-flight checklist before uploading anywhere:**
1. Open `robots.txt` and `sitemap.xml` — confirm the domain matches where you're actually deploying (`mobashiraleekhan.com` is a placeholder if that's not your real domain)
2. Search every HTML file for `mobashiraleekhan.com` and replace with your real domain
3. Replace the WhatsApp number (`wa.me/10000000000`) in `index.html`, `contact.html`, and inside `cro.js`-driven markup with the real number
4. Replace the Calendly placeholder `data-url` in the booking modal with your real Calendly link (or remove the modal if you're not using Calendly)
5. Decide what to do about `og-images/*.jpg` — those files are referenced in meta tags but don't exist. Either generate real 1200×630 social preview images at those paths, or remove the `og:image`/`twitter:image` tags until you have them

---

## 3. GITHUB UPLOAD GUIDE

1. Create a new repository on GitHub (e.g. `mobashir-website`) — public or private, doesn't matter for static hosting
2. On your machine, in the project folder:
   ```bash
   git init
   git add .
   git commit -m "Initial production-ready site"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/mobashir-website.git
   git push -u origin main
   ```
3. If you don't have git installed locally, GitHub's web UI also accepts drag-and-drop upload of the whole folder for the first commit (Add file → Upload files)
4. Add a `.gitignore` if you keep `node_modules` around locally for rebuilding bundles:
   ```
   node_modules/
   app.bundle.css
   app.bundle.js
   ```

---

## 4. CLOUDFLARE PAGES DEPLOYMENT GUIDE

1. Sign in at [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
2. Authorize Cloudflare to access your GitHub account, select the repository
3. Build settings:
   - **Framework preset:** None
   - **Build command:** leave blank (no build step needed)
   - **Build output directory:** `/` (root)
4. Click **Save and Deploy** — first deploy takes about a minute
5. You'll get a `*.pages.dev` URL immediately — verify the site loads correctly there before touching DNS
6. Every future `git push` to `main` auto-deploys — no manual redeploy needed

---

## 5. GITHUB PAGES DEPLOYMENT GUIDE

1. In your GitHub repo: **Settings** → **Pages**
2. Under **Source**, select **Deploy from a branch**
3. Branch: `main`, folder: `/ (root)` → **Save**
4. GitHub gives you a URL like `https://YOUR-USERNAME.github.io/mobashir-website/` within a few minutes
5. **Important:** if deploying to a project page (not a `username.github.io` root repo), every root-relative asset path needs to account for the subpath. This project uses relative paths (`app.min.css`, not `/app.min.css`), so it should work at a subpath without changes — but verify the deployed site's console for any 404s on assets after first deploy.

---

## 6. CUSTOM DOMAIN SETUP GUIDE

### On Cloudflare Pages
1. In your Pages project → **Custom domains** → **Set up a custom domain**
2. Enter your domain (e.g. `mobashiraleekhan.com`)
3. If your domain's DNS is already on Cloudflare, it configures automatically
4. If not, add the CNAME record Cloudflare shows you at your registrar, pointing to `your-project.pages.dev`
5. SSL certificate provisions automatically within minutes

### On GitHub Pages
1. In repo **Settings** → **Pages** → **Custom domain**, enter your domain
2. At your DNS provider, add:
   - For an apex domain (`mobashiraleekhan.com`): four `A` records pointing to GitHub's IPs (`185.199.108.153`, `.109.153`, `.110.153`, `.111.153`)
   - For a subdomain (`www.mobashiraleekhan.com`): a `CNAME` record pointing to `YOUR-USERNAME.github.io`
3. Check **Enforce HTTPS** once the certificate is issued (can take up to 24 hours)

### Either way
Update `robots.txt`, `sitemap.xml`, and every `canonical`/`og:url` meta tag in the HTML to match the final live domain if it differs from the placeholder.

---

## 7. GOOGLE SEARCH CONSOLE SETUP

1. Go to [search.google.com/search-console](https://search.google.com/search-console)
2. Add property → choose **URL prefix** (simpler than Domain property, no DNS verification needed) → enter `https://yourdomain.com`
3. Verify ownership — easiest method for a static site: **HTML tag** option, copy the `<meta name="google-site-verification" ...>` tag it gives you, paste it into the `<head>` of `index.html`, redeploy, then click Verify
4. Once verified: **Sitemaps** (left sidebar) → enter `sitemap.xml` → Submit
5. Use **URL Inspection** on your homepage URL → **Request Indexing** to speed up the first crawl

---

## 8. GOOGLE ANALYTICS SETUP

1. Go to [analytics.google.com](https://analytics.google.com) → Admin → Create Account (if you don't have one) → Create Property
2. Enter site name, timezone, currency → choose **Web** as the platform
3. Copy the **Measurement ID** (format `G-XXXXXXXXXX`)
4. Add this snippet just before `</head>` on every page (or centralize by adding it once you rebuild — see note below):
   ```html
   <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
   <script>
     window.dataLayer = window.dataLayer || [];
     function gtag(){dataLayer.push(arguments);}
     gtag('js', new Date());
     gtag('config', 'G-XXXXXXXXXX');
   </script>
   ```
5. **This project doesn't include analytics by default** (kept out deliberately — you should decide when consent/privacy messaging is in place first, especially since the Privacy Policy already references analytics use). Add the snippet only once you're ready, and update `privacy-policy.html` if your actual analytics setup differs from what's described there.

---

## 9. BING WEBMASTER TOOLS SETUP

1. Go to [bing.com/webmasters](https://www.bing.com/webmasters)
2. Sign in with a Microsoft account → Add a site → enter your URL
3. Fastest verification: **Import from Google Search Console** (if you already verified there) — one click, no extra tags needed
4. Otherwise: same options as GSC (HTML meta tag, XML file, or DNS)
5. Submit `sitemap.xml` under **Sitemaps** in the left sidebar

---

## 10. INDEXING GUIDE

1. Confirm `robots.txt` isn't accidentally blocking anything — this project's `robots.txt` allows all crawlers including AI crawlers (GPTBot, PerplexityBot, ClaudeBot) since GEO/AEO visibility is the point
2. Submit `sitemap.xml` in both Google Search Console and Bing Webmaster Tools (§7, §9)
3. Use **URL Inspection** in GSC to manually request indexing for each of the 8 real pages — don't wait for organic crawl discovery on a brand-new domain
4. Build a few real backlinks early (LinkedIn post, a directory listing, a guest mention) — new domains index faster once Google finds at least one external link pointing in
5. Expect initial indexing within a few days to two weeks for a new domain; the manual URL Inspection requests speed this up but don't guarantee same-day indexing

---

## 11. CORE WEB VITALS CHECKLIST

| Metric | Target | Status on this build |
|---|---|---|
| **LCP** (Largest Contentful Paint) | < 2.5s | Hero headline is text, not an image — fast by default. Fonts load via preload + swap so text isn't blocked. |
| **CLS** (Cumulative Layout Shift) | < 0.1 | The one real `<img>` (About photo) has explicit `width`/`height`. No ads, no late-injected banners. Minor risk: font swap can cause tiny reflow — acceptable, within budget. |
| **INP** (Interaction to Next Paint) | < 200ms | All animations are `transform`/`opacity` only. Parallax and particle backgrounds are `requestAnimationFrame`-throttled. Cursor/tilt/glow auto-disable on touch and `prefers-reduced-motion`. |
| **TTFB** (Time to First Byte) | < 800ms | Depends entirely on host — Cloudflare Pages' edge network will beat GitHub Pages here for most visitors. |
| **Requests per page** | Minimized | 2 bundled assets (`app.min.css`, `app.min.js`) instead of 8 separate files. |
| **Total page weight** | Reasonable | CSS bundle 55KB minified, JS bundle 16KB minified — light by 2026 standards. |

**Before you trust this table:** run the live deployed URL through [PageSpeed Insights](https://pagespeed.web.dev) once it's on a real domain. Everything above is true of the code; real-world scores also depend on your host's TTFB and whatever CDN/caching headers it sets.

---

## 12. FINAL QUALITY CHECKLIST

### Must fix before real client traffic
- [ ] Replace placeholder WhatsApp number with the real one
- [ ] Replace Calendly placeholder with a real embed or link
- [ ] Generate real OG/social preview images (`og-images/*.jpg` currently don't exist)
- [ ] Replace the About page photo placeholder SVG with a real headshot
- [ ] Decide on the Awards/Recognition section on the homepage — it's explicitly labeled "placeholder" in the visible copy; replace with real accolades or remove the section
- [ ] Update `robots.txt`, `sitemap.xml`, and every canonical/OG URL if the final domain differs from `mobashiraleekhan.com`
- [ ] Add Google Analytics if/when you want visitor data (not included by default — see §8)

### Already verified in this review
- [x] Zero broken internal links (was 20+, now 0)
- [x] No duplicate CSS rules silently overriding each other
- [x] No undefined CSS custom properties
- [x] Mobile menu fully keyboard-accessible (focus trap + return)
- [x] All JSON-LD schema validates as proper JSON
- [x] Single H1 per page, no skipped heading levels
- [x] Meta titles/descriptions within SERP-safe length
- [x] `prefers-reduced-motion` and `pointer: coarse` respected across all animation/cursor/tilt code
- [x] No duplicate `id` attributes on any page
- [x] All forms have proper label associations and error states
- [x] Skip-to-content link present on every page

### Known, intentional scope gaps (not bugs — decisions to make)
- [ ] Standalone Services, Pricing, Portfolio, Case Studies, Testimonials, FAQ pages don't exist yet (homepage sections + Contact currently cover this)
- [ ] 8 individual service detail pages and 6 industry pages don't exist yet
- [ ] No blog posts exist beyond the one GEO article — other blog cards link back to the blog listing
