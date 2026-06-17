import { prisma } from '@/lib/db'

interface NotifyOptions {
  title: string
  message: string
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'TRADE' | 'MARKET' | 'ADMIN'
}

/** Notify a single user. Fire-and-forget — never throws. */
export async function notifyUser(userId: string, opts: NotifyOptions): Promise<void> {
  try {
    await prisma.notification.create({
      data: { userId, title: opts.title, message: opts.message, type: opts.type ?? 'INFO' },
    })
  } catch {
    // Non-critical — don't surface notification errors to callers
  }
}

/** Notify every user in the system. Fire-and-forget — never throws. */
export async function notifyAllUsers(opts: NotifyOptions): Promise<void> {
  try {
    const users = await prisma.user.findMany({ select: { id: true } })
    await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        title: opts.title,
        message: opts.message,
        type: opts.type ?? 'INFO',
      })),
    })
  } catch {
    // Non-critical
  }
}
