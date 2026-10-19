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

    async function refreshCardsAfterMutation() {
        if (!id) return
        const response = await getApiCardsByBoxByBoxIdGrouped({ path: { boxId: id } })
        setCards([...response.data].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')))
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
        Promise.all([
            getApiCardsByBoxByBoxIdGrouped({ path: { boxId: id } }),
            getApiBoxesById({ path: { id } })
        ]).then(([cardsRes, boxRes]) => {
            setCards([...cardsRes.data].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')))
            setBox(boxRes.data)
        }).finally(() => setLoading(false))
    }, [id])

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
                            <ImportDialog boxId={box.id} onImported={refreshCardsAfterMutation} />
                            <ExportMenu kind="box" id={box.id} />
                        </>
                    )}
                </div>

            </div>


            <div className="pl-8">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {cards.map(c => (
                        <div key={`${c.setCode}-${c.setNumber}-${c.condition}-${c.foilType}`} className='relative flex flex-col items-center'>
                            <img
                                src={c.scryfallId ? cardImageUrl(c.scryfallId) : undefined}
                                alt={c.name ?? ''}
                                className="w-full rounded-lg shadow"
                                onClick={() => selectCard(c)}
                            />
                            {Number(c.count) > 1 && (
                                <span className="absolute top-2 left-2 bg-white/70 text-black text-s font-bold w-6 h-6 rounded-full flex items-center justify-center">
                                    {c.count}
                                </span>
                            )}
                            <span className='text-center text-xs mt-1'>{c.name} ⋆ {c.condition} {c.foilType !== "None" && "⋆ " + c.foilType}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
        </>
    )
}