import { can, routeToModule, type Role } from "@/shared/lib/rbac-core"

export type NavAccessItem = {
  href: string
  requiredRoles?: Role[]
}

export type NavAccessGroup<TItem extends NavAccessItem = NavAccessItem> = {
  items: TItem[]
}

export const ALWAYS_VISIBLE_HREFS = new Set(["/dashboard", "/perfil", "/meus-projetos"])

export function canReadNavItem(item: NavAccessItem, role: Role): boolean {
  if (item.requiredRoles && !item.requiredRoles.includes(role)) {
    return false
  }

  if (ALWAYS_VISIBLE_HREFS.has(item.href)) {
    return true
  }

  const moduleKey = routeToModule(item.href)
  if (!moduleKey) {
    return false
  }

  return can(role, moduleKey, "read")
}

export function filterNavGroupsByRole<
  TItem extends NavAccessItem,
  TGroup extends NavAccessGroup<TItem>,
>(groups: TGroup[], role: Role): TGroup[] {
  return groups
    .map((group) => {
      const filteredItems = group.items.filter((item) => canReadNavItem(item, role))
      if (filteredItems.length === 0) return null
      return { ...group, items: filteredItems }
    })
    .filter((group): group is TGroup => group !== null)
}
