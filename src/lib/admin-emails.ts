/**
 * Client-safe admin email list. Contains NO server-only imports (no Prisma,
 * no next-auth/server), so it can be imported into client components.
 *
 * This is the single source of truth for which emails are admins.
 * The server module (src/lib/admin.ts) re-exports from here.
 *
 * NOTE: The client check is cosmetic (show/hide UI). Real enforcement is
 * always done server-side in the admin API routes.
 */
export const ADMIN_EMAILS = ['pavithandgrover@outlook.com']

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false
  return ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email.toLowerCase())
}
