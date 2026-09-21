import type { ReactNode } from 'react'
import {BasePopup} from './PopupBase'
import { RightLongPopupShape } from './PopupShapes/RightLongPopupShape'

interface PopupProps {
    context: ReactNode,
    onClose: () => void
}

export default function RLPopup({ context, onClose }: PopupProps) {
    return (
        <BasePopup
            PopupShape={RightLongPopupShape}
            context={context}
            show
            onClose = {onClose}
        />
    )
}