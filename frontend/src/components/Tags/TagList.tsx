// A card's tags as small read-only chips (box tiles, search rows); nothing when it has none
export function TagList({ tags, className = "" }: { tags: string[], className?: string }) {
    if (tags.length === 0) return null
    return (
        <ul className={`flex flex-wrap gap-1 ${className}`} aria-label="Tags">
            {tags.map(name => (
                <li key={name} className="rounded-full bg-accent-soft px-1.5 py-px text-[0.7rem] font-medium leading-tight text-accent-ink">
                    {name}
                </li>
            ))}
        </ul>
    )
}
