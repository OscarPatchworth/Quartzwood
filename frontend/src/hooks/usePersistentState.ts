import { useEffect, useState } from "react"

// useState that's also saved in this browser's localStorage under `key`, so it survives a refresh or a closed
// tab. Only for per-device conveniences (a draft): it isn't shared, and other devices don't see it.
// localStorage can be missing or full (private windows, blocked site data): then it simply isn't remembered
export function usePersistentState<T>(key: string, initial: T) {
    const [value, setValue] = useState<T>(() => {
        try {
            const saved = localStorage.getItem(key)
            return saved !== null ? JSON.parse(saved) as T : initial
        } catch {
            return initial
        }
    })

    // Save after every change
    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(value))
        } catch {
            // Not remembered; the page still works
        }
    }, [key, value])

    return [value, setValue] as const
}
