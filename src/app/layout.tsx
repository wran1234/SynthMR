import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { NavAuth } from "@/components/auth/nav-auth";
import { getSessionUser } from "@/lib/session";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "SynthMR — AI Market Research Simulator",
  description: "Simulate market research with a synthetic population and AI-driven survey responses. Validate your business idea with synthetic personas.",
  icons: { icon: "/favicon.svg" },
  openGraph: { title: "SynthMR — AI Market Research Simulator", description: "Simulate market research with a synthetic population and AI-driven survey responses." },
  twitter: { card: "summary_large_image", title: "SynthMR — AI Market Research Simulator" },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-synthmr-domain.com";
  const aiToolJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "SynthMR Agent API",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    description: "API-first synthetic market research tool for AI agents and workflows.",
    url: siteUrl,
    offers: {
      "@type": "Offer",
      category: "SaaS",
    },
    potentialAction: {
      "@type": "Action",
      name: "Use SynthMR API",
      target: `${siteUrl}/api/openapi.json`,
    },
  };
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-[rgb(var(--background))] font-sans text-[rgb(var(--foreground))] antialiased">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aiToolJsonLd) }} />
        <ThemeProvider>
          <Toaster position="top-right" richColors closeButton />
          <div className="flex min-h-screen flex-col">
            <header className="no-print sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90 dark:border-slate-800 dark:bg-slate-900/95 dark:supports-[backdrop-filter]:bg-slate-900/90">
              <div className="container-app flex h-14 items-center justify-between gap-4">
                <a
                  href="/dashboard"
                  className="flex shrink-0 items-center gap-2 font-semibold tracking-tight text-slate-900 dark:text-slate-50"
                >
                  <span className="text-lg">SynthMR</span>
                  <span className="hidden text-sm font-normal text-slate-500 dark:text-slate-400 sm:inline">
                    Synthetic Market Research
                  </span>
                </a>
                <nav className="flex flex-1 items-center justify-end gap-1 sm:gap-2">
                  <a
                    href="/dashboard"
                    className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  >
                    Dashboard
                  </a>
                  <a
                    href="/studies"
                    className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  >
                    Studies
                  </a>
                  <a
                    href="/account"
                    className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  >
                    Account
                  </a>
                  <div className="ml-2 flex items-center gap-1 border-l border-slate-200 pl-2 dark:border-slate-700">
                    <ThemeToggle />
                    <NavAuth user={user} />
                  </div>
                </nav>
              </div>
            </header>
            <main className="flex-1">
              <div className="container-app py-8">{children}</div>
            </main>
            <footer className="no-print border-t border-slate-200 py-4 dark:border-slate-800">
              <div className="container-app text-center text-sm text-slate-500 dark:text-slate-400">
                Synthetic research—validate with real users.
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
