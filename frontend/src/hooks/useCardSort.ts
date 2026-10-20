import { useSearchParams } from "react-router-dom"

// The server's sort options (CardSorting.cs). `descendingFirst`: the direction that's most useful
// when you first pick it, e.g. "Date added" starts newest first
export const CardSortOptions = [
    { value: "name", label: "Name", descendingFirst: false },
    { value: "added", label: "Date added", descendingFirst: true },
    { value: "printed", label: "Printed order", descendingFirst: false },
    { value: "manaValue", label: "Mana value", descendingFirst: false },
    { value: "color", label: "Colour", descendingFirst: false },
    { value: "price", label: "Price", descendingFirst: true },
] as const

// "name" | "added" | ...: worked out from the list above, so the two can't disagree
export type CardSortValue = typeof CardSortOptions[number]["value"]

export interface CardSort {
    sort: CardSortValue
    desc: boolean
}

function isSortValue(value: string | null): value is CardSortValue {
    return CardSortOptions.some(option => option.value === value)
}

// The current sort, kept in the URL (?sort=manaValue&desc=true) so Back and refresh keep it.
// Writes MERGE into the URL instead of replacing it, so other parameters (like the search's ?q=) survive
export function useCardSort() {
    const [searchParams, setSearchParams] = useSearchParams()
    const sortParam = searchParams.get("sort")
    const sort: CardSort = {
        sort: isSortValue(sortParam) ? sortParam : "name",
        desc: searchParams.get("desc") === "true",
    }

    function setSort(next: CardSort) {
        setSearchParams(current => {
            const params = new URLSearchParams(current)
            // The default (name, A-Z) leaves the URL clean
            if (next.sort === "name") params.delete("sort")
            else params.set("sort", next.sort)
            if (next.desc) params.set("desc", "true")
            else params.delete("desc")
            return params
        }, { replace: true })
    }

    return { ...sort, setSort }
}
