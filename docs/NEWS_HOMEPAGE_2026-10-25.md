# Homepage and NZCF news update — 25 October 2026

The homepage retains compact links to Tournament results and Photo gallery. Full result cards and album previews remain on their respective pages, rather than being loaded or displayed on the homepage. Existing result and gallery records are unchanged.

Two short, attributed NZCF news summaries link to the source notices published on 13 October 2026: Director of Competitions expressions of interest (171126) and World Senior Team Championship 2027 (171123). They retain the source publication date rather than pretending the articles were published today.

On a matching HPCC production deployment only, `scripts/seed-hpcc-nzcf-news.mjs` inserts these two records into `news_posts` using the existing server database configuration. It requires HPCC repository metadata and the exact HPCC Supabase project URL. Local and Preview builds do not write to any database. The inserts ignore existing matching slugs, preserving admin edits and publication choices, and verify both slugs exist. No social media posts or emails are created. The records are editable under Admin → News. The source data in `content/nzcf-news-october-2026.json` also supplies the existing announcement fallback; database records take precedence.

No SQL migration is needed. To remove the deployment seed after publication, remove the `&& node scripts/seed-hpcc-nzcf-news.mjs` build suffix. Keeping it is safe for repeated deployments: it will not overwrite existing matching records. Unpublishing through admin hides the announcement fallback too.

The News admin list excludes internal programme configuration records, including yearly Poppies and Interschool records. Those remain editable in their dedicated admin pages.
