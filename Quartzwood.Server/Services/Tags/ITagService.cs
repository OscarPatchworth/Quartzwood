using Quartzwood.Server.DTOs;

namespace Quartzwood.Server.Services.Tags;

public interface ITagService
{
    // The user's own tags (what the tag picker suggests), A-Z
    Task<List<TagDto>> GetMineAsync(Guid userId);

    // Adds/removes tags by name on cards the caller has already checked access to; returns how many cards.
    // Adding a name the user has never used creates that tag for them
    Task<int> ChangeTagsAsync(IReadOnlyCollection<Guid> cardIds, IEnumerable<string>? add,
        IEnumerable<string>? remove, Guid userId);
}
