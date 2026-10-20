import { useSearchParams } from "react-router-dom"

// The card list filters (CardListOptions.cs): a mana value range, either end optional
export interface CardFilter {
    mvMin?: number
    mvMax?: number
}

function readNumber(value: string | null): number | undefined {
    if (value === null || value.trim() === "") return undefined
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

export function hasFilter(filter: CardFilter) {
    return filter.mvMin !== undefined || filter.mvMax !== undefined
}

// Short label for the filter button: "MV 2-4", "MV 3+", "MV ≤ 2"
export function describeFilter({ mvMin, mvMax }: CardFilter) {
    if (mvMin !== undefined && mvMax !== undefined) return mvMin === mvMax ? `MV ${mvMin}` : `MV ${mvMin}–${mvMax}`
    if (mvMin !== undefined) return `MV ${mvMin}+`
    if (mvMax !== undefined) return `MV ≤ ${mvMax}`
    return undefined
}

// The current filter, kept in the URL (?mvMin=2&mvMax=4) like the sort, merged into the other parameters
export function useCardFilter() {
    const [searchParams, setSearchParams] = useSearchParams()
    const filter: CardFilter = {
        mvMin: readNumber(searchParams.get("mvMin")),
        mvMax: readNumber(searchParams.get("mvMax")),
    }

    function setFilter(next: CardFilter) {
        setSearchParams(current => {
            const params = new URLSearchParams(current)
            for (const key of ["mvMin", "mvMax"] as const) {
                const value = next[key]
                if (value === undefined) params.delete(key)
                else params.set(key, String(value))
            }
            return params
        }, { replace: true })
    }

    return { filter, setFilter }
}
