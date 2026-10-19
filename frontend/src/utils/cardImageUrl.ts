// A card's image, via our server: it redirects to Scryfall's image CDN using the local Scryfall data,
// so images don't cost Scryfall API calls (and later can be served from an on-disk cache)
export function cardImageUrl(scryfallId: string, size: "small" | "normal" = "normal"): string {
    return `/api/scryfall/cards/${encodeURIComponent(scryfallId)}/image?size=${size}`
}
