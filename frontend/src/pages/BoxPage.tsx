import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    getApiBoxesById,
    getApiCardsByBoxByBoxIdGrouped,
    putApiBoxesById,
    type BoxDto,
    type GroupedCardDto,
} from '../interfaces/generated.ts'
import { withPopup } from '../components/hocs/withPopup.tsx'
import { RightLongPopupShape } from '../components/hocs/Popups/shapes/RightLongPopupShape.tsx'
import { CardEditController } from '../components/Cards/CardEditController.tsx'
import { LoadingIndicator } from '../components/misc/LoadingIndicator.tsx'
import { AddNewCardTextBar } from '../components/AddNewCardTextBar.tsx'
import EditableTitle from '../components/misc/EditableTitle.tsx'
import { cardImageUrl } from '../utils/cardImageUrl'
import { ImportDialog } from '../components/ImportExport/ImportDialog'
import { ExportMenu } from '../components/ImportExport/ExportMenu'
import { BulkActionBar } from '../components/Cards/BulkActionBar'
import { useCardSelection } from '../hooks/useCardSelection'
import { TagList } from '../components/Tags/TagList'
import { useCardSort } from '../hooks/useCardSort'
import { SortMenu } from '../components/misc/SortMenu'
import { FilterMenu } from '../components/misc/FilterMenu'
import { useCardFilter, hasFilter } from '../hooks/useCardFilter'

const CardDetailsPopup = withPopup(CardEditController, RightLongPopupShape)


export default function BoxPage() {
    const { id } = useParams<{ id: string }>()
    const [cards, setCards] = useState<GroupedCardDto[]>([])
    const [box, setBox] = useState<BoxDto>()
    const [loading, setLoading] = useState(true)
    const [showRightPanel, setShowRightPanel] = useState<boolean>(false)
    const [isEditingName, setIsEditingName] = useState(false)
    const [draftName, setDraftName] = useState(box?.name ?? '')
    const navigate = useNavigate()
    const [selectedCards, setSelectedCards] = useState<GroupedCardDto>()
    // Select mode for mass edit/delete: clicking a card ticks it instead of opening the edit panel
    const selection = useCardSelection(cards)
    // Filtered and sorted by the server; both live in the URL (?sort=...&desc=true&mvMin=...&priceMax=...)
    const { sort, desc, setSort } = useCardSort()
    const { filter, setFilter } = useCardFilter()

    function clickCard(groupedCard: GroupedCardDto) {
        if (selection.isSelecting) selection.toggleStack(groupedCard)
        else selectCard(groupedCard)
    }

    useEffect(() => {
        setDraftName(box?.name ?? '')
    }, [box?.name])

    function selectCard(groupedCard: GroupedCardDto){
        setSelectedCards(undefined)
        if(groupedCard.ids.length > 0){
            setSelectedCards(groupedCard)
            setShowRightPanel(true)
        }
    }

    // Reloads the cards, leaving the panel as it is (after a tag change, which keeps the panel open)
    async function reloadCards() {
        if (!id) return
        const response = await getApiCardsByBoxByBoxIdGrouped({ path: { boxId: id }, query: { sort, desc, ...filter } })
        setCards(response.data)
    }

    async function refreshCardsAfterMutation() {
        if (!id) return
        await reloadCards()
        setSelectedCards(undefined)
        setShowRightPanel(false)
    }

    async function saveBoxName() {
        if (!box) return

        const nextName = draftName.trim()
        if (!nextName || nextName === box.name) {
            setIsEditingName(false)
            setDraftName(box.name)
            return
        }

        try {
            const res = await putApiBoxesById({
                path: { id: box.id },
                body: { name: nextName, groupId: box.groupId ?? null },
            })
            setBox(res.data)
            setDraftName(res.data.name)
        } catch (error) {
            setDraftName(box.name)
            console.error('Failed to rename box:', error)
        } finally {
            setIsEditingName(false)
        }
    }

    useEffect(() => {
        if (!id) return
        getApiBoxesById({ path: { id } })
            .then(res => setBox(res.data))
            .finally(() => setLoading(false))
    }, [id])

    // Reloads whenever the box, the sort or the filter changes
    useEffect(() => {
        if (!id) return
        // If the sort changes again before this answer arrives, the cleanup below marks it stale,
        // so a slow older answer can't replace a newer one
        let isCurrent = true
        getApiCardsByBoxByBoxIdGrouped({ path: { boxId: id }, query: { sort, desc, ...filter } })
            .then(res => { if (isCurrent) setCards(res.data) })
        return () => { isCurrent = false }
    }, [id, sort, desc, filter])

    return loading ? 
    (<LoadingIndicator />) : 
    (
        <>
        {showRightPanel && (
            <CardDetailsPopup
                show={showRightPanel}
                onClose={() => setShowRightPanel(false)}
                cards={selectedCards}
                onMutationComplete={refreshCardsAfterMutation}
                onTagsChanged={reloadCards}
            />
        )}    
        
        <div className="p-8">
            <button onClick={() => navigate(-1)} className="mb-4 text-blue-500 hover:underline">← Back</button>
            <div className='flex justify-between'>
                <EditableTitle
                    name={box?.name ?? ''}
                    draftName={draftName}
                    isEditing={isEditingName}
                    onDraftChange={setDraftName}
                    onSave={() => void saveBoxName()}
                    onCancel={() => { setIsEditingName(false); setDraftName(box?.name ?? '') }}
                    onStartEdit={() => setIsEditingName(true)}
                    className="mb-6 mt-4"
                />
                <div className='flex justify-end items-start gap-2 pt-[-10] pb-5'>
                    {box && (
                        <>
                            <AddNewCardTextBar
                                boxId={box.id}
                                onSuccess={refreshCardsAfterMutation}
                            />
                            <FilterMenu value={filter} onChange={setFilter} />
                            <SortMenu value={{ sort, desc }} onChange={setSort} />
                            <ImportDialog boxId={box.id} onImported={refreshCardsAfterMutation} />
                            <ExportMenu kind="box" id={box.id} />
                            <button
                                type="button"
                                aria-pressed={selection.isSelecting}
                                disabled={cards.length === 0}
                                onClick={selection.isSelecting ? selection.stop : selection.start}
                                className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold shadow-sm disabled:opacity-50 ${
                                    selection.isSelecting
                                        ? "border-sky-700 bg-sky-700 text-white hover:bg-sky-800"
                                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                                }`}
                            >
                                {selection.isSelecting ? "Done" : "Select"}
                            </button>
                        </>
                    )}
                </div>

            </div>


            {/* Extra bottom padding in select mode so the floating bar never covers the last row */}
            <div className={`pl-8 ${selection.isSelecting ? "pb-24" : ""}`}>
                {cards.length === 0 && hasFilter(filter) && (
                    <p className="py-8 text-sm text-slate-600">
                        No cards in this box match the filter.{' '}
                        <button type="button" onClick={() => setFilter({})} className="font-semibold text-sky-800 hover:underline">
                            Clear filter
                        </button>
                    </p>
                )}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {cards.map(c => {
                        const isSelected = selection.isSelecting && selection.isStackSelected(c)
                        return (
                        // The stack's first card id: unique, unlike set+number+condition+foil (two stacks of
                        // the same printing can differ by notes or stamp)
                        <div key={c.ids[0]} className='relative flex flex-col items-center'>
                            <img
                                src={c.scryfallId ? cardImageUrl(c.scryfallId) : undefined}
                                alt={c.name ?? ''}
                                className={`w-full rounded-lg shadow transition ${
                                    isSelected ? "ring-4 ring-sky-600" : selection.isSelecting ? "opacity-70 hover:opacity-100" : ""
                                } ${selection.isSelecting ? "cursor-pointer" : ""}`}
                                onClick={() => clickCard(c)}
                            />
                            {selection.isSelecting && (
                                <input
                                    type="checkbox"
                                    aria-label={`Select ${c.name ?? "card"}${Number(c.count) > 1 ? ` (${c.count} copies)` : ""}`}
                                    checked={isSelected}
                                    onChange={() => selection.toggleStack(c)}
                                    className="absolute right-2 top-2 size-5 cursor-pointer accent-sky-600"
                                />
                            )}
                            {Number(c.count) > 1 && (
                                <span className="absolute top-2 left-2 bg-white/70 text-black text-s font-bold w-6 h-6 rounded-full flex items-center justify-center">
                                    {c.count}
                                </span>
                            )}
                            <span className='text-center text-xs mt-1'>{c.name} ⋆ {c.condition} {c.foilType !== "None" && "⋆ " + c.foilType}</span>
                            <TagList tags={c.tags} className="mt-1 justify-center" />
                        </div>
                        )
                    })}
                </div>
            </div>
        </div>

        <BulkActionBar selection={selection} onChanged={refreshCardsAfterMutation} currentBoxId={box?.id} />
        </>
    )
}