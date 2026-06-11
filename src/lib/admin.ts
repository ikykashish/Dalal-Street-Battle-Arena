import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { prisma } from './db'
import { ADMIN_EMAILS, isAdminEmail } from './admin-emails'

// Re-export the client-safe admin list/helper as the single source of truth.
export { ADMIN_EMAILS, isAdminEmail }

export const SUSPENDED_MESSAGE = 'Your account has been suspended by tournament administration.'
export const BANNED_MESSAGE = 'Your account has been permanently banned by tournament administration.'

/**
 * Returns a block message if the account status forbids the action
 * (suspended or banned), otherwise null for ACTIVE users.
 */
export function accountBlockMessage(status?: string | null): string | null {
  if (status === 'SUSPENDED') return SUSPENDED_MESSAGE
  if (status === 'BANNED') return BANNED_MESSAGE
  return null
}

/**
 * Server-side admin guard. Returns the session when the caller is an
 * authenticated admin, otherwise null. Use in every admin API route:
 *
 *   const session = await getAdminSession()
 *   if (!session) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
 */
export async function getAdminSession() {
  const session = await getServerSession(authOptions)
  if (!session || !isAdminEmail(session.user.email)) return null
  return session
}

/** Write an entry to the admin audit log. Never throws (logging must not break actions). */
export async function writeAdminLog(entry: {
  action:
    | 'USER_SUSPENDED'
    | 'USER_BANNED'
    | 'USER_ACTIVATED'
    | 'USER_PENALISED'
    | 'USER_DELETED'
    | 'RECESSION_TRIGGERED'
    | 'STOCK_UP'
  adminEmail: string
  targetUserId?: string | null
  targetName?: string | null
  targetEmail?: string | null
  details?: string | null
}) {
  try {
    await prisma.adminLog.create({
      data: {
        action: entry.action,
        adminEmail: entry.adminEmail,
        targetUserId: entry.targetUserId ?? null,
        targetName: entry.targetName ?? null,
        targetEmail: entry.targetEmail ?? null,
        details: entry.details ?? null,
      },
    })
  } catch (err) {
    console.error('Failed to write admin log:', err)
  }
}
