# t_sitemap_fresh

Sitemaps are generated from page sources. Source-controlled pages use their last source commit, never the build clock. Hash-checked date snapshots preserve verified dates in source-only hosting uploads; an unknown changed page must be regenerated from a full Git checkout. Run the normal build from committed source before publishing. The app includes every published HeyCatch article at request time, using its updated date or publication date when no update is provided; unknown dates are omitted.

After a successful production publication, run `npm run indexnow:publish`. This verifies that the root key file is live, reads the live sitemap, rejects foreign hosts, and sends one POST containing all published URLs. The `indexnow.yml` GitHub workflow handles successful Production deployment-status events and supports manual dispatch. This is independent of preview builds. IndexNow acceptance does not guarantee indexing.

For CLI publishes outside the app deploy command, run this step explicitly after deployment. If the hosting integration does not emit GitHub deployment-status events, wire this command into its post-publish hook. HeyCatch CMS article publication happens outside GitHub: configure its publish workflow to dispatch the IndexNow workflow after publishing, or dispatch manually. No webhook URL, event format, or credentials were invented.

Verify `/sitemap.xml` on the corresponding production domain, compare lastmod to the page source or CMS record, and repeat a build without source changes: the dates should stay the same. Open the keyLocation listed in scripts/seo/site.json, then run the IndexNow command and expect HTTP 200 or 202.
