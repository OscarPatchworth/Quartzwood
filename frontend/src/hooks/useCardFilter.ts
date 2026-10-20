import { useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { formatPrice } from "../utils/formatPrice"

// The card list filters (CardListOptions.cs): ranges (each end optional) and tags (the card must have
// all of them). The keys are the URL/API parameter names
export interface CardFilter {
    mvMin?: number
    mvMax?: number
    priceMin?: number
    priceMax?: number
    tags?: string[]
}

type FilterKey = Exclude<keyof CardFilter, "tags">

// Every range the filter menu shows, in order. Adding a filter = adding one entry here (and on the server)
export const FilterRanges = [
    { label: "Mana value", min: "mvMin", max: "mvMax", prefix: "", step: "any" },
    { label: "Price (USD)", min: "priceMin", max: "priceMax", prefix: "$", step: "0.01" },
] as const satisfies readonly { label: string, min: FilterKey, max: FilterKey, prefix: string, step: string }[]

const FilterKeys: FilterKey[] = FilterRanges.flatMap(range => [range.min, range.max])

function readNumber(value: string | null): number | undefined {
    if (value === null || value.trim() === "") return undefined
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

export function hasFilter(filter: CardFilter) {
    return FilterKeys.some(key => filter[key] !== undefined) || (filter.tags?.length ?? 0) > 0
}

// Short label for the filter button: "MV 2–4", "MV 3+", "$5+ · MV ≤ 2"
export function describeFilter(filter: CardFilter) {
    const parts = [
        describeRange("MV ", filter.mvMin, filter.mvMax, value => String(value)),
        describeRange("", filter.priceMin, filter.priceMax, formatPrice),
        ...(filter.tags ?? []).map(tag => `#${tag}`),
    ].filter(part => part !== undefined)
    return parts.length > 0 ? parts.join(" · ") : undefined
}

function describeRange(label: string, min: number | undefined, max: number | undefined, format: (value: number) => string) {
    if (min !== undefined && max !== undefined) return min === max ? `${label}${format(min)}` : `${label}${format(min)}–${format(max)}`
    if (min !== undefined) return `${label}${format(min)}+`
    if (max !== undefined) return `${label}≤ ${format(max)}`
    return undefined
}

// The current filter, kept in the URL (?mvMin=2&priceMax=5) like the sort, merged into the other parameters
export function useCardFilter() {
    const [searchParams, setSearchParams] = useSearchParams()
    // useMemo: the SAME object until the URL changes, so pages can list `filter` as an effect dependency
    // (a new object every render would look "changed" every render and reload in a loop)
    const filter: CardFilter = useMemo(() => {
        const tags = searchParams.getAll("tags").filter(tag => tag.trim() !== "")
        return {
            ...Object.fromEntries(FilterKeys.map(key => [key, readNumber(searchParams.get(key))])),
            tags: tags.length > 0 ? tags : undefined,
        }
    }, [searchParams])

    function setFilter(next: CardFilter) {
        setSearchParams(current => {
            const params = new URLSearchParams(current)
            for (const key of FilterKeys) {
                const value = next[key]
                if (value === undefined) params.delete(key)
                else params.set(key, String(value))
            }
            // One ?tags= per tag: ?tags=Trade&tags=Commander
            params.delete("tags")
            for (const tag of next.tags ?? []) params.append("tags", tag)
            return params
        }, { replace: true })
    }

    return { filter, setFilter }
}
