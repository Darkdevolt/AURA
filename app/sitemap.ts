import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/a-propos", "/contact", "/ma-reservation", "/mentions-legales"].map((p) => ({ url: `${SITE_URL()}${p}` }));
}
