import type { CardSearchResultDto, FetchPlanDto, MassSearchEntryDto, MassSearchResponseDto } from "../../interfaces/generated.ts"
import type { PickItem } from "../misc/BoxPickList"

// The list search in progress, kept in this browser's localStorage so a refresh or closed tab doesn't lose it
export interface MassSearchDraft {
    // The list as typed / pasted / imported
    text: string
    // list: editing the list; results: what was found; collecting: the pick list (fetching the cards from their boxes)
    stage: "list" | "results" | "collecting"
    result: MassSearchResponseDto | null
    // When the results were fetched (ISO date): they can go out of date as the collection changes
    searchedAt: string | null
    // How many copies of each card (by entry name) to fetch: starts as the list's quantity, can be changed
    wanted: Record<string, number>
    // Which copies to take out of which boxes (Optimize fetch); null until then
    plan: FetchPlanDto | null
    // Pick list lines ticked off (FetchItem keys)
    collected: string[]
}

export const emptyMassSearch: MassSearchDraft = {
    text: "", stage: "list", result: null, searchedAt: null, wanted: {}, plan: null, collected: [],
}

// A pick list line, plus the ids of the copies it stands for
export interface FetchItem extends PickItem {
    ids: string[]
}

export function planItems(plan: FetchPlanDto): FetchItem[] {
    return plan.boxes.flatMap(box => box.cards.map(card => ({
        // The line's first copy: unique, since each copy is on one line only
        key: card.ids[0],
        ids: card.ids,
        name: card.name,
        setCode: card.setCode,
        setNumber: card.setNumber,
        scryfallId: card.scryfallId,
        condition: card.condition,
        foilType: card.foilType,
        price: card.price === null || card.price === undefined ? null : Number(card.price),
        count: Number(card.count),
        boxId: box.boxId,
        boxName: box.boxName,
        groupPath: box.groupPath,
        dividerName: card.dividerName,
    })))
}

export const owned = (entry: MassSearchEntryDto) => Number(entry.owned)

export function wantedOf(draft: MassSearchDraft, entry: MassSearchEntryDto) {
    return draft.wanted[entry.name] ?? Number(entry.wanted)
}

// A list of search rows grouped by box, boxes in location order ("Collection › Binders › A" before "... › B")
export function groupByBox<T extends Pick<CardSearchResultDto, "boxId" | "boxName" | "groupPath">>(rows: T[]) {
    const boxes = new Map<string, T[]>()
    for (const row of rows) boxes.set(row.boxId, [...(boxes.get(row.boxId) ?? []), row])

    return [...boxes.values()]
        .map(boxRows => ({
            boxId: boxRows[0].boxId,
            boxName: boxRows[0].boxName,
            path: boxRows[0].groupPath.map(step => step.name).join(" › "),
            rows: boxRows,
        }))
        .sort((a, b) => `${a.path} › ${a.boxName}`.localeCompare(`${b.path} › ${b.boxName}`))
}
