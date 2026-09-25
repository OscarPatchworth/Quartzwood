import { toneColor } from "../../utils/toneColor"
import { useState } from "react"

interface ButtonProps {
  onClick?: () => void
  label?: string
  color?: string
  min?: number
  max?: number
  incriment?: number
  start?: number
}

export function ButtonRange({ onClick, label = "Button", color = "#f59e0b", min = 0, max = 10, incriment = 1, start = 1 }: ButtonProps) {

    const [value, setValue] = useState<number>(start)

    function adjustValue(adj: number){
        const newValue = value + adj
        if(newValue <= max && newValue >= min)
            {setValue(newValue)}
    }

    return (
        <div className="grid grid-cols-3 rounded-xl border overflow-hidden">
            <button
                type="button"
                className="col-span-2 p-2 text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-2"
                style={{
                    backgroundColor: toneColor(color, -1.4),
                    borderColor: toneColor(color, 0.5),
                    color: toneColor(color, 5),
                }}
                onClick={onClick}
            >
                {label} {value}
            </button>

            <div className="grid grid-cols-1 ">
                <button type="button"
                    className=" border text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-2"
                    style={{
                        backgroundColor: toneColor(color, -1.4),
                        borderColor: toneColor(color, 0.5),
                        color: toneColor(color, 5),
                    }}
                    onClick={()=>(adjustValue(incriment))}>
                    ↑
                </button>
                <button type="button"
                    className=" border text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-2"
                    style={{
                        backgroundColor: toneColor(color, -1.4),
                        borderColor: toneColor(color, 0.5),
                        color: toneColor(color, 5),
                    }}
                    onClick={()=>(adjustValue(-incriment))}>
                    ↓
                </button>
            </div>
            
        </div>
    )
}
