import type { ReactNode } from 'react'

interface BasePopupProps {
    PopupShape: React.ComponentType<{ context: ReactNode }>;
    context: ReactNode;
    show: boolean;
    onClose: () => void;
}

export function BasePopup({PopupShape: Shape, context, show = true, onClose}: BasePopupProps) {

    if (!show) return null
    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-10" onClick={onClose} />
            <Shape context={context} />  {/* renders whatever shape was passed in */}
        </>
    )
}