import type { Metadata } from "next";

export const PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://your-synthmr-domain.com";
export const DOCS_LAST_UPDATED = "2026-03-09";

export function publicMetadata(
  title: string,
  description: string,
  path: string,
  keywords: string[]
): Metadata {
  const canonical = `${PUBLIC_BASE_URL}${path}`;
  return {
    title,
    description,
    keywords,
    robots: { index: true, follow: true },
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

