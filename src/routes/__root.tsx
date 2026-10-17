import { useEffect } from "react";
import {
  Outlet,
  Link,
  createRootRoute,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import {
  isPrivateAssessmentUrl,
  isPrivateAssessmentContext,
  anonymousPageUrl,
} from "../lib/assessment-privacy";
import { Analytics } from "@vercel/analytics/react";
import { toast } from "sonner";
import { isSpeakingPrivacyMode, LANGUAGE_THRESHOLD_GA_ID } from "../lib/speaking-privacy";
import { reloadNewestAppVersion } from "../lib/app-update";
import { initializePwaInstall } from "../lib/pwa-install";
import { APP_STATE_KEY, THEME_PREFERENCE_KEY } from "../lib/theme-preference";

const GA_ID = LANGUAGE_THRESHOLD_GA_ID;
const themeBootScript = `(()=>{try{const saved=localStorage.getItem(${JSON.stringify(THEME_PREFERENCE_KEY)});const dark=saved==="dark"?true:saved==="light"?false:JSON.parse(localStorage.getItem(${JSON.stringify(APP_STATE_KEY)})||"null")?.darkMode!==false;document.documentElement.classList.toggle("dark",dark);document.documentElement.style.colorScheme=dark?"dark":"light"}catch{document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark"}})();`;

import appCss from "../styles.css?url";
import interCss from "@fontsource-variable/inter/opsz.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

const softwareAppSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Language Threshold",
  description:
    "AI-powered language training for professionals. Spanish for nurses, construction, missions, sports, and more.",
  url: "https://app.languagethreshold.com",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web, iOS, Android",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  image: "https://app.languagethreshold.com/icons/og-image.png",
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Language Threshold",
  url: "https://app.languagethreshold.com",
};

export const Route = createRootRoute({
  head: () => ({
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(softwareAppSchema),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(websiteSchema),
      },
    ],
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Language Threshold" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "theme-color", content: "#0b0d12" },
      { title: "Language Threshold — AI Language Training" },
      {
        name: "description",
        content:
          "AI-powered language training for professionals. Spanish for nurses, construction, missions, sports, and more. Plus English for Work for Spanish-speaking professionals.",
      },
      { property: "og:title", content: "Language Threshold — AI Language Training" },
      {
        property: "og:description",
        content:
          "Role-specific AI language training. Spanish for nurses, foremen, coaches, missionaries, and more.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://app.languagethreshold.com" },
      { property: "og:site_name", content: "Language Threshold" },
      { property: "og:image", content: "https://app.languagethreshold.com/icons/og-image.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content: "Language Threshold — AI Language Training for Professionals",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Language Threshold — AI Language Training" },
      {
        name: "twitter:description",
        content: "Role-specific AI language training for professionals in the field.",
      },
      { name: "twitter:image", content: "https://app.languagethreshold.com/icons/og-image.png" },
    ],
    links: [
      { rel: "stylesheet", href: interCss },
      { rel: "stylesheet", href: appCss },
      { rel: "canonical", href: "https://app.languagethreshold.com" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=JetBrains+Mono:wght@300;400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  const href = useRouterState({ select: (state) => state.location.href });
  const privatePage = isPrivateAssessmentUrl(href);
  useEffect(() => {
    window[`ga-disable-${GA_ID}`] = isSpeakingPrivacyMode() || isPrivateAssessmentContext();
  }, [href]);
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <HeadContent />
        {privatePage && <meta name="referrer" content="no-referrer" />}
      </head>
      <body>
        {children}
        <Scripts />
        {!privatePage && (
          <Analytics
            beforeSend={(event) =>
              isSpeakingPrivacyMode() ||
              isPrivateAssessmentContext() ||
              isPrivateAssessmentUrl(event.url)
                ? null
                : { ...event, url: anonymousPageUrl(event.url) }
            }
          />
        )}
        {GA_ID && !privatePage && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
            {/* GA_ID is a build-time env constant — not user input, no XSS risk */}
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());(()=>{let ref='';try{const r=new URL(document.referrer);ref=r.origin+r.pathname}catch{}gtag('config','${GA_ID}',{anonymize_ip:true,page_location:location.origin+location.pathname,page_referrer:ref})})();`,
              }}
            />
          </>
        )}
      </body>
    </html>
  );
}

function RootComponent() {
  useEffect(() => {
    initializePwaInstall();
    if (!("serviceWorker" in navigator)) return;

    // Snapshot before registration — falsy means first-ever install, no reload needed.
    const hadController = !!navigator.serviceWorker.controller;
    let toastShown = false;

    const showUpdateToast = () => {
      if (toastShown) return;
      toastShown = true;
      toast("New version available", {
        id: "sw-update",
        description: "Tap Reload to get the latest update.",
        action: { label: "Update", onClick: () => void reloadNewestAppVersion() },
        duration: Infinity,
      });
    };

    // Primary: fires when new SW claims this client via skipWaiting — most reliable cross-browser
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hadController) showUpdateToast();
    });

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // Fallback for browsers where controllerchange is unreliable
        reg.addEventListener("updatefound", () => {
          const newSW = reg.installing;
          if (!newSW) return;
          newSW.addEventListener("statechange", () => {
            if (
              newSW.state === "activated" &&
              navigator.serviceWorker.controller &&
              hadController
            ) {
              showUpdateToast();
            }
          });
        });
      })
      .catch(() => {});
  }, []);

  return <Outlet />;
}
