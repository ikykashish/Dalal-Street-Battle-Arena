import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAdminSession } from '@/lib/admin'

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(100, Math.max(10, parseInt(searchParams.get('pageSize') || '25')))

    const where =
      action && action !== 'ALL'
        ? { action }
        : {}

    const [logs, total] = await Promise.all([
      prisma.adminLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.adminLog.count({ where }),
    ])

    return NextResponse.json({
      logs,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    })
  } catch (err) {
    console.error('Admin logs error:', err)
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }
}
