// components/EditableTitle.tsx
interface EditableTitleProps {
    name: string
    draftName: string
    isEditing: boolean
    onDraftChange: (value: string) => void
    onSave: () => void
    onCancel: () => void
    onStartEdit: () => void
    className?: string
}

export default function EditableTitle({
    name, draftName, isEditing,
    onDraftChange, onSave, onCancel, onStartEdit,
    className = "mb-4 mt-3"
}: EditableTitleProps) {
    return isEditing ? (
        <input
            autoFocus
            value={draftName}
            onChange={e => onDraftChange(e.target.value)}
            onBlur={onSave}
            onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); onSave() }
                if (e.key === 'Escape') onCancel()
            }}
            className={`${className} rounded border border-line-strong bg-surface px-2 py-1 text-2xl font-bold outline-none ring-2 ring-accent-line/40`}
        />
    ) : (
        <h1
            className={`${className} text-2xl font-bold cursor-text`}
            onDoubleClick={onStartEdit}
            title="Double-click to rename"
        >
            {name}
        </h1>
    )
}