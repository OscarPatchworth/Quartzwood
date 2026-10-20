import type { GroupDto } from "../interfaces/generated.ts"

// Parents before their children, siblings A-Z: the order a folder tree is shown in.
// depth: how far down the tree (0 = the root), for indenting
export function treeOrder(groups: GroupDto[]) {
    const ordered: { group: GroupDto, depth: number }[] = []
    const childrenOf = (parentId: string | null) =>
        groups.filter(g => g.parentGroupId === parentId).sort((a, b) => a.name.localeCompare(b.name))
    const visit = (group: GroupDto, depth: number) => {
        ordered.push({ group, depth })
        // The depth limit is a safety net: group moves already reject loops
        if (depth < 50) childrenOf(group.id).forEach(child => visit(child, depth + 1))
    }
    childrenOf(null).forEach(root => visit(root, 0))
    return ordered
}
