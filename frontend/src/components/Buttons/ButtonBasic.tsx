import { toneColor } from "../../utils/toneColor"

interface ButtonProps {
  onClick?: () => void
  label?: string
  color?: string
}

export function ButtonBasic({ onClick, label = "Button", color = "#f59e0b" }: ButtonProps) {
    return (
        <button
            type="button"
            className="rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-2"
            style={{
                backgroundColor: toneColor(color, -1.4),
                borderColor: toneColor(color, 0.5),
                color: toneColor(color, 5),
            }}
            onClick={onClick}
        >
            {label}
        </button>
    )
}
