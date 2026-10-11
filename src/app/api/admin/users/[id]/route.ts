import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAdminSession, writeAdminLog, isAdminEmail } from '@/lib/admin'

/** Permanently delete a user and all associated data (holdings, trades, watchlist, penalties). */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  try {
    const target = await prisma.user.findUnique({
      where: { id: id },
      select: { id: true, name: true, email: true },
    })
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    if (isAdminEmail(target.email) || target.id === session.user.id) {
      return NextResponse.json({ error: 'Cannot delete an administrator account' }, { status: 403 })
    }

    // Cascade deletes remove holdings, trades, watchlist items and penalties.
    // Team membership clears automatically (the user simply disappears from members).
    await prisma.user.delete({ where: { id: target.id } })

    // Log AFTER deletion — AdminLog has no FK to User, so it survives.
    await writeAdminLog({
      action: 'USER_DELETED',
      adminEmail: session.user.email,
      targetUserId: target.id,
      targetName: target.name,
      targetEmail: target.email,
      details: `Permanently deleted user ${target.name} (${target.email}) and all associated data`,
    })

    return NextResponse.json({
      success: true,
      message: `Permanently deleted ${target.name}`,
    })
  } catch (err) {
    console.error('Admin delete user error:', err)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
