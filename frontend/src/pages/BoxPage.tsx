import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import client from '../api/client'
import { type CardDto, type BoxDto } from '../interfaces/generated.ts'
import type { GroupedCardDto } from '../interfaces/generated.ts'
import RLPopup from '../components/Popups/RightLongPopup.tsx'
import { CardDetails } from '../components/Cards/CardDetails.tsx'



export default function BoxPage() {
    const { id } = useParams<{ id: string }>()
    const [cards, setCards] = useState<GroupedCardDto[]>([])
    const [box, setBox] = useState<BoxDto>()
    const [loading, setLoading] = useState(true)
    const [showRightPanel, setShowRightPanel] = useState<boolean>(false)
    const navigate = useNavigate()
    const [selectedCard, setSelectedCard] = useState<CardDto>()

    function selectCard(groupedCard: GroupedCardDto){
        setSelectedCard(undefined)
        if(groupedCard.ids.length == 1){
            client.get<CardDto>(`/cards/${groupedCard.ids[0]}`)
            .then((res) => {
                setSelectedCard(res.data)
                setShowRightPanel(true);
                }
            )
        } else {setShowRightPanel(true);}
    }

    useEffect(() => {
        Promise.all([
            client.get<GroupedCardDto[]>(`/cards/by-box/${id}/grouped`),
            client.get<BoxDto>(`/boxes/${id}`)
        ]).then(([cardsRes, boxRes]) => {
            setCards([...cardsRes.data].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')))
            setBox(boxRes.data)
        }).finally(() => setLoading(false))
    }, [id])

    return loading ? 
    (<div className="p-8">Loading...</div>) : 
    (
        <>
        {showRightPanel && (
            <RLPopup 
            context={selectedCard ? <CardDetails card={selectedCard} /> : <p>Hello</p>}
            onClose={() => setShowRightPanel(false)}/>
        )}
        
        <div className="p-8">
            <button onClick={() => navigate(-1)} className="mb-4 text-blue-500 hover:underline">← Back</button>
            <h1 className="text-2xl font-bold mb-6">{box?.name}</h1>
            <div className="pl-8">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {cards.map(c => (
                        <div key={`${c.setCode}-${c.setNumber}-${c.condition}-${c.foilType}`} className='relative flex flex-col items-center'>
                            <img
                                src={`https://api.scryfall.com/cards/${c.scryfallId}?format=image&version=normal`}
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