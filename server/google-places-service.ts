/**
 * Google Places (New) lookup used to enrich a business profile with rating,
 * review count and photos. Requires GOOGLE_MAPS_API_KEY; returns null when the
 * key is absent or no match is found so callers can respond gracefully.
 */

export interface GooglePlaceEnrichment {
  placeId: string;
  name: string;
  address: string | null;
  rating: number | null;
  reviewCount: number | null;
  photos: string[];
  phone: string | null;
  website: string | null;
}

const SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK =
  "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.photos,places.nationalPhoneNumber,places.websiteUri";

function apiKey(): string {
  return process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY || "";
}

export function isGooglePlacesConfigured(): boolean {
  return Boolean(apiKey());
}

export async function findAndEnrichBusiness(
  name: string,
  address?: string | null,
  phone?: string | null,
): Promise<GooglePlaceEnrichment | null> {
  const key = apiKey();
  if (!key) return null;

  const textQuery = [name, address, phone].filter(Boolean).join(" ");

  const res = await fetch(SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({ textQuery, maxResultCount: 1, languageCode: "es" }),
  });

  if (!res.ok) {
    console.error("[google-places] searchText failed:", res.status, await res.text().catch(() => ""));
    return null;
  }

  const data = (await res.json()) as {
    places?: Array<{
      id: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      rating?: number;
      userRatingCount?: number;
      photos?: Array<{ name: string }>;
      nationalPhoneNumber?: string;
      websiteUri?: string;
    }>;
  };

  const place = data.places?.[0];
  if (!place) return null;

  const photos = (place.photos ?? [])
    .slice(0, 10)
    .map((p) => `https://places.googleapis.com/v1/${p.name}/media?maxWidthPx=1200&key=${key}`);

  return {
    placeId: place.id,
    name: place.displayName?.text || name,
    address: place.formattedAddress ?? null,
    rating: place.rating ?? null,
    reviewCount: place.userRatingCount ?? null,
    photos,
    phone: place.nationalPhoneNumber ?? null,
    website: place.websiteUri ?? null,
  };
}

export const googlePlacesService = { findAndEnrichBusiness, isConfigured: isGooglePlacesConfigured };
