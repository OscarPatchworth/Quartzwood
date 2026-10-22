import { useEffect, useState } from "react"

// Light or dark, or "system": whatever the operating system / browser is set to (and following it if
// it changes, e.g. automatic dark mode at night). Saved per browser.
// index.html has a copy of readPreference + resolve that runs before the page is drawn, so it never flashes
// the wrong theme: keep the two in step
export type ThemePreference = "system" | "light" | "dark"

const STORAGE_KEY = "quartzwood.theme"
const darkQuery = "(prefers-color-scheme: dark)"

export function readPreference(): ThemePreference {
    try {
        const saved = localStorage.getItem(STORAGE_KEY)
        return saved === "light" || saved === "dark" ? saved : "system"
    } catch {
        return "system"
    }
}

function resolve(preference: ThemePreference): "light" | "dark" {
    if (preference !== "system") return preference
    return window.matchMedia(darkQuery).matches ? "dark" : "light"
}

// <html data-theme="dark">: index.css switches every colour token on it
function apply(preference: ThemePreference) {
    document.documentElement.dataset.theme = resolve(preference)
}

export function useTheme() {
    const [preference, setPreference] = useState<ThemePreference>(readPreference)

    useEffect(() => {
        apply(preference)
        try {
            if (preference === "system") localStorage.removeItem(STORAGE_KEY)
            else localStorage.setItem(STORAGE_KEY, preference)
        } catch {
            // Not remembered; the theme still applies for this visit
        }
        if (preference !== "system") return

        // Follow the system setting while the page is open
        const query = window.matchMedia(darkQuery)
        const onChange = () => apply("system")
        query.addEventListener("change", onChange)
        return () => query.removeEventListener("change", onChange)
    }, [preference])

    return { preference, setPreference }
}
