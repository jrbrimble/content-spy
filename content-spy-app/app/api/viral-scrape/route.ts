import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

let isRunning = false
let lastStarted: string | null = null

export async function GET() {
  return NextResponse.json({ running: isRunning, lastStarted })
}

export async function POST(req: Request) {
  if (isRunning) {
    return NextResponse.json(
      { success: false, message: 'Viral scraper is already running.' },
      { status: 409 }
    )
  }

  let niche = 'AI Agents'
  try {
    const body = await req.json()
    if (body.niche) niche = body.niche
  } catch (e) {
    // ignore
  }

  const scraperDir = process.env.SCRAPER_DIR || path.join(process.cwd(), '..', 'scraper')

  isRunning = true
  lastStarted = new Date().toISOString()

  // Spawn Python viral scraper process
  const proc = spawn('python', ['scrape_viral.py', niche], {
    cwd: scraperDir,
    detached: false,
    stdio: 'pipe',
    env: { ...process.env },
  })

  proc.stdout.on('data', (data: Buffer) => {
    console.log('[ViralScraper]', data.toString().trim())
  })
  proc.stderr.on('data', (data: Buffer) => {
    console.error('[ViralScraper ERR]', data.toString().trim())
  })
  proc.on('close', (code: number) => {
    console.log(`[ViralScraper] Process exited with code ${code}`)
    isRunning = false
  })
  proc.on('error', (err: Error) => {
    console.error('[ViralScraper] Failed to start:', err)
    isRunning = false
  })

  return NextResponse.json({
    success: true,
    message: `Viral Content Finder started for niche: ${niche}!`,
    startedAt: lastStarted,
  })
}
