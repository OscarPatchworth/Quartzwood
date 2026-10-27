import { useSyncExternalStore } from "react"

// true while the CSS media query matches, e.g. useMediaQuery("(width >= 64rem)"), updating as the window resizes.
// For when a component must render DIFFERENTLY at a size (move something to another place), not just look different:
// for looks alone, Tailwind's sm:/md:/lg: prefixes are simpler
export function useMediaQuery(query: string): boolean {
    return useSyncExternalStore(
        onChange => {
            const list = window.matchMedia(query)
            list.addEventListener("change", onChange)
            return () => list.removeEventListener("change", onChange)
        },
        () => window.matchMedia(query).matches,
    )
}
