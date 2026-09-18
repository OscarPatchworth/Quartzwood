import {useState } from 'react'
import type { ReactNode } from 'react'

interface BasePopupProps {
    PopupShape: React.ComponentType<{ context: ReactNode }>
    context: ReactNode
}

export function BasePopup({PopupShape: Shape, context }: BasePopupProps) {
    const [show, setShow] = useState(true)

    if (!show) return null
    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-10" onClick={() => setShow(false)} />
            <Shape context={context} />  {/* renders whatever shape was passed in */}
        </>
    )
}