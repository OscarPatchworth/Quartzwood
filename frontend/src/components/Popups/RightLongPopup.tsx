import type { ReactNode } from 'react'
import {BasePopup} from './PopupBase'
import { RightLongPopupShape } from './PopupShapes/RightLongPopupShape'

interface PopupProps {
    context: ReactNode
}

export default function RLPopup({ context }: PopupProps) {
    return (
        <BasePopup
            PopupShape={RightLongPopupShape}
            context={context}
        />
    )
}