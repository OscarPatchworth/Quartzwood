//imports

interface ABGCProps {
    
}

export function AddBoxGroupController({}: ABGCProps){

    return(
        <div className="flex flex-wrap items-center gap-2 m-4 align-top">
            <button
                type="button"
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-rose-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-800 active:translate-y-px"
            >
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4">
                    <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Add Group
            </button>
            <button
                type="button"
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-sky-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800 active:translate-y-px"
            >
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4">
                    <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Add Box
            </button>
        </div>
    )
}