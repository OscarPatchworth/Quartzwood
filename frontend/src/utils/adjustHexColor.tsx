
export function adjustHexColor(hex: string, factor: number) {
  const clean = hex.replace("#", "")
  const num = Number.parseInt(clean, 16)

  const r = Math.max(0, Math.min(255, ((num >> 16) & 255) * (1/factor)))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 255) * (1/factor)))
  const b = Math.max(0, Math.min(255, (num & 255) * (1/factor)))

  return "#" + [r, g, b]
    .map(v => Math.round(v).toString(16).padStart(2, "0"))
    .join("")
}