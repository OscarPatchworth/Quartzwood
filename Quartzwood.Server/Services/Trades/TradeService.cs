using Microsoft.EntityFrameworkCore;
using Quartzwood.Server.Data;
using Quartzwood.Server.DTOs;
using Quartzwood.Server.Models;
using Quartzwood.Server.Repositories;
using Quartzwood.Server.Services.Accounts;
using Quartzwood.Server.Services.Cards;
using Quartzwood.Server.Services.Scryfall;

namespace Quartzwood.Server.Services.Trades;

// Trades happen in the user's personal collection: cards traded away come from it, and cards received
// go into its root group's "Cards from Trade" box
public class TradeService : ITradeService
{
    public const string TradeBoxName = "Cards from Trade";
    // Most cards (rows) one trade can receive / give away
    private const int MaxIncoming = 200;
    private const int MaxOutgoing = 5000;

    private readonly AppDbContext _context;
    private readonly IAccountService _accounts;
    private readonly ICardCommandService _cardCommands;
    private readonly ICardRepository _cards;
    private readonly IScryfallService _scryfall;

    public TradeService(AppDbContext context, IAccountService accounts, ICardCommandService cardCommands,
        ICardRepository cards, IScryfallService scryfall)
    {
        _context = context;
        _accounts = accounts;
        _cardCommands = cardCommands;
        _cards = cards;
        _scryfall = scryfall;
    }

    public async Task<Guid> GetPersonalEntityIdAsync(Guid userId)
        => (await _accounts.GetByIdAsync(userId))?.PersonalEntityId
            ?? throw new InvalidOperationException("No account for the logged-in user.");

    public async Task<TradeQuoteDto> QuoteAsync(List<TradeCardDto> incoming)
    {
        if (incoming.Count > MaxIncoming) throw new ArgumentException($"At most {MaxIncoming} cards per trade.");

        var found = new List<(TradeCardDto Card, ScryfallCard? Printing, string? Error)>();
        foreach (var card in incoming)
        {
            var problem = Problem(card);
            if (problem != null || card.SetCode is null || card.SetNumber is null)
            {
                // A name-only card has no printing to price (the add bar picks a printing first anyway)
                found.Add((card, null, problem));
                continue;
            }

            var printing = await FindPrintingAsync(card.SetCode, card.SetNumber, card.IsList);
            found.Add((card, printing, printing is null ? $"{card.SetCode} {card.SetNumber} isn't on Scryfall." : null));
        }

        // One batched lookup for every printing's prices
        var gameplay = await _scryfall.GetGameplayByIdsAsync(found.Select(f => f.Printing?.Id).OfType<string>());

        var items = found.Select(f =>
        {
            decimal? price = null;
            if (f.Printing is { } printing && Enum.TryParse<FoilType>(f.Card.FoilType, true, out var foil))
                price = CardPrice.For(gameplay.GetValueOrDefault(printing.Id), foil);
            return new TradeQuoteItemDto(
                f.Printing?.Name ?? f.Card.Name,
                f.Printing?.Set.ToUpperInvariant() ?? f.Card.SetCode,
                f.Printing?.CollectorNumber ?? f.Card.SetNumber,
                f.Printing?.Id,
                price,
                f.Error);
        }).ToList();

        var total = items.Zip(incoming).Sum(pair => (pair.First.UnitPrice ?? 0) * pair.Second.Quantity);
        return new TradeQuoteDto(items, total);
    }

    public async Task<TradeResultDto> ConfirmAsync(Guid userId, TradeConfirmDto trade)
    {
        var outgoing = trade.OutgoingCardIds.Distinct().ToList();
        if (trade.Incoming.Count == 0 && outgoing.Count == 0) throw new ArgumentException("The trade is empty.");
        if (trade.Incoming.Count > MaxIncoming) throw new ArgumentException($"At most {MaxIncoming} cards per trade.");
        if (outgoing.Count > MaxOutgoing) throw new ArgumentException($"At most {MaxOutgoing} cards per trade.");
        for (var i = 0; i < trade.Incoming.Count; i++)
        {
            if (Problem(trade.Incoming[i]) is { } problem) throw new ArgumentException($"Incoming card {i + 1}: {problem}");
        }

        var account = await _accounts.GetByIdAsync(userId)
            ?? throw new InvalidOperationException("No account for the logged-in user.");

        // Only cards in your personal collection can be traded away
        var ownedCount = await _context.Cards
            .CountAsync(c => outgoing.Contains(c.Id) && c.Box.Group.EntityId == account.PersonalEntityId);
        if (ownedCount != outgoing.Count)
            throw new ArgumentException("Some of the cards to trade away aren't in your collection.");

        // All or nothing: every SaveChanges and ExecuteDelete below share this transaction (they use the same
        // AppDbContext), so if one incoming card fails, no card is added or removed and the new box isn't kept
        await using var transaction = await _context.Database.BeginTransactionAsync();

        Box? box = null;
        var added = 0;
        if (trade.Incoming.Count > 0)
        {
            box = await GetOrCreateTradeBoxAsync(account.RootGroupId);
            for (var i = 0; i < trade.Incoming.Count; i++)
            {
                var card = trade.Incoming[i];
                var cards = await _cardCommands.AddAsync(new AddCardDto(
                    card.SetCode, card.SetNumber, card.Name, card.Condition, box.Id, card.FoilType, card.StampType,
                    card.Language, card.IsProxy, card.IsSigned, card.IsList, Quantity: card.Quantity))
                    ?? throw new ArgumentException($"Incoming card {i + 1} ({card.SetCode} {card.SetNumber}) isn't on Scryfall.");
                added += cards.Count;
            }
        }

        var removed = outgoing.Count > 0 ? await _cards.DeleteManyAsync(outgoing) : 0;

        await transaction.CommitAsync();
        return new TradeResultDto(box?.Id ?? Guid.Empty, box?.Name ?? TradeBoxName, added, removed);
    }

    // The root group's "Cards from Trade" box, created the first time it's needed
    private async Task<Box> GetOrCreateTradeBoxAsync(Guid rootGroupId)
    {
        var box = await _context.Boxes.FirstOrDefaultAsync(b => b.GroupId == rootGroupId && b.Name == TradeBoxName);
        if (box != null) return box;

        box = new Box { Name = TradeBoxName, GroupId = rootGroupId };
        _context.Boxes.Add(box);
        await _context.SaveChangesAsync();
        return box;
    }

    // Same rules as adding a card (CardCommandService.AddAsync), so the quote finds what will be added
    private Task<ScryfallCard?> FindPrintingAsync(string setCode, string setNumber, bool isList)
    {
        var (scryfallSetCode, scryfallSetNumber) = ScryfallPrintingKey.Resolve(setCode, setNumber, "None", isList);
        return _scryfall.GetCardAsync(scryfallSetCode, scryfallSetNumber);
    }

    // What's wrong with an incoming card as written, or null when it can be added
    private static string? Problem(TradeCardDto card)
    {
        var hasPrinting = !string.IsNullOrWhiteSpace(card.SetCode) && !string.IsNullOrWhiteSpace(card.SetNumber);
        if (!hasPrinting && string.IsNullOrWhiteSpace(card.Name)) return "needs a set + number or a name.";
        if (card.Quantity < 1) return "quantity must be at least 1.";
        if (!Enum.TryParse<FoilType>(card.FoilType, true, out _)) return $"unknown foil type '{card.FoilType}'.";
        if (!Enum.TryParse<Condition>(card.Condition, true, out _)) return $"unknown condition '{card.Condition}'.";
        return null;
    }
}
