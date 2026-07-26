import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import Header from "../components/Header";
import ClerkProvider from "../integrations/clerk/provider";
import ConvexProvider from "../integrations/convex/provider";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import appCss from "../styles.css?url";

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Titeet AutoMarket",
      },
      {
        name: "description",
        content:
          "Buy and sell verified used cars in Nepal with smarter discovery, comparison, and transaction tracking.",
      },
      {
        property: "og:title",
        content: "Titeet AutoMarket",
      },
      {
        property: "og:description",
        content:
          "Explore verified listings, compare vehicles side-by-side, and track transactions with confidence.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:image",
        content: "/Classic%20Red%20Car.svg",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
      {
        name: "twitter:title",
        content: "Titeet AutoMarket",
      },
      {
        name: "twitter:description",
        content:
          "Verified used-car marketplace for Nepal with better search, comparison, and transaction clarity.",
      },
      {
        name: "twitter:image",
        content: "/Classic%20Red%20Car.svg",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/Classic%20Red%20Car.svg",
      },
      {
        rel: "shortcut icon",
        type: "image/svg+xml",
        href: "/Classic%20Red%20Car.svg",
      },
      {
        rel: "apple-touch-icon",
        href: "/Classic%20Red%20Car.svg",
      },
      {
        rel: "manifest",
        href: "/manifest.json",
      },
      {
        rel: "canonical",
        href: "/",
      },
    ],
  }),

  shellComponent: RootDocument,
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The page you requested does not exist.
      </p>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <pre className="mt-4 overflow-auto rounded-md border bg-muted p-3 text-xs">
        {error.message}
      </pre>
    </div>
  ),
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NP" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script src="/theme-init.js" />
      </head>
      <body>
        <ClerkProvider>
          <ConvexProvider>
            <div className="app-shell">
              <Header />
              {children}
            </div>
            <TanStackDevtools
              config={{
                position: "bottom-right",
              }}
              plugins={[
                {
                  name: "Tanstack Router",
                  render: <TanStackRouterDevtoolsPanel />,
                },
                TanStackQueryDevtools,
              ]}
            />
          </ConvexProvider>
        </ClerkProvider>
        <Scripts />
      </body>
    </html>
  );
}
