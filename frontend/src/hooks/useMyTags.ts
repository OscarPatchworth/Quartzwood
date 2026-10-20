import { useCallback, useEffect, useState } from "react"
import { getApiTags } from "../interfaces/generated.ts"

// The logged-in user's own tag names (A-Z): what tag inputs suggest. Other people's tags on shared cards
// are visible on those cards but never suggested. refresh() after creating a tag so it's suggested next time
export function useMyTags() {
    const [tags, setTags] = useState<string[]>([])

    const refresh = useCallback(async () => {
        try {
            const res = await getApiTags()
            setTags(res.data.map(tag => tag.name))
        } catch {
            // Suggestions are a convenience: without them you can still type a tag name
        }
    }, [])

    useEffect(() => { void refresh() }, [refresh])

    return { tags, refresh }
}
