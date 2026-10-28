interface PopupProps {
  context?: React.ReactNode;
  onClose: () => void;
}

// A panel down the right-hand side: 25rem wide, or the whole screen on a phone (with a Close button,
// since there's no backdrop left to tap)
export function RightLongPopupShape({ context, onClose }: PopupProps) {
    return (
        <div role="dialog" aria-modal="true" className="fixed top-0 right-0 z-20 h-full w-[min(25rem,100vw)] overflow-y-auto bg-cardpanel p-5 shadow-xl">
            <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="mb-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-fg-muted hover:bg-surface-sunken hover:text-fg"
            >
                <span aria-hidden="true">✕</span> Close
            </button>
            {context}
        </div>
    )
}
