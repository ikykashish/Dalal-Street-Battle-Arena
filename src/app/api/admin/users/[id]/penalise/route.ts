import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAdminSession, writeAdminLog, isAdminEmail } from '@/lib/admin'
import { z } from 'zod'

const schema = z.object({
  amount: z.number().min(1).max(500000),
  reason: z.string().min(3).max(200),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  try {
    const { amount, reason } = schema.parse(await req.json())

    const target = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, email: true, cashBalance: true },
    })
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    if (isAdminEmail(target.email)) {
      return NextResponse.json({ error: 'Cannot penalise an administrator' }, { status: 403 })
    }

    // Deduct from cash (clamped at 0 so balance never goes negative)
    const deducted = Math.min(amount, target.cashBalance)
    const newBalance = Math.round((target.cashBalance - deducted) * 100) / 100

    const [, penalty] = await prisma.$transaction([
      prisma.user.update({ where: { id: target.id }, data: { cashBalance: newBalance } }),
      prisma.penalty.create({
        data: {
          userId: target.id,
          amount,
          reason,
          adminEmail: session.user.email,
        },
      }),
    ])

    await writeAdminLog({
      action: 'USER_PENALISED',
      adminEmail: session.user.email,
      targetUserId: target.id,
      targetName: target.name,
      targetEmail: target.email,
      details: `Penalised ₹${amount.toLocaleString('en-IN')} — ${reason}`,
    })

    return NextResponse.json({
      success: true,
      message: `Penalised ${target.name} ₹${amount.toLocaleString('en-IN')}`,
      newBalance,
      penalty,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    }
    console.error('Admin penalise error:', err)
    return NextResponse.json({ error: 'Failed to penalise user' }, { status: 500 })
  }
}
