import { useCallback, useMemo, useRef, useState } from "react"

// Anything shown as one tile that stands for several identical cards (box page stacks, search results)
interface CardStack {
    ids: string[]
}

// Select mode for a list of card stacks. The selection is stored as CARD ids, not stacks:
// after an edit the stacks are regrouped (e.g. 3 NM + 2 LP become 5 LP), but the card ids stay the same.
// A stack counts as selected when every card in it is.
// `stacks` must be in the order they're shown: shift-click selects everything between two clicks in that order
export function useCardSelection(stacks: CardStack[]) {
    const [isSelecting, setIsSelecting] = useState(false)
    const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
    // The last stack clicked (one of its card ids, which survives regrouping): where a shift-click range starts
    const anchorId = useRef<string>(undefined)

    // Only ids still on the page: cards deleted or moved away since they were selected drop out by themselves
    const selectedIds = useMemo(
        () => stacks.flatMap(stack => stack.ids).filter(id => selected.has(id)),
        [stacks, selected]
    )

    const isStackSelected = useCallback(
        (stack: CardStack) => stack.ids.length > 0 && stack.ids.every(id => selected.has(id)),
        [selected]
    )

    // A new Set each time: React only re-renders when state is a NEW object, not the same one changed.
    // Decided from `current` (the latest state) rather than `selected`, which could be a render behind.
    // With `range` (shift held), every stack from the last one clicked to this one gets this one's new state,
    // so shift-click can untick a run as well as tick one
    function toggleStack(stack: CardStack, range = false) {
        const to = stacks.indexOf(stack)
        const from = range && anchorId.current !== undefined
            ? stacks.findIndex(s => s.ids.includes(anchorId.current!))
            : -1
        const affected = from >= 0 && to >= 0
            ? stacks.slice(Math.min(from, to), Math.max(from, to) + 1)
            : [stack]
        anchorId.current = stack.ids[0]

        setSelected(current => {
            const next = new Set(current)
            const wasSelected = stack.ids.every(id => current.has(id))
            for (const s of affected) {
                if (wasSelected) s.ids.forEach(id => next.delete(id))
                else s.ids.forEach(id => next.add(id))
            }
            return next
        })
    }

    function selectAll() {
        setSelected(new Set(stacks.flatMap(stack => stack.ids)))
    }

    function clear() {
        anchorId.current = undefined
        setSelected(new Set())
    }

    function start() {
        setIsSelecting(true)
    }

    // Leaving select mode forgets the selection, so next time starts fresh.
    // useCallback: the SAME function every render, so effects that depend on it (Escape to exit) don't re-run
    const stop = useCallback(() => {
        anchorId.current = undefined
        setIsSelecting(false)
        setSelected(new Set())
    }, [])

    return {
        isSelecting,
        selectedIds,
        allSelected: selectedIds.length > 0 && stacks.every(isStackSelected),
        isStackSelected,
        toggleStack,
        selectAll,
        clear,
        start,
        stop,
    }
}
