import { useEffect, useRef, useState } from "react"
import { getErrorMessage } from "../api/getErrorMessage"

interface DebouncedSearchOptions {
    // Don't search until the text is at least this long
    minLength?: number
    // Wait this long after the last keystroke, so typing "sol ring" is 1 request, not 8
    delayMs?: number
    // Anything besides the text that should start a new search when it changes, e.g. the sort order
    key?: string
}

export interface DebouncedSearch<T> {
    // The newest finished search's result (kept while the next one runs, so the list doesn't flicker)
    result: T | undefined
    // The text that result belongs to
    resultQuery: string | undefined
    errorMessage: string | undefined
    // Typing has moved on from the shown result: a search is waiting or running
    isSearching: boolean
    isTooShort: boolean
}

// Search-as-you-type: runs `search` once the user pauses typing, and makes sure only the newest
// request's answer is shown. Used by the collection search page and the add-card bar.
//
// `search` can be a new function on every render (e.g. an inline arrow): the hook always calls
// the latest one without restarting the timer
export function useDebouncedSearch<T>(
    query: string,
    search: (query: string) => Promise<T>,
    { minLength = 2, delayMs = 300, key = "" }: DebouncedSearchOptions = {},
): DebouncedSearch<T> {
    const trimmed = query.trim()
    const isTooShort = trimmed.length < minLength

    // What a search is for: the text plus the extra key. "\u0000" can't be typed, so the two never blur together
    const requestKey = `${trimmed}\u0000${key}`

    // One state object, so result/error/query always change together
    const [settled, setSettled] = useState<{ requestKey: string, query: string, result?: T, errorMessage?: string }>()

    // Counts requests: an answer is only used if no newer request has started since
    const latestRequest = useRef(0)

    // Always points at the newest `search` function. Refs can change without re-rendering,
    // and reading one in the timer below gets the current value, not the one from an older render
    const searchRef = useRef(search)
    useEffect(() => {
        searchRef.current = search
    })

    useEffect(() => {
        if (isTooShort) return

        const timer = setTimeout(async () => {
            const requestId = ++latestRequest.current
            try {
                const result = await searchRef.current(trimmed)
                if (requestId === latestRequest.current) setSettled({ requestKey, query: trimmed, result })
            } catch (error) {
                if (requestId === latestRequest.current) {
                    setSettled({ requestKey, query: trimmed, errorMessage: getErrorMessage(error, "Search failed.") })
                }
            }
        }, delayMs)

        // Runs when the text (or key) changes again before the delay is up: cancels the pending search
        return () => clearTimeout(timer)
    }, [requestKey, trimmed, isTooShort, delayMs])

    if (isTooShort) {
        return { result: undefined, resultQuery: undefined, errorMessage: undefined, isSearching: false, isTooShort }
    }

    return {
        result: settled?.result,
        resultQuery: settled?.query,
        errorMessage: settled?.requestKey === requestKey ? settled.errorMessage : undefined,
        // Worked out from what we already know instead of stored separately: if the newest answer isn't for
        // the current text, we're still waiting. One less piece of state that could get out of sync
        isSearching: settled?.requestKey !== requestKey,
        isTooShort,
    }
}
