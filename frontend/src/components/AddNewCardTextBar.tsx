//imports

interface TextBarProps {
  onSuccess?: () => Promise<void>
}

export function AddNewCardTextBar({ } : TextBarProps){

    return(
        <div className="w-full max-w-2xl">
            <label htmlFor="new-card-search" className="sr-only">Card name</label>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm transition focus-within:border-fuchsia-700 focus-within:ring-4 focus-within:ring-fuchsia-700/10">
                <input
                    id="new-card-search"
                    type="text"
                    placeholder="Search cards by name or set..."
                    className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
                <button
                    type="button"
                    className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-fuchsia-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-fuchsia-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-800 active:translate-y-px"
                >
                    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4">
                        <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    Add card
                </button>
            </div>
        </div>
    )
}