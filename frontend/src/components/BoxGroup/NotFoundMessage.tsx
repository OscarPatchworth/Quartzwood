import { Link } from 'react-router-dom'

// A link that leads nowhere you can see: it doesn't exist, or it's Private and you're not a member.
// The server deliberately answers the same for both, so this can't say which.
// Any other failure (the server is down, or erroring) says so instead, so it never looks like you've lost access
export function NotFoundMessage({ isLoggedIn, kind = "group", error }: { isLoggedIn: boolean, kind?: "group" | "box", error?: unknown }) {
    // A 404 comes back as ProblemDetails ({ status: 404 }); a server error is a stack trace or other text
    const isNotFound = error === undefined || (typeof error === "object" && error !== null && (error as { status?: unknown }).status === 404)

    if (!isNotFound) {
        return (
            <div className="mx-auto max-w-md p-8 text-center">
                <h1 className="mb-2 text-title">Couldn't load this {kind}</h1>
                <p className="text-fg-muted">Something went wrong on the server. Try again in a moment.</p>
                <button onClick={() => window.location.reload()} className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent hover:bg-accent-hover">
                    Try again
                </button>
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-md p-8 text-center">
            <h1 className="mb-2 text-title">Nothing to see here</h1>
            <p className="text-fg-muted">
                This {kind} doesn't exist, or it's private.
                {!isLoggedIn && " If it's yours, log in to see it."}
            </p>
            {!isLoggedIn && (
                <Link to="/login" className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent hover:bg-accent-hover">
                    Log in
                </Link>
            )}
        </div>
    )
}
