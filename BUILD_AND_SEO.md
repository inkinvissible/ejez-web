# Static Blog Build (SEO + Indexing)

This project now includes a static generation step for blog content from Sanity:

- Generates SEO-first `blog.html` with article cards rendered in HTML source.
- Generates one static page per article (`article-<kind>-<slug>.html`).
- Generates `sitemap.xml`, `robots.txt`, and `.nojekyll`.

## Local Build

1. Update `sanity.build.config.json`:
   - `siteUrl`
   - `projectId`
   - `dataset`
2. Run:

```bash
npm run build:static
```

Output is written to `.site/`.

## GitHub Pages

Workflow: `.github/workflows/deploy-pages.yml`

- Runs static build on push to `main`.
- Auto-resolves `SITE_URL` for user/org pages.
- Deploys `.site` artifact to GitHub Pages.

## Notes

- Runtime dynamic pages/scripts remain in source as fallback.
- Deployed pages are generated statically for crawler-friendly indexing.
