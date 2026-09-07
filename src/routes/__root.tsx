import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useLayoutEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { BrandProvider, brandFromStudio, useBrand, type Brand } from "@/lib/brand";
import { getPublicStudio } from "@/lib/booking.functions";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  const { name } = useBrand();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <p className="eyebrow">{name}</p>
        <h1 className="mt-3 font-display text-6xl">404</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          La pagina che cerchi non esiste o è stata spostata.
        </p>
        <Link
          to="/"
          className="silk mt-8 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-xs tracking-[0.2em] uppercase text-primary-foreground hover:opacity-90"
        >
          Torna alla home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <h1 className="font-display text-3xl">Qualcosa non ha funzionato</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Riprova tra un istante o torna alla home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="silk rounded-full bg-primary px-6 py-3 text-xs tracking-[0.2em] uppercase text-primary-foreground hover:opacity-90"
          >
            Riprova
          </button>
          <a
            href="/"
            className="silk rounded-full border border-border px-6 py-3 text-xs tracking-[0.2em] uppercase hover:bg-accent"
          >
            Home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: async () => {
    try {
      const { studio } = await getPublicStudio();
      return { brand: brandFromStudio(studio) };
    } catch {
      const { DEFAULT_BRAND } = await import("@/lib/brand");
      return { brand: DEFAULT_BRAND };
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Prenota online" },
      {
        name: "description",
        content: "Prenota online i tuoi trattamenti di bellezza, senza account.",
      },
      { name: "theme-color", content: "#F7F1E7" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Prenota" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;1,9..144,300;1,9..144,400&family=Jost:wght@300;400;500&display=swap",
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { brand } = Route.useLoaderData() as { brand: Brand };
  const router = useRouter();

  // Tema per-sito prima della prima pittura (niente flash del tema sbagliato).
  useLayoutEffect(() => {
    const theme = brand.theme === "estetica" || brand.theme === "veluna" ? brand.theme : "nails";
    if (theme === "nails") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", theme);
    const colors = { nails: "#F7F1E7", estetica: "#141C17", veluna: "#F5F0E6" } as const;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", colors[theme]);
  }, [brand.theme]);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrandProvider value={brand}>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
      </BrandProvider>
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
