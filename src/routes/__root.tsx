import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { Toaster as ShadToaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/lib/AuthContext";
import ScrollToTop from "@/components/ScrollToTop";
import PostAuthRedirect from "@/components/PostAuthRedirect";
import { publicRuntimeConfigScript, readPublicRuntimeConfig } from "@/lib/public-config";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="pglass max-w-md rounded-2xl px-8 py-10 text-center">
        <h1 className="bg-gradient-to-br from-violet-400 to-cyan-300 bg-clip-text text-7xl font-bold text-transparent">
          404
        </h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Signal lost</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This module is not on the Blackstar command layer.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-violet-400 px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Return to Blackstar
          </Link>
        </div>
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="pglass max-w-md rounded-2xl px-8 py-10 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This module didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. Try reinitialising or head back to base.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-violet-400 px-5 py-2 text-sm font-medium text-white"
          >
            Reinitialise
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Blackstar — Intelligence infrastructure" },
      {
        name: "description",
        content:
          "Blackstar is a bounded general-intelligence platform with an Astra-class engine. Models, agents, tools and infrastructure under command.",
      },
      { name: "author", content: "Blackstar" },
      { property: "og:title", content: "Blackstar — Intelligence infrastructure" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/astra-mark.svg", type: "image/svg+xml" },
      { rel: "alternate icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const bootstrap = publicRuntimeConfigScript(readPublicRuntimeConfig());
  return (
    <html lang="en" className="dark">
      <head>
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: bootstrap }} />
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

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ScrollToTop />
        <PostAuthRedirect />
        <Outlet />
        <Toaster />
        <ShadToaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
