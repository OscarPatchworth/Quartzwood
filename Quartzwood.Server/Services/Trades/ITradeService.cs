using Quartzwood.Server.DTOs;

namespace Quartzwood.Server.Services.Trades;

public interface ITradeService
{
    // Trades use the user's personal collection
    Task<Guid> GetPersonalEntityIdAsync(Guid userId);

    // Finds and prices the incoming cards (no changes made)
    Task<TradeQuoteDto> QuoteAsync(List<TradeCardDto> incoming);

    // Adds the incoming cards to "Cards from Trade" and deletes the outgoing ones, all or nothing.
    // Throws ArgumentException for anything wrong with the trade (nothing is changed then)
    Task<TradeResultDto> ConfirmAsync(Guid userId, TradeConfirmDto trade);
}
