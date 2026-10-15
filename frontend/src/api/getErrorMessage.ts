// The generated HeyAPI client throws the parsed response body (e.g. ProblemDetails) or raw text on non-2xx responses
export function getErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === "string" && error.trim()) return error
    if (error && typeof error === "object") {
        const response = error as Record<string, unknown>
        if (typeof response.detail === "string") return response.detail
        if (typeof response.message === "string") return response.message
        if (typeof response.title === "string") return response.title
    }
    return fallback
}
