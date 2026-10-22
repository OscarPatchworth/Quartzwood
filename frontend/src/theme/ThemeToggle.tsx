import { useTheme, type ThemePreference } from "./theme"

const order: ThemePreference[] = ["system", "light", "dark"]
const labels: Record<ThemePreference, { icon: string, text: string }> = {
    system: { icon: "◐", text: "Auto" },
    light: { icon: "☀", text: "Light" },
    dark: { icon: "☾", text: "Dark" },
}

// The header's theme button: Auto (follow the system) → Light → Dark → Auto...
export function ThemeToggle() {
    const { preference, setPreference } = useTheme()
    const next = order[(order.indexOf(preference) + 1) % order.length]

    return (
        <button
            type="button"
            onClick={() => setPreference(next)}
            title={`Theme: ${labels[preference].text}. Click for ${labels[next].text}`}
            aria-label={`Theme: ${labels[preference].text}. Switch to ${labels[next].text}`}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:text-header-hover"
        >
            <span aria-hidden="true">{labels[preference].icon}</span>
            <span className="hidden sm:inline">{labels[preference].text}</span>
        </button>
    )
}
