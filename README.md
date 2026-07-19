# Mobashir Alee Khan — Production Build Notes

## What to deploy
Upload everything in this folder as-is. The pages load two bundled, minified
files for performance:

- `app.min.css` — bundles styles.css + pages.css + blog.css + animations.css + cro.css
- `app.min.js` — bundles script.js + animations.js + cro.js

This cuts each page from 8 render/parse-blocking requests down to 2.

## Editing the site
**Don't hand-edit `app.min.css` / `app.min.js`** — they're generated output and
will be overwritten. Edit the source files instead:

| Source file | Covers |
|---|---|
| `styles.css` | Design tokens, base layout, nav, buttons, cards, hero |
| `pages.css` | Inner-page components (forms, pricing, breadcrumbs, legal prose) |
| `blog.css` | Blog listing + single post (TOC, author box, related posts) |
| `animations.css` | Particle/cursor/tilt/parallax/loading-screen visuals |
| `cro.css` | Announcement bar, floating actions, modals, trust badges |
| `script.js` | Nav, counters, scroll reveal, carousel, accordion, forms |
| `animations.js` | Cursor, tilt, parallax, text reveal, page transitions |
| `cro.js` | Modals, exit intent, sticky CTA, lead forms |

After editing any source file, rebuild the bundles:

```bash
# CSS
cat styles.css pages.css blog.css animations.css cro.css > app.bundle.css
npx clean-css-cli -o app.min.css app.bundle.css

# JS
cat script.js animations.js cro.js > app.bundle.js
npx terser app.bundle.js -o app.min.js --compress --mangle
```

## Before this goes live — real gaps, not just polish
1. **Social preview images don't exist.** `og:image` / `twitter:image` tags
   point to `og-images/og-home.jpg` etc. — those files were never generated
   (no fabricated binary images). Add real 1200×630 images at those paths.
2. **Awards section is explicitly placeholder.** The homepage "Recognition"
   tiles (Top Rated Freelancer, 5.0 rating) are labeled "— placeholder" in
   the visible copy on purpose. Replace with verified real accolades or
   remove the section — don't just delete the label and leave fabricated claims.
3. **WhatsApp number is a dummy** (`wa.me/10000000000`) — swap for the real number.
4. **Calendly is a placeholder** — the booking modal shows the embed code as
   a code sample, not a live widget. Swap in the real `data-url` and the
   Calendly widget script.
5. **11 pages from the original sitemap aren't built yet**: Services,
   Pricing, Portfolio, Case Studies, Testimonials, FAQ, Contact, 404,
   Privacy Policy, Terms, and 8 individual service pages. Every nav/footer
   link across the site already points to these filenames — they'll 404
   until built.
6. **robots.txt / sitemap.xml assume the domain `mobashiraleekhan.com`.**
   Update if the real domain differs.

## What's already handled
- Single H1 per page, no skipped heading levels
- Meta titles/descriptions trimmed to SERP-safe lengths
- JSON-LD validated (Organization, Person, Service, FAQPage, BlogPosting,
  BreadcrumbList) — cross-linked via shared `@id`s so Google treats it as
  one consistent entity across pages
- Fonts load non-render-blocking (preload + swap pattern)
- Mobile menu has full keyboard focus trapping and focus return
- `prefers-reduced-motion` and `pointer: coarse` respected throughout —
  cursor, tilt, parallax and glow effects all disable automatically
