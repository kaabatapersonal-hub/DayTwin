'use client'

import { useEffect, useState } from 'react'
import Link                    from 'next/link'
import s                       from './page.module.css'

const GROWTH_ENTRIES = [
  { day: 'Day 1',   strong: 'Decided to start.',     rest: ' Set my first goal.' },
  { day: 'Day 7',   strong: 'First full week.',       rest: ' Showed up every single day.' },
  { day: 'Day 14',  strong: 'Built the landing page.', rest: ' Shipped something real.' },
  { day: 'Day 39',  strong: 'Got the first user.',    rest: " Someone I don't know." },
  { day: 'Day 68',  strong: 'First paying client.',   rest: ' This is actually working.' },
  { day: 'Day 100', strong: 'Launched the MVP.',      rest: " I became who I said I'd become." },
]

export default function LandingPage() {
  const [visible, setVisible] = useState<Set<number>>(new Set())

  useEffect(() => {
    const timeouts = GROWTH_ENTRIES.map((_, i) =>
      setTimeout(
        () => setVisible(prev => new Set(Array.from(prev).concat(i))),
        400 + i * 280,
      )
    )
    return () => timeouts.forEach(clearTimeout)
  }, [])

  return (
    <div className={s.landing}>

      {/* NAV */}
      <nav className={s.nav}>
        <a className={s.navLogo} href="#">
          <svg width="28" height="28" viewBox="0 0 512 512" role="img" aria-label="DayTwin icon">
            <rect width="512" height="512" rx="112" fill="#080808"/>
            <circle cx="256" cy="190" r="82" fill="none" stroke="#2DD4BF" strokeWidth="10"/>
            <circle cx="256" cy="190" r="30" fill="#2DD4BF"/>
            <line x1="108" y1="300" x2="404" y2="300" stroke="#2DD4BF" strokeWidth="2.5" opacity="0.4"/>
            <ellipse cx="256" cy="342" rx="82" ry="28" fill="none" stroke="#2DD4BF" strokeWidth="10" opacity="0.28"/>
            <ellipse cx="256" cy="342" rx="30" ry="10" fill="#2DD4BF" opacity="0.28"/>
          </svg>
          <span className={s.navLogoText}>DayTwin</span>
        </a>
        <Link href="/today" className={`${s.btn} ${s.btnPrimary}`}>Start free</Link>
      </nav>

      {/* HERO */}
      <section className={s.hero}>
        <div className={s.heroGlow}/>
        <div className={s.heroInner}>
          <div className={s.eyebrow}>⚡ Your personal operating system</div>
          <h1>Build the person you said<br/><span>you&apos;d become.</span></h1>
          <p className={s.heroSub}>
            DayTwin connects your daily actions to your long-term goals — and reminds you why you started, on the days you forget.
          </p>
          <div className={s.heroCtas}>
            <Link href="/today" className={`${s.btn} ${s.btnPrimary} ${s.btnLg}`}>Get started free</Link>
            <a href="#how" className={`${s.btn} ${s.btnGhost} ${s.btnLg}`}>See how it works</a>
          </div>

          {/* Evidence of Growth */}
          <div className={s.growthWindow} aria-label="Evidence of Growth timeline showing daily progress entries">
            <div className={s.growthHeader}>Your evidence of growth</div>
            {GROWTH_ENTRIES.map((entry, i) => (
              <div
                key={i}
                className={`${s.growthEntry} ${visible.has(i) ? s.visible : ''}`}
              >
                <span className={s.growthDay}>{entry.day}</span>
                <div className={s.growthDot}/>
                <span className={s.growthText}>
                  <strong>{entry.strong}</strong>{entry.rest}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className={s.divider}/>

      {/* CONTRAST SECTION */}
      <section className={`${s.contrast} ${s.container}`} id="how">
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div className={s.sectionLabel}>The difference</div>
          <h2 className={s.sectionTitle}>Most apps track failure.<br/>DayTwin builds evidence.</h2>
        </div>
        <div className={s.contrastGrid}>
          <div className={`${s.contrastPanel} ${s.contrastBefore}`}>
            <div className={s.contrastLabel}>Every other planner</div>
            <div className={s.contrastItem}><span className={s.contrastIcon}>❌</span> 3 tasks overdue</div>
            <div className={s.contrastItem}><span className={s.contrastIcon}>❌</span> Streak broken — 0 days</div>
            <div className={s.contrastItem}><span className={s.contrastIcon}>❌</span> You missed 14 days in a row</div>
            <div className={s.contrastItem}><span className={s.contrastIcon}>❌</span> 5 habits not done today</div>
          </div>
          <div className={`${s.contrastPanel} ${s.contrastAfter}`}>
            <div className={s.contrastLabel}>DayTwin</div>
            <div className={s.contrastItem}><span className={s.contrastIcon}>✦</span> You completed 42 tasks this month</div>
            <div className={s.contrastItem}><span className={s.contrastIcon}>✦</span> You showed up 22 of 30 days</div>
            <div className={s.contrastItem}><span className={s.contrastIcon}>✦</span> Welcome back. Start with one win today.</div>
            <div className={s.contrastItem}><span className={s.contrastIcon}>✦</span> Consistency: 78% — you&apos;re building</div>
          </div>
        </div>
      </section>

      <div className={`${s.divider} ${s.container}`}/>

      {/* FEATURES */}
      <section className={`${s.section} ${s.container}`}>
        <div className={s.sectionLabel}>Everything you need</div>
        <h2 className={s.sectionTitle}>Your whole life, one place.</h2>
        <p className={s.sectionSub}>
          Goals connect to projects. Projects connect to tasks. Tasks connect to your day. Everything you do moves something forward.
        </p>
        <div className={s.featuresGrid}>
          {[
            { icon: '📅', title: 'Time-blocked planning',   desc: 'Build your day in blocks. See exactly where your hours go — and reschedule when life happens.' },
            { icon: '🔥', title: 'Habits without guilt',    desc: "Consistency score instead of streaks. Miss a day and the app doesn't punish you — it welcomes you back." },
            { icon: '🎯', title: 'Goals that stay visible', desc: 'Set the goal. Write your WHY. Every task you complete moves the progress bar, so the big picture never disappears.' },
            { icon: '⏱️', title: 'Focus sessions',          desc: 'Start a session, lock in, let the countdown run. Cancel requires two taps — the friction is intentional.' },
            { icon: '📊', title: 'Weekly review',           desc: 'Every Sunday, your week summarised automatically. Focus hours, habit rate, best day. No journaling required.' },
            { icon: '🌙', title: 'Evening reflection',      desc: 'Three questions, two minutes. What went well, what wasted your time, your biggest win. Months later you\'ll see the pattern.' },
          ].map(f => (
            <div key={f.title} className={s.featureCard}>
              <div className={s.featureIcon}>{f.icon}</div>
              <div className={s.featureTitle}>{f.title}</div>
              <p className={s.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className={`${s.divider} ${s.container}`}/>

      {/* QUOTE */}
      <div className={s.quoteSection}>
        <p className={s.quoteText}>&ldquo;Some days you just need something to tell you why you should keep going.&rdquo;</p>
        <p className={s.quoteSource}>The Hard Day button is always there — your WHY, your wins, your past self.</p>
      </div>

      <div className={`${s.divider} ${s.container}`}/>

      {/* SPARKS */}
      <section className={`${s.sparksSection} ${s.container}`}>
        <div className={s.sparksInner}>
          <div className={s.sparksGlow}/>
          <div className={s.sparksGrid}>
            <div>
              <div className={s.sectionLabel} style={{ color: 'var(--gold)' }}>Sparks ⚡</div>
              <h2 className={s.sparksTitle}>Progress you can<br/><span>actually collect.</span></h2>
              <p className={s.sparksSub}>
                Every task, habit, and reflection earns Sparks. Spend them on themes, sound packs, and profile customisation. No purchase required — ever.
              </p>
              <div className={s.sparksList}>
                <div className={s.sparkItem}><span className={s.sparkBadge}>+5</span> Complete a focus session</div>
                <div className={s.sparkItem}><span className={s.sparkBadge}>+20</span> Finish your whole daily plan</div>
                <div className={s.sparkItem}><span className={s.sparkBadge}>+50</span> Complete a challenge with a friend</div>
                <div className={s.sparkItem}><span className={s.sparkBadge}>+25</span> Come back after time away</div>
              </div>
            </div>
            <div className={s.sparksVisual}>
              <div className={s.levelBar}>
                <div>
                  <div className={s.levelName}>Level 5 — Disciplined</div>
                  <div className={s.levelProgress}>
                    <div className={s.levelProgressFill} style={{ width: '65%' }}/>
                  </div>
                </div>
                <div className={s.levelXp} style={{ color: 'var(--gold)', fontWeight: 500 }}>1,340 ⚡</div>
              </div>
              <div className={s.levelBar}>
                <span className={s.levelName}>🌙 Midnight Purple</span>
                <span className={s.sparkBadge}>Unlocked</span>
              </div>
              <div className={s.levelBar}>
                <span className={s.levelName}>☕ Coffee Shop sounds</span>
                <span className={s.sparkBadge}>Unlocked</span>
              </div>
              <div className={s.levelBar}>
                <span className={s.levelName}>🏆 Founder Mindset Pack</span>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>200 ⚡ to unlock</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className={`${s.divider} ${s.container}`}/>

      {/* FRIENDS */}
      <section className={`${s.section} ${s.container}`}>
        <div className={s.sectionLabel}>Friends &amp; challenges</div>
        <h2 className={s.sectionTitle}>Accountability that<br/>actually works.</h2>
        <p className={s.sectionSub}>
          Invite your people. Run a 7-day habit pact, a weekly score battle, or just follow each other&apos;s progress quietly. No strangers, no toxic leaderboards.
        </p>
        <div className={s.friendsCards}>
          {[
            { avatar: '🧑🏾', name: 'Joshua', score: '84%', badge: '⚔️ Score battle' },
            { avatar: '👩🏽', name: 'Abena',  score: '91%', badge: '🔥 Habit pact — Day 12' },
            { avatar: '🧑🏿', name: 'Kwame',  score: '73%', badge: '👁️ Following' },
          ].map(f => (
            <div key={f.name} className={s.friendCard}>
              <div className={s.friendAvatar}>{f.avatar}</div>
              <div className={s.friendName}>{f.name}</div>
              <div className={s.friendScore}>{f.score}</div>
              <div className={s.friendStat}>Today&apos;s score</div>
              <div className={s.challengeBadge}>{f.badge}</div>
            </div>
          ))}
        </div>
      </section>

      <div className={`${s.divider} ${s.container}`}/>

      {/* FINAL CTA */}
      <section className={s.ctaSection} id="get-started">
        <div className={s.ctaGlow}/>
        <h2 className={s.ctaTitle}>Open DayTwin and<br/>start your first day.</h2>
        <p className={s.ctaSub}>No signup required. Your progress starts the moment you open it.</p>
        <Link href="/today" className={`${s.btn} ${s.btnPrimary} ${s.btnLg}`} style={{ position: 'relative' }}>
          Open DayTwin — it&apos;s free
        </Link>
        <p className={s.ctaNote}>Works on any phone. Install to home screen for the full experience.</p>
      </section>

      {/* FOOTER */}
      <footer className={`${s.footer} ${s.container}`}>
        <div className={s.footerBrand}>
          Built by <a href="https://simoforge-website.vercel.app" target="_blank" rel="noopener">SimoForge</a>
        </div>
        <div className={s.footerLinks}>
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Contact</a>
        </div>
      </footer>

    </div>
  )
}
