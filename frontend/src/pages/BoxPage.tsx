//#region Imports
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    deleteApiDividersById,
    getApiBoxesById,
    getApiCardsByBoxByBoxIdGrouped,
    getApiDividersByBoxByBoxId,
    postApiCards,
    putApiBoxesById,
    putApiDividersByBoxByBoxIdOrder,
    putApiDividersById,
    type BoxDto,
    type DividerDto,
    type GroupedCardDto,
} from '../interfaces/generated.ts'
import { getErrorMessage } from '../api/getErrorMessage'
import { withPopup } from '../components/hocs/withPopup.tsx'
import { RightLongPopupShape } from '../components/hocs/Popups/shapes/RightLongPopupShape.tsx'
import { CardEditController } from '../components/Cards/CardEditController.tsx'
import { LoadingIndicator } from '../components/misc/LoadingIndicator.tsx'
import { AddNewCardTextBar, type NewCard } from '../components/AddNewCardTextBar.tsx'
import EditableTitle from '../components/misc/EditableTitle.tsx'
import { cardImageUrl } from '../utils/cardImageUrl'
import { ImportDialog } from '../components/ImportExport/ImportDialog'
import { ExportMenu } from '../components/ImportExport/ExportMenu'
import { BulkActionBar } from '../components/Cards/BulkActionBar'
import { useCardSelection } from '../hooks/useCardSelection'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { TagList } from '../components/Tags/TagList'
import { useCardSort } from '../hooks/useCardSort'
import { SortMenu } from '../components/misc/SortMenu'
import { FilterMenu } from '../components/misc/FilterMenu'
import { useCardFilter, hasFilter } from '../hooks/useCardFilter'
import { AddDividerButton } from '../components/Dividers/AddDividerButton'
import { DividerHeader } from '../components/Dividers/DividerHeader'
//#endregion
//#region setup vars + funcs
const CardDetailsPopup = withPopup(CardEditController, RightLongPopupShape)

const cardGridClass = "grid grid-cols-2 gap-4 @lg:grid-cols-3 @2xl:grid-cols-4 @5xl:grid-cols-6"


export default function BoxPage() {
    const { id } = useParams<{ id: string }>()
    const [cards, setCards] = useState<GroupedCardDto[]>([])
    const [box, setBox] = useState<BoxDto>()
    // Front of the box first
    const [dividers, setDividers] = useState<DividerDto[]>([])
    const [dividerError, setDividerError] = useState<string>()
    const [isSavingDividers, setIsSavingDividers] = useState(false)
    const [loading, setLoading] = useState(true)
    const [showRightPanel, setShowRightPanel] = useState<boolean>(false)
    // Wide screens: add bar in the top banner, buttons in the footer. Compact: the other way round
    const isWide = useMediaQuery("(width >= 64rem)")
    // Compact screens: the footer's add bar is in use, so it's raised to the top of the screen
    const [isAddBarRaised, setIsAddBarRaised] = useState(false)

    // Back down to the footer. Also takes focus out of the input, so tapping it again raises it again
    function lowerAddBar() {
        setIsAddBarRaised(false)
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    }

    // Escape lowers it too; and on a wide screen it lives in the top banner, so it's never raised
    useEffect(() => {
        if (isWide || !isAddBarRaised) return
        const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') lowerAddBar() }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [isWide, isAddBarRaised])
    if (isWide && isAddBarRaised) setIsAddBarRaised(false)
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

    // Reloads the cards, leaving the panel as it is (after a tag change, which keeps the panel open).
    // The dividers too: their card counts change when cards are added, moved or deleted
    async function reloadCards() {
        if (!id) return
        const [cardsResponse, dividersResponse] = await Promise.all([
            getApiCardsByBoxByBoxIdGrouped({ path: { boxId: id }, query: { sort, desc, ...filter } }),
            getApiDividersByBoxByBoxId({ path: { boxId: id } }),
        ])
        setCards(cardsResponse.data)
        setDividers(dividersResponse.data)
    }

    async function refreshCardsAfterMutation() {
        if (!id) return
        await reloadCards()
        setSelectedCards(undefined)
        setShowRightPanel(false)
    }

    // The add bar's "add": into this box, then reload
    async function addToBox(card: NewCard) {
        if (!id) throw new Error("No box.")
        const added = (await postApiCards({ body: { ...card, boxId: id } })).data
        // The card IS added at this point: a failed reload mustn't show as "Unable to add"
        try {
            await refreshCardsAfterMutation()
        } catch (error) {
            console.error("Refreshing cards failed", error)
        }
        return `Added ${added.length} × ${added[0]?.name ?? "card"}`
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

    async function renameDivider(divider: DividerDto, name: string) {
        setDividerError(undefined)
        try {
            const updated = (await putApiDividersById({ path: { id: divider.id }, body: { name } })).data
            setDividers(current => current.map(d => d.id === updated.id ? updated : d))
        } catch (error) {
            setDividerError(getErrorMessage(error, `Unable to rename ${divider.name}.`))
        }
    }

    // Swaps the divider with its neighbour: shown straight away, put back if the server says no
    async function moveDivider(index: number, direction: -1 | 1) {
        if (!id) return
        const previous = dividers
        const reordered = [...dividers]
        ;[reordered[index], reordered[index + direction]] = [reordered[index + direction], reordered[index]]

        setDividers(reordered)
        setDividerError(undefined)
        setIsSavingDividers(true)
        try {
            const response = await putApiDividersByBoxByBoxIdOrder({
                path: { boxId: id },
                body: { dividerIds: reordered.map(d => d.id) },
            })
            setDividers(response.data)
        } catch (error) {
            setDividers(previous)
            setDividerError(getErrorMessage(error, "Unable to move the divider."))
        } finally {
            setIsSavingDividers(false)
        }
    }

    async function deleteDivider(divider: DividerDto) {
        const count = Number(divider.cardCount)
        const message = count > 0
            ? `Delete divider "${divider.name}"? Its ${count} ${count === 1 ? "card stays" : "cards stay"} in this box.`
            : `Delete divider "${divider.name}"?`
        if (!window.confirm(message)) return

        setDividerError(undefined)
        setIsSavingDividers(true)
        try {
            await deleteApiDividersById({ path: { id: divider.id } })
            setDividers(current => current.filter(d => d.id !== divider.id))
        } catch (error) {
            setDividerError(getErrorMessage(error, `Unable to delete ${divider.name}.`))
            return
        } finally {
            setIsSavingDividers(false)
        }
        // The divider IS deleted at this point: a failed reload mustn't show as "Unable to delete"
        reloadCards().catch(error => console.error("Refreshing cards failed", error))
    }

    useEffect(() => {
        if (!id) return
        Promise.all([
            getApiBoxesById({ path: { id } }).then(res => setBox(res.data)),
            getApiDividersByBoxByBoxId({ path: { boxId: id } }).then(res => setDividers(res.data)),
        ])
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

    // A card whose divider isn't in the list (just deleted, say) shows with the loose cards rather than vanishing
    const dividerIds = new Set(dividers.map(d => d.id))
    const looseCards = cards.filter(c => !c.dividerId || !dividerIds.has(c.dividerId))

    function renderCard(c: GroupedCardDto) {
        const isSelected = selection.isSelecting && selection.isStackSelected(c)
        return (
            // The stack's first card id: unique, unlike set+number+condition+foil (two stacks of
            // the same printing can differ by notes or stamp)
            <div key={c.ids[0]} className='relative flex flex-col items-center'>
                <img
                    src={c.scryfallId ? cardImageUrl(c.scryfallId) : undefined}
                    alt={c.name ?? ''}
                    className={`w-full rounded-(--raduis-card-corner-crop) shadow transition ${
                        isSelected ? "ring-4 ring-accent-line" : selection.isSelecting ? "opacity-70 hover:opacity-100" : ""
                    } ${selection.isSelecting ? "cursor-pointer" : ""}`}
                    onClick={() => clickCard(c)}
                />
                {selection.isSelecting && (
                    <input
                        type="checkbox"
                        aria-label={`Select ${c.name ?? "card"}${Number(c.count) > 1 ? ` (${c.count} copies)` : ""}`}
                        checked={isSelected}
                        onChange={() => selection.toggleStack(c)}
                        className="absolute right-2 top-2 size-5 cursor-pointer accent-accent-line"
                    />
                )}
                {Number(c.count) > 1 && (
                    <span className="absolute top-2 left-2 bg-surface/70 text-fg text-s font-bold w-6 h-6 rounded-full flex items-center justify-center">
                        {c.count}
                    </span>
                )}
                <span className='text-center text-xs mt-1'>{c.name} ⋆ {c.condition} {c.foilType !== "None" && "⋆ " + c.foilType}</span>
                <TagList tags={c.tags} className="mt-1 justify-center" />
            </div>
        )
    }

//#endregion
//#region Return
//#endregion

    // The view and edit buttons (two rows in the top banner, or one row in the footer) and the add bar.
    // Each is made once and placed by screen size, so there's only ever one of each on the page
    const viewButtons = box && (
        <>
            <AddDividerButton boxId={box.id} onCreated={divider => setDividers(current => [...current, divider])} />
            <FilterMenu value={filter} onChange={setFilter} />
            <SortMenu value={{ sort, desc }} onChange={setSort} />
        </>
    )
    const editButtons = box && (
        <>
            <ImportDialog boxId={box.id} onImported={refreshCardsAfterMutation} />
            <ExportMenu kind="box" id={box.id} />
            <button
                type="button"
                aria-pressed={selection.isSelecting}
                disabled={cards.length === 0}
                onClick={selection.isSelecting ? selection.stop : selection.start}
                className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold shadow-sm disabled:opacity-50 ${
                    selection.isSelecting
                        ? "border-accent-line bg-accent-hover text-on-accent hover:bg-accent"
                        : "border-line-strong bg-surface text-fg-muted hover:bg-surface-muted"
                }`}
            >
                {selection.isSelecting ? "Done" : "Select"}
            </button>
        </>
    )
    const addBar = <AddNewCardTextBar onAdd={addToBox} />

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
                dividers={dividers}
            />
        )}    
        
        <div >
            <div className='bg-banner-box p-4 mb-5 '>
                <div className='flex flex-wrap items-center justify-between gap-4'>
                    {/* Back above the title, tight together: no taller than the two button rows beside it */}
                    <div className='flex min-w-0 flex-col gap-1'>
                        <button onClick={() => navigate(-1)} className="self-start text-sm text-link hover:underline">← Back</button>
                        <EditableTitle
                            name={box?.name ?? ''}
                            draftName={draftName}
                            isEditing={isEditingName}
                            onDraftChange={setDraftName}
                            onSave={() => void saveBoxName()}
                            onCancel={() => { setIsEditingName(false); setDraftName(box?.name ?? '') }}
                            onStartEdit={() => setIsEditingName(true)}
                            className="truncate"
                        />
                    </div>
                    {/* Wide screens: the add bar up here. Compact: the view/edit buttons, in two rows */}
                    {isWide ? (
                        <div className='w-full max-w-md'>{addBar}</div>
                    ) : (
                        <div className='flex flex-col gap-2'>
                            <div className='flex flex-wrap items-start gap-2'>{viewButtons}</div>
                            <div className='flex flex-wrap items-start gap-2'>{editButtons}</div>
                        </div>
                    )}
                </div>
            </div>

            {/* The footer bar, fixed to the bottom of the screen: the view/edit buttons on wide screens (their
                menus open upwards: data-drop="up"), the add bar on compact ones. While you use the add bar it
                jumps to the TOP of the screen, over the header, so its suggestions have room to open below it */}
            {isWide ? (
                <div data-drop="up" className="fixed inset-x-0 bottom-0 z-10 flex flex-wrap items-center justify-end gap-2 bg-footer px-4 py-2 sm:px-8">
                    {viewButtons}
                    <span className="mx-1 h-6 w-px bg-line-strong" aria-hidden="true" />
                    {editButtons}
                </div>
            ) : (
                <>
                    {isAddBarRaised && <div className="fixed inset-0 z-40 bg-overlay" onClick={lowerAddBar} aria-hidden="true" />}
                    <div
                        className={`fixed inset-x-0 flex items-center gap-2 bg-footer p-2 ${isAddBarRaised ? "top-0 z-50 shadow-lg" : "bottom-0 z-10"}`}
                        onFocus={() => setIsAddBarRaised(true)}
                        // Tabbing out of it lowers it too (clicks elsewhere are handled by the dimmed backdrop)
                        onBlur={event => {
                            if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setIsAddBarRaised(false)
                        }}
                    >
                        <div className="min-w-0 flex-1">{addBar}</div>
                        {isAddBarRaised && (
                            <button type="button" onClick={lowerAddBar}
                                className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-footer-fg hover:bg-footer-fg/15">
                                Done
                            </button>
                        )}
                    </div>
                </>
            )}

            {/* Bottom padding so the footer bar (and select mode's floating bar above it) never covers the last row */}
            <div className={`@container sm:pl-8 ${selection.isSelecting ? "pb-44" : "pb-24"}`}>
                {cards.length === 0 && hasFilter(filter) && (
                    <p className="py-8 text-sm text-fg-muted">
                        No cards in this box match the filter.{' '}
                        <button type="button" onClick={() => setFilter({})} className="font-semibold text-link hover:underline">
                            Clear filter
                        </button>
                    </p>
                )}
                {dividerError && <p role="alert" className="mb-4 text-sm text-danger">{dividerError}</p>}
                {looseCards.length > 0 && (
                    <>
                        {dividers.length > 0 && (
                            <h2 className="mb-3 eyebrow text-xs text-fg-subtle">Not behind a divider</h2>
                        )}
                        <div className={cardGridClass}>{looseCards.map(renderCard)}</div>
                    </>
                )}
                {dividers.map((divider, index) => {
                    const dividerCards = cards.filter(c => c.dividerId === divider.id)
                    return (
                        <section key={divider.id} aria-label={divider.name}>
                            <DividerHeader
                                divider={divider}
                                isFirst={index === 0}
                                isLast={index === dividers.length - 1}
                                onRename={name => renameDivider(divider, name)}
                                onMove={direction => void moveDivider(index, direction)}
                                onDelete={() => void deleteDivider(divider)}
                                disabled={isSavingDividers}
                            />
                            {dividerCards.length > 0 ? (
                                <div className={cardGridClass}>{dividerCards.map(renderCard)}</div>
                            ) : (
                                <p className="text-sm text-fg-subtle">
                                    {hasFilter(filter) && Number(divider.cardCount) > 0
                                        ? "No cards behind this divider match the filter."
                                        : "No cards behind this divider yet."}
                                </p>
                            )}
                        </section>
                    )
                })}
            </div>
        </div>

        <BulkActionBar selection={selection} onChanged={refreshCardsAfterMutation} currentBoxId={box?.id} bottomClassName="bottom-20" />
        </>
    )
}