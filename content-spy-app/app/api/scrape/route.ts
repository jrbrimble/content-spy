import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

// Track running state in memory (resets on server restart — fine for local use)
let isRunning = false
let lastStarted: string | null = null

export async function GET() {
  const githubPat = process.env.GITHUB_PAT
  const isProduction = process.env.NODE_ENV === 'production' || !!githubPat

  if (isProduction && githubPat) {
    try {
      // Check latest workflow run status from GitHub
      const res = await fetch(
        'https://api.github.com/repos/jrbrimble/content-spy/actions/workflows/scrape.yml/runs?per_page=1',
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `Bearer ${githubPat}`,
          },
        }
      )
      if (res.ok) {
        const data = await res.json()
        const latestRun = data.workflow_runs?.[0]
        if (latestRun) {
          const isWorkflowRunning = latestRun.status === 'in_progress' || latestRun.status === 'queued'
          return NextResponse.json({ 
            running: isWorkflowRunning, 
            lastStarted: latestRun.created_at 
          })
        }
      }
    } catch (err) {
      console.error('Failed to fetch GitHub Actions status:', err)
    }
  }

  // Fallback to local memory state
  return NextResponse.json({ running: isRunning, lastStarted })
}

export async function POST() {
  const githubPat = process.env.GITHUB_PAT
  const isProduction = process.env.NODE_ENV === 'production' || !!githubPat

  if (isProduction && githubPat) {
    // Check if it's already running on GitHub
    try {
      const statusRes = await fetch(
        'https://api.github.com/repos/jrbrimble/content-spy/actions/workflows/scrape.yml/runs?per_page=1',
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `Bearer ${githubPat}`,
          },
        }
      )
      if (statusRes.ok) {
        const data = await statusRes.json()
        const latestRun = data.workflow_runs?.[0]
        if (latestRun && (latestRun.status === 'in_progress' || latestRun.status === 'queued')) {
          return NextResponse.json(
            { success: false, message: 'Scraper is already running on GitHub. Please wait.' },
            { status: 409 }
          )
        }
      }
    } catch (e) {
      // ignore
    }

    try {
      const res = await fetch(
        'https://api.github.com/repos/jrbrimble/content-spy/actions/workflows/scrape.yml/dispatches',
        {
          method: 'POST',
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `Bearer ${githubPat}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ref: 'main' }),
        }
      )
      
      if (!res.ok) {
        const errText = await res.text()
        console.error('Failed to trigger GitHub Action:', errText)
        return NextResponse.json({ success: false, message: 'Failed to trigger scraper in production.' }, { status: 500 })
      }
      
      return NextResponse.json({
        success: true,
        message: 'Scraper started on GitHub Actions! Check your dashboard in a few minutes.',
        startedAt: new Date().toISOString(),
      })
    } catch (err) {
      console.error(err)
      return NextResponse.json({ success: false, message: 'Server error triggering scraper.' }, { status: 500 })
    }
  }

  // Fallback to Local scraping
  const scraperDir = process.env.SCRAPER_DIR || path.join(process.cwd(), '..', 'scraper')
  
  isRunning = true
  lastStarted = new Date().toISOString()

  // Spawn the Python scraper as a background process
  const proc = spawn('python', ['run_all_scrapers.py'], {
    cwd: scraperDir,
    detached: false,
    stdio: 'pipe',
    env: { ...process.env },
  })

  proc.stdout.on('data', (data: Buffer) => {
    console.log('[Scraper]', data.toString().trim())
  })
  proc.stderr.on('data', (data: Buffer) => {
    console.error('[Scraper ERR]', data.toString().trim())
  })
  proc.on('close', (code: number) => {
    console.log(`[Scraper] Process exited with code ${code}`)
    isRunning = false
  })
  proc.on('error', (err: Error) => {
    console.error('[Scraper] Failed to start:', err)
    isRunning = false
  })

  return NextResponse.json({
    success: true,
    message: 'Scraper started! This will take a few minutes. Check back soon.',
    startedAt: lastStarted,
  })
}
