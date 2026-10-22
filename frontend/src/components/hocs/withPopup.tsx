import { useEffect, type ReactNode } from 'react'

export function withPopup<T extends {}>(
    WrappedComponent: React.ComponentType<T>,
    Shape: React.ComponentType<{ context: ReactNode, onClose: () => void }>
) {
    return function PopupWrapper(props: T & { show: boolean, onClose: () => void }) {
        const { show, onClose, ...rest } = props

        // Escape closes it too (on a phone the panel covers the whole screen, so there's no backdrop to click)
        useEffect(() => {
            if (!show) return
            const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
            document.addEventListener('keydown', onKeyDown)
            return () => document.removeEventListener('keydown', onKeyDown)
        }, [show, onClose])

        if (!show) return null
        return (
            <>
                <div className="fixed inset-0 bg-overlay z-10" onClick={onClose} />
                <Shape context={<WrappedComponent {...(rest as unknown as T)} />} onClose={onClose} />
            </>
        )
    }
}
