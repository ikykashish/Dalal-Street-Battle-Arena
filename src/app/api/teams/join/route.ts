import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { code } = await req.json()
    if (!code) return NextResponse.json({ error: 'Team code required' }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (user?.teamId) {
      return NextResponse.json({ error: 'Already in a team. Leave current team first.' }, { status: 400 })
    }

    const team = await prisma.team.findUnique({
      where: { code: code.toUpperCase() },
      include: { members: true },
    })

    if (!team) return NextResponse.json({ error: 'Invalid team code' }, { status: 404 })

    await prisma.user.update({
      where: { id: session.user.id },
      data: { teamId: team.id },
    })

    return NextResponse.json({ team: { id: team.id, name: team.name, code: team.code } })
  } catch (err) {
    console.error('Join team error:', err)
    return NextResponse.json({ error: 'Failed to join team' }, { status: 500 })
  }
}
