import { NextRequest, NextResponse } from 'next/server'
import bcryptjs from 'bcryptjs'
import { prisma } from '@/lib/db'
import { ADMIN_EMAILS, isAdminEmail } from '@/lib/admin-emails'

/**
 * One-time admin bootstrap endpoint.
 *
 * Because the production database (Neon) can't be reached directly from the
 * local dev machine, this secret-guarded endpoint lets us create or reset the
 * admin account on the live database via an HTTPS call. It ONLY operates on
 * emails in ADMIN_EMAILS, so it can't be used to tamper with regular users.
 *
 * Guard with the SEED_SECRET (same as /api/seed). Rotate SEED_SECRET in your
 * Netlify env to lock this down further.
 */
const SETUP_SECRET = process.env.SEED_SECRET

export async function POST(req: NextRequest) {
  try {
    const { secret, email, password } = await req.json()

    if (!SETUP_SECRET) {
      return NextResponse.json({ error: 'Admin setup is not configured' }, { status: 503 })
    }

    if (secret !== SETUP_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const targetEmail = (email || ADMIN_EMAILS[0]).toLowerCase()
    if (!isAdminEmail(targetEmail)) {
      return NextResponse.json({ error: 'Email is not an admin email' }, { status: 403 })
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const hashed = await bcryptjs.hash(password, 12)
    const user = await prisma.user.upsert({
      where: { email: targetEmail },
      update: { password: hashed, status: 'ACTIVE' },
      create: {
        email: targetEmail,
        name: 'Tournament Admin',
        password: hashed,
        status: 'ACTIVE',
        cashBalance: 1000000,
      },
      select: { id: true, email: true, name: true, status: true },
    })

    return NextResponse.json({
      success: true,
      message: `Admin account ready: ${user.email} (you can now log in with the new password)`,
      user,
    })
  } catch (err) {
    console.error('Admin setup error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
