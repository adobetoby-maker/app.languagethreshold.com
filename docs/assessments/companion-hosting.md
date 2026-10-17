# Exams companion staging

The owner selected and authorized setup of `exams.languagethreshold.com` on October 17, 2026. It remains a staging hostname until launch acceptance is complete.

Hosting uses the existing Language Threshold app project (`prj_at1LY9ncmWfGUecndikWrEUccuqo`, team `team_WPMJl6w7aYPU9xP3sr8Xx3uN`). Cloudflare holds the authoritative zone. Only the new `exams` CNAME was added, DNS only, Auto TTL, using Vercel's returned target `ad31e05489edd6ef.vercel-dns-017.com`. Other website and mail records were retained. Vercel issued a certificate for the hostname.

The project domain is assigned to the dedicated `codex/exams-staging` branch, initially pinned to application `d4ad837`. Development continues on `codex/admin-exams`; pushing that implementation branch must not advance the staging hostname. The hostname is explicitly aliased to the tested prebuilt Preview `language-threshold-r9iaxlapf-adobetoby-5572s-projects.vercel.app`, deployment `dpl_4o1wjE6JZ9japyi58Vz2Zq39LBxT`, target null. Do not advance the staging branch without checking its resulting deployment and reassigning the hostname to the fully configured, tested Preview. Git-triggered builds are not proof that runtime AI configuration is present.

Root GET/HEAD requests open focused Exams using validated module/language/assignment context. Explicit learning tabs remain available on this same staged build, so a return to a lesson does not send a learner to the older live app. Companion SSR responses are no-store, no-referrer and noindex/nofollow. No live app navigation was redirected to this hostname and no production deployment was promoted.

## Identity and sign-in

Both hosts use the existing Supabase project `pollhlkgltdkdskdzsgd`, identities and authorization rules. The existing Site URL remains `https://app.languagethreshold.com`. The existing redirect entries were retained and only `https://exams.languagethreshold.com/**` was appended. Google was already enabled; its provider credentials, scopes, user roles and policies were not changed.

The client requests a validated return on its current origin and restores assignment/lesson context. Each origin retains its own browser session; the implementation does not copy browser tokens or assume sibling subdomains share localStorage. Use normal existing-account email or provider sign-in on the companion. This is shared identity/provider support, not a claim of a new cross-domain session broker or global cross-origin sign-out.

## Verification and rollout

See `docs/reviews/qa-exams-companion-setup-2026-10-17.json` for current DNS, certificate, deployment and actual sign-in acceptance. Normal Chrome DNS/HTTPS, QA email sign-in/lesson-plan round trip and existing owner Google return all pass. The owner sees none of the QA learner’s private plans; both accounts were signed out normally. Public DNS propagation and a valid TLS response are separate checks: a known negative DNS cache delayed the initial local A lookup. A forced-resolution TLS check was used only for early certificate/host-routing evidence. CLI hostname API tests subsequently used process-local dns.resolve4 rather than the stale macOS getaddrinfo cache, with normal TLS and Origin checks.

The QA scripts accept this exact hostname only after the Vercel API confirms its alias belongs to the intended project and points to a READY Preview with target null. A production, foreign-project, mismatched or unavailable deployment is rejected before QA calls. Content remains unreviewed and unavailable for new official attempts. Human curriculum/language/domain review, calibration/equivalence, reviewer acceptance, real personal/team pilots, physical-device/offline/audio acceptance, retention and operational decisions remain launch gates.
