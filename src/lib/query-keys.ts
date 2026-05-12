/**
 * Centralized query-key factory. Every key in the cache flows through here so
 * a developer can answer "what invalidates this?" by ctrl-clicking the key
 * function and looking at its callers.
 *
 * Hierarchical layout per TanStack Query convention: lists are scoped under
 * "list", items under "detail", relations under their own segment. Invalidating
 * `qk.budget.all()` (the literal `["budget"]`) wipes everything underneath.
 */
export const qk = {
  auth: {
    all: () => ["auth"] as const,
    me: () => ["auth", "me"] as const,
    sessions: () => ["auth", "sessions"] as const,
  },
  budget: {
    all: () => ["budget"] as const,
    list: () => ["budget", "list"] as const,
    detail: (id: string) => ["budget", "detail", id] as const,
    summary: (id: string) => ["budget", "detail", id, "summary"] as const,
    trends: (id: string) => ["budget", "detail", id, "trends"] as const,
    resume: (id: string) => ["budget", "detail", id, "resume"] as const,
    // dashboard: aggregate envelope that seeds summary / expenses / trends /
    // resume caches in one round-trip. Sub-readers continue using their own
    // keys (above) — `dashboard` is a sibling, not a replacement.
    dashboard: (id: string) => ["budget", "detail", id, "dashboard"] as const,
    expenses: (id: string) => ["budget", "detail", id, "expenses"] as const,
    links: (id: string) => ["budget", "detail", id, "links"] as const,
    linkable: (id: string) => ["budget", "detail", id, "linkable"] as const,
    invites: (id: string) => ["budget", "detail", id, "invites"] as const,
    collaborators: (id: string) =>
      ["budget", "detail", id, "collaborators"] as const,
  },
  invite: {
    info: (token: string) => ["invite", "info", token] as const,
  },
} as const;
