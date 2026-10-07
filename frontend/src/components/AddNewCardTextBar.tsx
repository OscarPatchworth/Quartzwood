import { parseCardInput } from "../utils/addCardParser"
import { useState } from "react"
import client from "../api/client"

interface TextBarProps {
  onSuccess?: () => Promise<void>
}

interface ScryfallCardMatch {
    name: string
    setCode: string
    setNumber: string
    scryfallId: string
}

export function AddNewCardTextBar({ } : TextBarProps){

    const [cardInput, setCardInput] = useState<string>(" ");
    const [scryfallCardMatches, setScryfallCardMatches] = useState<ScryfallCardMatch[]>([])


    async function addSearchCard(input: string){
        setScryfallCardMatches([])
        const parsedCard = parseCardInput(input)

        if(parsedCard.isNameLookup && parsedCard.name){
            try {
                const response = await client.get<ScryfallCardMatch[]>("scryfall/search", {
                    params: { name: parsedCard.name, year: parsedCard.year }
                })
                setScryfallCardMatches(response.data)
            } catch (error) {
                console.error("Scryfall search failed", error)
            }
        }

    }

    return(
        <div className="relative w-full max-w-2xl">
            <form onSubmit={event => {
                event.preventDefault()
                addSearchCard(cardInput)
            }}>
                <label htmlFor="new-card-search" className="sr-only">Card name</label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm transition focus-within:border-fuchsia-700 focus-within:ring-4 focus-within:ring-fuchsia-700/10">
                    <input
                        id="new-card-search"
                        type="text"
                        placeholder="Search cards by name or set..."
                        className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                        onChange={event => setCardInput(event.target.value)}
                    />
                    <button
                        type="submit"
                        className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-fuchsia-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-fuchsia-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-800 active:translate-y-px"
                    >
                        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4">
                            <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                        Add card
                    </button>
                </div>
            </form>

            {scryfallCardMatches.length > 0 &&
                <ul className="absolute right-0 top-full z-50 mt-2 max-h-70 w-full divide-y divide-slate-200 overflow-y-auto 
                rounded-lg border border-slate-200 bg-white shadow-lg">
                    {scryfallCardMatches.map(card => (
                        <li key={card.scryfallId}>
                            <a
                                href={`https://scryfall.com/card/${encodeURIComponent(card.setCode.toLowerCase())}/${encodeURIComponent(card.setNumber)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-slate-50"
                            >
                                <span className="flex min-w-0 flex-col">
                                    <span className="truncate font-medium text-slate-900">{card.name}</span>
                                    <span className="text-xs text-slate-600">{card.setCode} #{card.setNumber}</span>
                                </span>
                                <img
                                    src={`https://api.scryfall.com/cards/${encodeURIComponent(card.scryfallId)}?format=image&version=small`}
                                    alt={`${card.name} card`}
                                    loading="lazy"
                                    className="h-auto w-auto shrink-0 rounded"
                                />
                            </a>
                        </li>
                    ))}
                </ul>
            }

        </div>
    )
}