import type { MetadataRoute } from "next";

const SITE_URL = "https://antidotocolombia.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/mision", "/mision/", "/admin", "/admin/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
