import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateTeamCode } from '@/lib/utils'
import { z } from 'zod'

const createTeamSchema = z.object({
  name: z.string().min(3).max(30),
  description: z.string().max(100).optional(),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { name, description } = createTeamSchema.parse(body)

    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (user?.teamId) {
      return NextResponse.json({ error: 'You are already in a team. Leave current team first.' }, { status: 400 })
    }

    const existing = await prisma.team.findUnique({ where: { name } })
    if (existing) {
      return NextResponse.json({ error: 'Team name already taken' }, { status: 409 })
    }

    let code = generateTeamCode()
    let codeExists = await prisma.team.findUnique({ where: { code } })
    while (codeExists) {
      code = generateTeamCode()
      codeExists = await prisma.team.findUnique({ where: { code } })
    }

    const team = await prisma.$transaction(async (tx) => {
      const t = await tx.team.create({
        data: { name, description, code, creatorId: session.user.id },
      })
      await tx.user.update({ where: { id: session.user.id }, data: { teamId: t.id } })
      return t
    })

    return NextResponse.json({ team }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    }
    console.error('Create team error:', err)
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        team: {
          include: {
            members: {
              select: { id: true, name: true, email: true, cashBalance: true, createdAt: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ team: user?.team || null })
  } catch (err) {
    console.error('Get team error:', err)
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { teamId: null },
    })
    return NextResponse.json({ message: 'Left team successfully' })
  } catch (err) {
    console.error('Leave team error:', err)
    return NextResponse.json({ error: 'Failed to leave team' }, { status: 500 })
  }
}
