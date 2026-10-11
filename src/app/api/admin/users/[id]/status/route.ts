import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAdminSession, writeAdminLog, isAdminEmail } from '@/lib/admin'
import { z } from 'zod'

const schema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  try {
    const { status } = schema.parse(await req.json())

    const target = await prisma.user.findUnique({
      where: { id: id },
      select: { id: true, name: true, email: true, status: true },
    })
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Admins cannot suspend/ban themselves or other admins
    if (isAdminEmail(target.email)) {
      return NextResponse.json({ error: 'Cannot change status of an administrator' }, { status: 403 })
    }

    await prisma.user.update({ where: { id: target.id }, data: { status } })

    const action =
      status === 'SUSPENDED'
        ? 'USER_SUSPENDED'
        : status === 'BANNED'
        ? 'USER_BANNED'
        : 'USER_ACTIVATED'

    await writeAdminLog({
      action,
      adminEmail: session.user.email,
      targetUserId: target.id,
      targetName: target.name,
      targetEmail: target.email,
      details: `Status changed ${target.status} → ${status}`,
    })

    return NextResponse.json({ success: true, status, message: `User set to ${status}` })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    console.error('Admin status error:', err)
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
}
