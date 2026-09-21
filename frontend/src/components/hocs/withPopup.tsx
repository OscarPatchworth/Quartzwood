import type { ReactNode } from 'react'

export function withPopup<T extends {}>(
    WrappedComponent: React.ComponentType<T>,
    Shape: React.ComponentType<{ context: ReactNode }>
) {
    return function PopupWrapper(props: T & { show: boolean, onClose: () => void }) {
        const { show, onClose, ...rest } = props
        if (!show) return null
        return (
            <>
                <div className="fixed inset-0 bg-black/50 z-10" onClick={onClose} />
                <Shape context={<WrappedComponent {...(rest as unknown as T)} />} />
            </>
        )
    }
}
