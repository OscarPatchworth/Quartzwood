// A card's image, via our server: it redirects to Scryfall's image CDN using the local Scryfall data,
// so images don't cost Scryfall API calls (and later can be served from an on-disk cache).
// language: the card's Scryfall language code ("ja"); the server falls back to English when there's no such printing
export function cardImageUrl(scryfallId: string, size: "small" | "normal" = "normal", language?: string | null): string {
    const lang = language && language !== "en" ? `&lang=${encodeURIComponent(language)}` : ""
    return `/api/scryfall/cards/${encodeURIComponent(scryfallId)}/image?size=${size}${lang}`
}
