import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react"

interface CopyCountWheelProps {
    // How many are picked (1..max)
    value: number
    max: number
    onChange: (value: number) => void
    // For screen readers, e.g. "Copies of Sol Ring"
    label: string
}

const SIZE = 144
const STROKE = 14
const RADIUS = (SIZE - STROKE) / 2
const CENTER = SIZE / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// A dial for picking how many of a stack's copies to act on: the filled arc (clockwise from the top) is how many.
// Drag around the ring, or type the number in the middle; arrow keys work on the ring too.
// Never below 1: there's always at least one card to act on
export function CopyCountWheel({ value, max, onChange, label }: CopyCountWheelProps) {
    const svgRef = useRef<SVGSVGElement>(null)
    // What's in the number box while typing (it may be empty or out of range until you leave it)
    const [draft, setDraft] = useState<string>()

    const clamp = (n: number) => Math.min(max, Math.max(1, Math.round(n)))
    const fraction = value / max

    // The pointer's position as a fraction of a full turn, clockwise from the top (0..1)
    function fractionAt(event: PointerEvent<SVGSVGElement>) {
        const box = svgRef.current!.getBoundingClientRect()
        const x = event.clientX - (box.left + box.width / 2)
        const y = event.clientY - (box.top + box.height / 2)
        const angle = Math.atan2(x, -y)   // 0 at the top, clockwise positive
        return (angle < 0 ? angle + 2 * Math.PI : angle) / (2 * Math.PI)
    }

    function pickAt(event: PointerEvent<SVGSVGElement>) {
        let next = fractionAt(event)
        // Dragging past the top would jump from all to none (or back): stop at the end instead
        if (Math.abs(next - fraction) > 0.5) next = fraction > 0.5 ? 1 : 0
        const count = clamp(next * max)
        if (count !== value) onChange(count)
    }

    function keyDown(event: KeyboardEvent<SVGSVGElement>) {
        const step: Record<string, number> = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }
        if (event.key in step) onChange(clamp(value + step[event.key]))
        else if (event.key === "Home") onChange(1)
        else if (event.key === "End") onChange(max)
        else return
        event.preventDefault()
    }

    function commitDraft() {
        if (draft !== undefined) {
            const typed = Number(draft)
            if (draft.trim() !== "" && Number.isFinite(typed)) onChange(clamp(typed))
            setDraft(undefined)
        }
    }

    // End of the filled arc, for the handle
    const handleAngle = fraction * 2 * Math.PI
    const handleX = CENTER + RADIUS * Math.sin(handleAngle)
    const handleY = CENTER - RADIUS * Math.cos(handleAngle)

    return (
        <div className="relative mx-auto size-36 select-none">
            <svg
                ref={svgRef}
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                role="slider"
                tabIndex={0}
                aria-label={label}
                aria-valuemin={1}
                aria-valuemax={max}
                aria-valuenow={value}
                aria-valuetext={`${value} of ${max}`}
                onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); pickAt(event) }}
                onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) pickAt(event) }}
                onKeyDown={keyDown}
                className="size-full cursor-pointer touch-none rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-copywheel-fill"
            >
                <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" strokeWidth={STROKE} className="stroke-copywheel" />
                {/* The filled arc: a dashed circle, rotated so it starts at the top */}
                <circle
                    cx={CENTER} cy={CENTER} r={RADIUS} fill="none" strokeWidth={STROKE}
                    strokeDasharray={`${fraction * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                    transform={`rotate(-90 ${CENTER} ${CENTER})`}
                    className="stroke-copywheel-fill transition-[stroke-dasharray] duration-75"
                />
                {/* One notch per copy, so you can see the steps (left out when there are too many to tell apart) */}
                {max <= 40 && Array.from({ length: max }, (_, i) => {
                    const a = (i / max) * 2 * Math.PI
                    return (
                        <line key={i}
                            x1={CENTER + (RADIUS - STROKE / 2) * Math.sin(a)} y1={CENTER - (RADIUS - STROKE / 2) * Math.cos(a)}
                            x2={CENTER + (RADIUS + STROKE / 2) * Math.sin(a)} y2={CENTER - (RADIUS + STROKE / 2) * Math.cos(a)}
                            strokeWidth={1.5} className="stroke-copywheel-line" />
                    )
                })}
                <circle cx={handleX} cy={handleY} r={STROKE / 2 + 2} strokeWidth={2} className="fill-copywheel-handle stroke-copywheel-fill" />
            </svg>

            {/* The middle: type the number, or read it */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="pointer-events-auto flex items-baseline gap-1 text-copywheel-fg">
                    <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={max}
                        aria-label={`${label}: how many`}
                        value={draft ?? value}
                        onChange={event => setDraft(event.target.value)}
                        onBlur={commitDraft}
                        onKeyDown={event => { if (event.key === "Enter") { commitDraft(); event.currentTarget.blur() } }}
                        onFocus={event => event.currentTarget.select()}
                        className="w-12 rounded-md border border-copywheel-line bg-copywheel px-1 text-center text-xl font-bold outline-none [appearance:textfield] focus:border-copywheel-fill [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <span className="text-sm font-semibold">/ {max}</span>
                </div>
            </div>
        </div>
    )
}
