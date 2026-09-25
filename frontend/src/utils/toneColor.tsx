function hexToHsl(hex: string) {
  let h = hex.replace("#", "")
  if (h.length === 3) {
    h = h.split("").map(ch => ch + ch).join("")
  }

  const num = Number.parseInt(h, 16)
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255

  const rNorm = r / 255
  const gNorm = g / 255
  const bNorm = b / 255

  const max = Math.max(rNorm, gNorm, bNorm)
  const min = Math.min(rNorm, gNorm, bNorm)
  const d = max - min

  let hue = 0
  if (d !== 0) {
    if (max === rNorm) hue = ((gNorm - bNorm) / d) % 6
    else if (max === gNorm) hue = (bNorm - rNorm) / d + 2
    else hue = (rNorm - gNorm) / d + 4
  }

  hue = Math.round(hue * 60)
  if (hue < 0) hue += 360

  const lightness = (max + min) / 2
  const saturation =
    d === 0 ? 0 : d / (1 - Math.abs(2 * lightness - 1))

  return {
    h: hue,
    s: saturation * 100,
    l: lightness * 100,
  }
}

function hslToHex(h: number, s: number, l: number) {
  s /= 100
  l /= 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = l - c / 2

  let r = 0
  let g = 0
  let b = 0

  if (h >= 0 && h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0")

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function toneColor(hex: string, amount: number) {
  const { h, s, l } = hexToHsl(hex)

  // amount < 0   => pastel / lighter
  // amount = 0   => base color unchanged
  // amount > 0   => darker / stronger
  const clamped = Math.max(-2, Math.min(5, amount))

  const nextS = Math.min(100, s * (1 + clamped * 0.35))

  let nextL: number
  if (clamped < 0) {
    nextL = l + (70 - l) * (Math.abs(clamped) * 0.85)
  } else if (clamped > 0) {
    nextL = l * (1 - clamped * 0.65)
  } else {
    nextL = l
  }

  return hslToHex(h, nextS, Math.max(18, Math.min(92, nextL)))
}