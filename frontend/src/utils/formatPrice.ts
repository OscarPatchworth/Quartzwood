// Prices come from TCGplayer (via Scryfall) in US dollars: see CardPrice.cs on the server
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

// 1.5 -> "$1.50"; the API sends decimals as numbers (or numeric strings), so both are accepted
export function formatPrice(price: number | string): string {
    return usd.format(Number(price))
}
