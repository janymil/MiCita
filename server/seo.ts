/**
 * Server-side SEO for public micrositios.
 *
 * The SPA ships one generic `index.html`, so every business page used to look
 * identical to Google and to WhatsApp's link preview. This module injects a
 * per-business title/description/OG/canonical + LocalBusiness JSON-LD into the
 * HTML shell before it is sent, and exposes sitemap/robots.
 */

import type { Express } from "express";
import fs from "fs";
import path from "path";
import { storage } from "./storage.js";
import { config } from "./config.js";
import { limaDateISO } from "./lib/dates.js";

export interface MicrositeMeta {
  title: string;
  description: string;
  canonical: string;
  image?: string | null;
  type: string;
  jsonLd?: Record<string, unknown> | null;
}

interface CacheEntry {
  expires: number;
  meta: MicrositeMeta | null;
}

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

const RESERVED_PATHS = new Set([
  "dashboard", "admin", "api", "auth", "login", "registro", "otp", "verify-email",
  "forgot-password", "reset-password", "buscar", "business", "documentation",
  "micrositio", "cita", "uploads", "assets", "static", "embed", "sitemap.xml",
  "robots.txt", "favicon.ico",
]);

const escapeHtml = (value: string) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** `"/mi-negocio?x=1"` → `"mi-negocio"` (null when not a micrositio path). */
export function slugFromPath(url: string): string | null {
  const clean = (url || "/").split("?")[0].split("#")[0];
  const segments = clean.split("/").filter(Boolean);
  if (segments.length !== 1) return null;
  const slug = segments[0].toLowerCase();
  if (RESERVED_PATHS.has(slug) || slug.includes(".")) return null;
  return slug;
}

export async function getMicrositeMeta(slug: string): Promise<MicrositeMeta | null> {
  const cached = cache.get(slug);
  if (cached && cached.expires > Date.now()) return cached.meta;

  let meta: MicrositeMeta | null = null;
  try {
    const settings = await storage.getBusinessSettingsByCustomUrl(slug);
    if (settings) {
      const business = await storage.getBusiness(settings.businessId);
      if (business && business.isActive !== false) {
        const name = settings.publicTitle || business.name;
        const title = settings.metaTitle || `${name}${settings.district ? ` en ${settings.district}` : ""} · Reserva tu cita | MiCita`;
        const description =
          settings.metaDescription ||
          settings.publicDescription ||
          business.description ||
          `Reserva online en ${name}. Servicios, horarios, opiniones y contacto en un solo lugar.`;
        const image = settings.coverImage || settings.profileImage || business.coverImage || business.logo || null;
        const canonical = `${config.appUrl.replace(/\/$/, "")}/${slug}`;

        const hoursSpec = Object.entries((settings.workingHours ?? {}) as Record<string, { enabled?: boolean; start?: string; end?: string }>)
          .filter(([, value]) => value && value.enabled !== false)
          .map(([day, value]) => ({
            "@type": "OpeningHoursSpecification",
            dayOfWeek: `https://schema.org/${day.charAt(0).toUpperCase()}${day.slice(1)}`,
            opens: value.start || "09:00",
            closes: value.end || "17:00",
          }));

        meta = {
          title,
          description: description.slice(0, 300),
          canonical,
          image,
          type: "website",
          jsonLd: {
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name,
            description: description.slice(0, 300),
            url: canonical,
            telephone: settings.publicPhone || business.phone || undefined,
            email: settings.publicEmail || business.email || undefined,
            image: image || undefined,
            address: {
              "@type": "PostalAddress",
              streetAddress: settings.streetAddress || business.address || undefined,
              addressLocality: settings.district || business.district || business.city || "Lima",
              addressRegion: settings.region || "Lima",
              addressCountry: "PE",
            },
            ...(hoursSpec.length ? { openingHoursSpecification: hoursSpec } : {}),
            ...(Number(business.rating) > 0
              ? {
                  aggregateRating: {
                    "@type": "AggregateRating",
                    ratingValue: Number(business.rating),
                    reviewCount: business.reviewCount || 1,
                  },
                }
              : {}),
          },
        };
      }
    }
  } catch (error) {
    console.error("[seo] failed to build microsite meta:", error);
    meta = null;
  }

  cache.set(slug, { expires: Date.now() + CACHE_TTL_MS, meta });
  return meta;
}

/** Meta for a raw request URL (used by the SPA fallback handlers). */
export async function getMetaForUrl(url: string): Promise<MicrositeMeta | null> {
  const slug = slugFromPath(url);
  if (!slug) return null;
  return getMicrositeMeta(slug);
}
/** Replace the generic shell head with business-specific tags. */
export function injectMeta(template: string, meta: MicrositeMeta): string {
  const tags = [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(meta.canonical)}" />`,
    `<meta property="og:type" content="${escapeHtml(meta.type)}" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(meta.canonical)}" />`,
    `<meta property="og:site_name" content="MiCita" />`,
    meta.image ? `<meta property="og:image" content="${escapeHtml(meta.image)}" />` : "",
    `<meta name="twitter:card" content="${meta.image ? "summary_large_image" : "summary"}" />`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
    meta.jsonLd
      ? `<script type="application/ld+json">${JSON.stringify(meta.jsonLd).replace(/</g, "\\u003c")}</script>`
      : "",
  ]
    .filter(Boolean)
    .join("\n    ");

  // Drop the generic title/description and put the business-specific ones in.
  return template
    .replace(/<title>[\s\S]*?<\/title>\s*/, "")
    .replace(/<meta name="description"[^>]*>\s*/, "")
    .replace(/<meta name="theme-color"[^>]*>\s*/, "")
    .replace("</head>", `    ${tags}\n  </head>`);
}

export function registerSeoRoutes(app: Express): void {
  app.get("/robots.txt", (_req, res) => {
    const base = config.appUrl.replace(/\/$/, "");
    res.type("text/plain").send(
      [
        "User-agent: *",
        "Allow: /",
        "Disallow: /dashboard",
        "Disallow: /admin",
        "Disallow: /api",
        "",
        `Sitemap: ${base}/sitemap.xml`,
        "",
      ].join("\n"),
    );
  });

  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const base = config.appUrl.replace(/\/$/, "");
      const published = await storage.getPublishedMicrosites();
      const urls = [
        `<url><loc>${base}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
        `<url><loc>${base}/buscar</loc><changefreq>daily</changefreq><priority>0.9</priority></url>`,
        ...published.map((item) => {
          const lastmod = item.updatedAt ? new Date(item.updatedAt).toISOString().slice(0, 10) : limaDateISO();
          return `<url><loc>${base}/${encodeURIComponent(item.customUrl)}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`;
        }),
      ];

      res.type("application/xml").send(
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`,
      );
    } catch (error) {
      console.error("[seo] sitemap failed:", error);
      res.status(500).type("text/plain").send("sitemap unavailable");
    }
  });
}

/** Locate the HTML shell in dev and in the production build. */
export function readHtmlShell(): string | null {
  const candidates = [
    path.resolve(import.meta.dirname, "public", "index.html"),
    path.resolve(import.meta.dirname, "..", "client", "index.html"),
    path.resolve(process.cwd(), "dist", "public", "index.html"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return fs.readFileSync(candidate, "utf-8");
  }
  return null;
}


