'use client'

import { useEffect, useRef } from 'react'

const markup = `<section class="hero">
<img class="hero-bg" src="/hero2.webp" alt="">
  <div class="hero-shade"></div>
  <div class="orb orb-1"></div>
  <div class="orb orb-2"></div>
  <div class="wrap hero-grid">
    <div>
      <span class="badge">ContractorOps for Enterprise</span>
      <h1>Every location answers, follows up, and books. <span class="blue">Measured the same way.</span></h1>
      <p class="sub">The AI front office for operators with 25-150 techs and crews. One standard for every branch, brand, and territory - with reporting HQ can finally trust.</p>
      <div class="hero-ctas">
        <a class="btn btn-white" href="#pilot">Start a pilot
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </a>
        <a class="btn btn-ghost" href="#close">Book a call</a>
      </div>
      <div class="audience">
        <span>Multi-location operators</span>
        <span>PE-backed platforms</span>
        <span>Franchisors</span>
      </div>
    </div>

    <div class="hero-visual" aria-hidden="true">
      <div class="call-card">
        <div class="call-top">
          <span class="call-avatar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.34 1.79.65 2.63a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.45-1.22a2 2 0 0 1 2.11-.45c.84.31 1.73.53 2.63.65A2 2 0 0 1 22 16.92z"/></svg>
          </span>
          <span class="call-who"><b>Incoming call - Apex HVAC</b><small>(303) 555-0142 - Denver branch</small></span>
          <span class="call-status"><i></i><span id="callStatus">Answering</span></span>
        </div>
        <div class="wave"><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b></div>
        <div class="call-meta"><span>After hours - 6:42 PM</span><span class="timer" id="callTimer">00:08</span></div>
      </div>

      <div class="book-card">
        <span class="ok"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>
        <span><b>Job booked - water heater install</b><small>Thursday 9:00 AM - synced to ServiceTitan</small></span>
        <span class="amt">$1,850</span>
      </div>

      <div class="stat-chip">
        <svg class="mini-donut" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="9"/>
          <circle class="ring" data-p="98" cx="32" cy="32" r="26" fill="none" stroke="#5fb8f2" stroke-width="9" stroke-linecap="round" stroke-dasharray="163.36" stroke-dashoffset="3.27" transform="rotate(-90 32 32)"/>
        </svg>
        <span><span>98% answer rate</span><small>portfolio, last 30 days</small></span>
      </div>
    </div>
  </div>
</section>

<!-- 2. PAIN -> FIX -->
<section class="block" id="pains">
  <div class="wrap">
    <div class="kicker reveal">Why enterprise feels it first</div>
    <h2 class="section-title reveal d1">The leaks you already know about - multiplied by every location you run.</h2>
    <p class="section-sub reveal d2">One branch missing calls is a nuisance. Forty branches each missing calls is a P&amp;L problem nobody at HQ can see today.</p>

    <div class="pain-grid">
      <div class="pain-row reveal">
        <div class="stat-tile">
          <svg class="donut" viewBox="0 0 64 64"><circle class="track" cx="32" cy="32" r="26"/><circle class="ring orange" data-p="30" cx="32" cy="32" r="26"/></svg>
          <div class="donut-num" style="color:var(--orange)">30%</div>
          <div class="cap">of calls missed at a typical branch</div>
        </div>
        <div class="pain">
          <div><h3>Leakage multiplies by location</h3><p>One branch misses 30% of calls, another is great - and HQ can't see the difference. Every location is its own sieve.</p></div>
        </div>
        <svg class="pain-arrow" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        <div class="stat-tile">
          <svg class="donut" viewBox="0 0 64 64"><circle class="track" cx="32" cy="32" r="26"/><circle class="ring" data-p="100" cx="32" cy="32" r="26"/></svg>
          <div class="donut-num" style="color:var(--blue-deep)">100%</div>
          <div class="cap">answered, every branch, 24/7</div>
        </div>
        <div class="fix">
          <div><h3>Every call answered, everywhere</h3><p>ContractorOps answers and books by each location's rules - nights, weekends, and peak hours included.</p></div>
        </div>
      </div>

      <div class="pain-row reveal d1">
        <div class="stat-tile"><div class="big orange">1 wk</div><div class="cap">to compile one cross-brand report</div></div>
        <div class="pain">
          <div><h3>No cross-brand visibility</h3><p>Nobody can answer "what's our answer rate, booking rate, follow-up rate per branch" without a week of spreadsheets.</p></div>
        </div>
        <svg class="pain-arrow" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        <div class="stat-tile"><div class="big blue">Live</div><div class="cap">per-branch reporting vs baseline</div></div>
        <div class="fix">
          <div><h3>One dashboard, every location</h3><p>Answer rate, speed-to-lead, booking rate, and follow-up rate per location - measured the same way, against the baseline you set.</p></div>
        </div>
      </div>

      <div class="pain-row reveal d2">
        <div class="stat-tile"><div class="big orange">5 / 5</div><div class="cap">branches doing it their own way</div></div>
        <div class="pain">
          <div><h3>Inconsistent experience per branch</h3><p>Every branch answers, quotes, and follows up differently. Roll-ups feel it hardest - every acquired brand brings its own tools and habits.</p></div>
        </div>
        <svg class="pain-arrow" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        <div class="stat-tile"><div class="big blue">1</div><div class="cap">intake standard, your rules per brand</div></div>
        <div class="fix">
          <div><h3>A standard that travels</h3><p>Scripts, qualification, and follow-up steps standardized portfolio-wide - configured per brand, not forced into one template.</p></div>
        </div>
      </div>

      <div class="pain-row reveal d3">
        <div class="stat-tile"><div class="big orange">$372</div><div class="cap">burned per lead that goes unanswered</div></div>
        <div class="pain">
          <div><h3>Lead spend burns at your scale</h3><p>A single shop losing a $372 lead stings. A platform buying leads across 40 locations burns six figures a month on slow response.</p></div>
        </div>
        <svg class="pain-arrow" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        <div class="stat-tile"><div class="big blue">8 sec</div><div class="cap">median response, any hour</div></div>
        <div class="fix">
          <div><h3>Seconds-fast response on every lead</h3><p>New lead, missed call, web form, old estimate - every one gets touched in seconds, followed up until it's won or dead.</p></div>
        </div>
      </div>

      <div class="pain-row reveal d4">
        <div class="stat-tile"><div class="big orange">24/7</div><div class="cap">coverage you're staffing and churning for</div></div>
        <div class="pain">
          <div><h3>Call-center cost and turnover</h3><p>Staffing, training, churn, nights and weekends - the central call center is expensive and still misses calls.</p></div>
        </div>
        <svg class="pain-arrow" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        <div class="stat-tile"><div class="big blue">AI</div><div class="cap">takes volume, people take exceptions</div></div>
        <div class="fix">
          <div><h3>Your team handles the edge cases</h3><p>ContractorOps absorbs routine calls, texts, and follow-up. Your coordinators handle the conversations that need a person.</p></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- 3. ROI -->
<section class="block" id="roi">
  <div class="wrap">
    <div class="kicker reveal">The money argument</div>
    <h2 class="section-title reveal d1">What slow response costs a platform, in arithmetic a CFO accepts.</h2>

    <div class="roi-card reveal d2">
      <div class="roi-grid-wrap">
        <div class="roi-factor">
          <div class="lab">Locations</div>
          <div class="num"><span class="count" data-to="30" data-dur="1200">0</span></div>
          <div class="cap">branches, brands, or franchises in the platform</div>
        </div>
        <div class="roi-op">&times;</div>
        <div class="roi-factor">
          <div class="lab">Paid leads missed / location / mo</div>
          <div class="num"><span class="count" data-to="15" data-dur="1200">0</span></div>
          <div class="cap">calls and form fills that never get a real response</div>
        </div>
        <div class="roi-op">&times;</div>
        <div class="roi-factor">
          <div class="lab">Median cost per issued lead</div>
          <div class="num">$<span class="count" data-to="372" data-dur="1400">0</span></div>
          <div class="cap">across the 2026 Qualified Remodeler Top 500</div>
        </div>
      </div>

      <div class="roi-bars">
        <div class="roi-bar-row">
          <span class="rlab">Lead spend going unanswered today</span>
          <div class="rbar"><i class="orange" data-w="100"></i></div>
          <span class="rval orange">$<span class="count" data-to="167400" data-dur="1800" data-comma="1">0</span>/mo</span>
        </div>
        <div class="roi-bar-row">
          <span class="rlab">With ContractorOps answering every lead</span>
          <div class="rbar"><i class="blue" data-w="3"></i></div>
          <span class="rval blue">~$0/mo</span>
        </div>
      </div>

      <div class="roi-result">
        <div class="big">$<span class="count" data-to="167400" data-dur="1800" data-comma="1">0</span><span class="unit" style="font-size:.35em; font-weight:700; color:rgba(255,255,255,.55); letter-spacing:0;">/month</span>
          <small>in lead spend that never got an answer - about <b>$2.0M a year</b>, before counting a single lost job.</small>
        </div>
        <p class="roi-note">Cost-per-lead figure: <a href="https://www.qualifiedremodeler.com/the-2026-top-500-rankings-a-new-order-takes-shape/" target="_blank" rel="noreferrer">Qualified Remodeler, 2026 Top 500</a>. Adjust the inputs with your own lead spend in the pilot baseline.</p>
      </div>
    </div>
  </div>
</section>

<!-- 4. FLOW -->
<section class="block" id="flow">
  <div class="wrap">
    <div class="kicker reveal">The first minute, end to end</div>
    <h2 class="section-title reveal d1">What happens the moment a lead hits any location.</h2>

    <div class="flow reveal d2">
      <div class="flow-line" aria-hidden="true"><div class="base"></div><div class="march"></div></div>
      <div class="flow-steps">
        <div class="flow-node">
          <span class="flow-dot"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.34 1.79.65 2.63a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.45-1.22a2 2 0 0 1 2.11-.45c.84.31 1.73.53 2.63.65A2 2 0 0 1 22 16.92z"/></svg></span>
          <div class="t">0 sec</div>
          <h3>Call, text, or form fill</h3>
          <p>A homeowner reaches any branch, brand, or franchise - any hour, any day.</p>
        </div>
        <div class="flow-node">
          <span class="flow-dot"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>
          <div class="t">8 sec</div>
          <h3>Answered and qualified</h3>
          <p>ContractorOps responds in that location's voice, by its rules and service area.</p>
        </div>
        <div class="flow-node">
          <span class="flow-dot"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></span>
          <div class="t">26 sec</div>
          <h3>Booked into your system</h3>
          <p>The job lands in the field-service and CRM tools that branch already runs.</p>
        </div>
        <div class="flow-node">
          <span class="flow-dot"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v6h6"/><path d="M3.51 9a9 9 0 1 0 .49-3.51L3 8"/></svg></span>
          <div class="t">Until won</div>
          <h3>Followed up, automatically</h3>
          <p>Estimates and quiet leads get followed up until they book or close out.</p>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- 5. DASHBOARD -->
<section class="block" id="dashboard">
  <div class="wrap">
    <div class="kicker reveal">What HQ sees</div>
    <h2 class="section-title reveal d1">Every branch, measured the same way, against your baseline.</h2>
    <p class="section-sub reveal d2">A mock of the cross-brand view: answer rate, speed-to-lead, booking rate, and follow-up rate per location - the report enterprise buyers say they cannot get today.</p>

    <div class="dash reveal d2">
      <div class="dash-head">
        <span class="title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0079ce" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 15v3M12 10v8M17 6v12"/></svg>
          Platform performance - last 30 days
        </span>
        <span class="live"><i></i>Live</span>
      </div>
      <div class="dash-body">
        <div class="dash-table">
          <div class="dash-row head"><span>Branch</span><span>Answer rate</span><span>Booking rate</span></div>

          <div class="dash-row">
            <div class="branch"><b>Apex HVAC</b><small>Denver - 38 techs</small></div>
            <div class="metric"><div class="val"><span>98%</span><em>+31 pts</em></div><div class="bar"><div class="fill" data-w="98"></div><div class="base" style="left:67%"></div></div></div>
            <div class="metric"><div class="val"><span>71%</span><em>+18 pts</em></div><div class="bar"><div class="fill" data-w="71"></div><div class="base" style="left:53%"></div></div></div>
          </div>

          <div class="dash-row">
            <div class="branch"><b>BlueRoot Plumbing</b><small>Phoenix - 26 techs</small></div>
            <div class="metric"><div class="val"><span>97%</span><em>+25 pts</em></div><div class="bar"><div class="fill" data-w="97"></div><div class="base" style="left:72%"></div></div></div>
            <div class="metric"><div class="val"><span>64%</span><em>+11 pts</em></div><div class="bar"><div class="fill" data-w="64"></div><div class="base" style="left:53%"></div></div></div>
          </div>

          <div class="dash-row">
            <div class="branch"><b>Summit Roofing</b><small>Austin - 31 techs</small></div>
            <div class="metric"><div class="val"><span>99%</span><em>+34 pts</em></div><div class="bar"><div class="fill" data-w="99"></div><div class="base" style="left:65%"></div></div></div>
            <div class="metric"><div class="val"><span>76%</span><em>+23 pts</em></div><div class="bar"><div class="fill" data-w="76"></div><div class="base" style="left:53%"></div></div></div>
          </div>

          <div class="dash-row">
            <div class="branch"><b>Renew Bath</b><small>Dallas - 19 techs</small></div>
            <div class="metric"><div class="val"><span>96%</span><em>+22 pts</em></div><div class="bar"><div class="fill" data-w="96"></div><div class="base" style="left:74%"></div></div></div>
            <div class="metric"><div class="val"><span>61%</span><em>+8 pts</em></div><div class="bar"><div class="fill" data-w="61"></div><div class="base" style="left:53%"></div></div></div>
          </div>

          <div class="dash-row">
            <div class="branch"><b>ClearView Windows</b><small>Atlanta - 22 techs</small></div>
            <div class="metric"><div class="val"><span>98%</span><em>+28 pts</em></div><div class="bar"><div class="fill" data-w="98"></div><div class="base" style="left:70%"></div></div></div>
            <div class="metric"><div class="val"><span>69%</span><em>+16 pts</em></div><div class="bar"><div class="fill" data-w="69"></div><div class="base" style="left:53%"></div></div></div>
          </div>
        </div>

        <div class="dash-side">
          <h4>Jobs booked - portfolio</h4>
          <div class="spark-wrap">
            <div class="big"><span class="count" data-to="1284" data-dur="1800" data-comma="1">0</span><em>+22% vs baseline</em></div>
            <div class="cap">Speed-to-lead: <b>31 seconds</b> median, portfolio-wide</div>
            <svg id="spark" viewBox="0 0 320 96" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="sparkfill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stop-color="#0079ce" stop-opacity=".22"/>
                  <stop offset="1" stop-color="#0079ce" stop-opacity="0"/>
                </linearGradient>
              </defs>
              <path class="area" d="M0,78 C30,74 50,70 75,66 C100,62 120,60 145,50 C170,40 195,40 220,30 C250,20 285,16 320,10 L320,96 L0,96 Z"/>
              <path class="line" d="M0,78 C30,74 50,70 75,66 C100,62 120,60 145,50 C170,40 195,40 220,30 C250,20 285,16 320,10"/>
              <circle class="dot-end" cx="320" cy="10" r="4"/>
            </svg>
          </div>
          <div class="feed">
            <h4 style="margin-bottom:12px">Happening now</h4>
            <div class="item show" id="feedItem"><span class="dot"></span><span id="feedText"><b>Summit Roofing</b> answered an after-hours call and booked a roof inspection - 26 seconds.</span><time id="feedTime">now</time></div>
          </div>
        </div>
      </div>

      <div class="gauges">
        <div class="gauge">
          <svg class="donut" viewBox="0 0 64 64"><circle class="track" cx="32" cy="32" r="26"/><circle class="ring" data-p="98" cx="32" cy="32" r="26"/></svg>
          <div class="g-num"><span class="count" data-to="98" data-dur="1500">0</span>%<em>+29 pts</em></div>
          <h5>Answer rate</h5>
          <p>portfolio-wide, vs 69% baseline</p>
        </div>
        <div class="gauge">
          <svg class="donut" viewBox="0 0 64 64"><circle class="track" cx="32" cy="32" r="26"/><circle class="ring" data-p="70" cx="32" cy="32" r="26"/></svg>
          <div class="g-num"><span class="count" data-to="70" data-dur="1500">0</span>%<em>+17 pts</em></div>
          <h5>Booking rate</h5>
          <p>calls to booked jobs, vs 53% baseline</p>
        </div>
        <div class="gauge">
          <svg class="donut" viewBox="0 0 64 64"><circle class="track" cx="32" cy="32" r="26"/><circle class="ring" data-p="92" cx="32" cy="32" r="26"/></svg>
          <div class="g-num"><span class="count" data-to="92" data-dur="1500">0</span>%<em>+54 pts</em></div>
          <h5>Follow-up rate</h5>
          <p>estimates touched within 24h, vs 38% baseline</p>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- 6. PILOT -->
<section class="block" id="pilot">
  <div class="wrap">
    <div class="kicker reveal">How we start</div>
    <h2 class="section-title reveal d1">Prove it at one or two locations. Then roll out with a playbook.</h2>
    <p class="section-sub reveal d2">No platform-wide commitment up front. The pilot is structured so the numbers decide.</p>

    <div class="pilot-steps reveal d2">
      <div class="step-card">
        <span class="n">1</span>
        <h3>Paid pilot, 1-2 locations</h3>
        <p>60-90 days at one or two branches or brands. Baseline agreed up front: current answer rate, booking rate, and speed-to-lead, measured the same way we'll measure the pilot.</p>
        <span class="tag">Fixed length</span>
      </div>
      <div class="step-card">
        <span class="n">2</span>
        <h3>Measure against baseline</h3>
        <p>Answer rate, booking rate, speed-to-lead, and booked jobs - reported weekly, per location, against the baseline we set on day one. Your numbers, not ours.</p>
        <span class="tag">Weekly reporting</span>
      </div>
      <div class="step-card">
        <span class="n">3</span>
        <h3>Roll out portfolio-wide</h3>
        <p>A repeatable playbook per brand or location - the same onboarding every time, so newly acquired brands come up to standard in weeks, not quarters. Per-location pricing.</p>
        <span class="tag">Rollout playbook</span>
      </div>
    </div>
  </div>
</section>

<!-- 7. TRUST -->
<section class="block" id="trust">
  <div class="wrap">
    <div class="kicker reveal">Built for enterprise review</div>
    <h2 class="section-title reveal d1">The operational details your team will ask about.</h2>

    <div class="trust-grid">
      <div class="trust-card reveal">
        <span class="ic"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
        <h3>White-glove implementation</h3>
        <p>Configured around your locations, service areas, and booking rules by our team - not handed to yours as a setup project.</p>
      </div>
      <div class="trust-card reveal d2">
        <span class="ic"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg></span>
        <h3>TCPA-safe outreach</h3>
        <p>Follow-up and outbound campaigns built around consent and compliance rules, with guardrails your legal team can review.</p>
      </div>
      <div class="trust-card reveal d4">
        <span class="ic"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
        <h3>Security review on request</h3>
        <p>Architecture, data handling, and access controls documented for your security team's review before the pilot starts.</p>
      </div>
    </div>
  </div>
</section>

<!-- 8. CLOSE -->
<section class="close-band" id="close">
  <div class="orb orb-1"></div>
  <div class="orb orb-2"></div>
  <div class="wrap close-inner">
    <span class="badge reveal">Start with one brand</span>
    <h2 class="reveal d1" style="margin-top:20px">Prove it. Then roll it out across the portfolio.</h2>
    <p class="reveal d2">A 60-90 day pilot at one or two locations, measured against a baseline we agree on together.</p>
    <div class="hero-ctas reveal d3">
      <a class="btn btn-blue" href="mailto:support@contractorops.ai?subject=ContractorOps%20enterprise%20pilot">Talk to us about a pilot
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </a>
      <a class="btn btn-ghost" href="mailto:support@contractorops.ai">Book a call</a>
    </div>
  </div>
</section>`

const CIRC = 163.36

function setRing(el: SVGCircleElement, instant: boolean) {
  const p = parseFloat(el.dataset.p || '0')
  if (instant) el.style.transition = 'none'
  el.style.strokeDashoffset = String(CIRC * (1 - p / 100))
}

export function EnterpriseV2() {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let disposed = false
    const intervals: ReturnType<typeof setInterval>[] = []
    const timeouts: ReturnType<typeof setTimeout>[] = []
    const observers: IntersectionObserver[] = []
    const qa = <T extends Element = Element>(sel: string): T[] =>
      Array.from(root.querySelectorAll(sel)) as T[]

    // reveal on scroll
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12 },
    )
    qa('.reveal').forEach((el) => io.observe(el))
    observers.push(io)

    const pio = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            pio.unobserve(e.target)
          }
        })
      },
      { threshold: 0.3 },
    )
    qa('.pilot-steps').forEach((el) => pio.observe(el))
    observers.push(pio)

    // animated counters
    function animateCount(el: HTMLElement) {
      const to = parseFloat(el.dataset.to || '0')
      const dur = parseInt(el.dataset.dur || '1400', 10)
      const comma = el.dataset.comma === '1'
      let start: number | null = null
      const fmt = (v: number) => {
        v = Math.round(v)
        return comma ? v.toLocaleString('en-US') : String(v)
      }
      function tick(t: number) {
        if (disposed) return
        if (!start) start = t
        const p = Math.min(1, (t - start) / dur)
        const eased = 1 - Math.pow(1 - p, 3)
        el.textContent = fmt(to * eased)
        if (p < 1) requestAnimationFrame(tick)
        else el.textContent = fmt(to)
      }
      requestAnimationFrame(tick)
    }
    const cio = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            animateCount(e.target as HTMLElement)
            cio.unobserve(e.target)
          }
        })
      },
      { threshold: 0.4 },
    )
    qa('.count').forEach((el) => cio.observe(el))
    observers.push(cio)

    // dashboard bars + roi bars + donut rings
    const bio = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            Array.from(e.target.querySelectorAll<HTMLElement>('.fill')).forEach((f, i) => {
              timeouts.push(setTimeout(() => { f.style.width = f.dataset.w + '%' }, 120 * i))
            })
            Array.from(e.target.querySelectorAll<HTMLElement>('.rbar i')).forEach((b, i) => {
              timeouts.push(setTimeout(() => { b.style.width = b.dataset.w + '%' }, 150 * i))
            })
            Array.from(e.target.querySelectorAll<SVGCircleElement>('.ring[data-p]')).forEach((r, i) => {
              timeouts.push(setTimeout(() => { setRing(r, false) }, 150 * i))
            })
            bio.unobserve(e.target)
          }
        })
      },
      { threshold: 0.25 },
    )
    qa('.dash, .pain-grid, .roi-card, .hero-visual').forEach((el) => bio.observe(el))
    observers.push(bio)

    // sparkline draw
    const line = root.querySelector<SVGPathElement>('#spark path.line')
    const spark = root.querySelector<SVGElement>('#spark')
    if (line && spark) {
      const len = line.getTotalLength()
      line.style.strokeDasharray = String(len)
      line.style.strokeDashoffset = String(len)
      const sio = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              line.style.transition = 'stroke-dashoffset 1.8s cubic-bezier(.22,.9,.3,1)'
              line.style.strokeDashoffset = '0'
              sio.unobserve(e.target)
            }
          })
        },
        { threshold: 0.4 },
      )
      sio.observe(spark)
      observers.push(sio)
    }

    // rotating live feed
    const feed = [
      { text: '<b>Summit Roofing</b> answered an after-hours call and booked a roof inspection - 26 seconds.', time: 'now' },
      { text: '<b>Apex HVAC</b> followed up on a 9-day-old estimate. Homeowner booked for Thursday.', time: '1m' },
      { text: '<b>BlueRoot Plumbing</b> caught a missed call at 6:42 PM and booked a water-heater job.', time: '3m' },
      { text: '<b>ClearView Windows</b> responded to a web lead in 19 seconds. Appointment confirmed.', time: '5m' },
      { text: '<b>Renew Bath</b> re-engaged a cold lead from March. Consultation scheduled.', time: '8m' },
    ]
    let fi = 0
    const feedItem = root.querySelector<HTMLElement>('#feedItem')
    const feedText = root.querySelector<HTMLElement>('#feedText')
    const feedTime = root.querySelector<HTMLElement>('#feedTime')
    if (feedItem && feedText && feedTime) {
      intervals.push(
        setInterval(() => {
          feedItem.classList.remove('show')
          timeouts.push(
            setTimeout(() => {
              fi = (fi + 1) % feed.length
              feedText.innerHTML = feed[fi].text
              feedTime.textContent = feed[fi].time
              feedItem.classList.add('show')
            }, 450),
          )
        }, 3600),
      )
    }

    // hero call card: status + timer
    const statuses = ['Answering', 'Qualifying', 'Booking']
    let si = 0
    let secs = 8
    const statusEl = root.querySelector<HTMLElement>('#callStatus')
    const timerEl = root.querySelector<HTMLElement>('#callTimer')
    if (statusEl && timerEl) {
      intervals.push(
        setInterval(() => {
          secs++
          if (secs % 6 === 0) {
            si = (si + 1) % statuses.length
            statusEl.textContent = statuses[si]
          }
          timerEl.textContent = '00:' + String(secs % 60).padStart(2, '0')
        }, 1000),
      )
    }

    return () => {
      disposed = true
      observers.forEach((o) => o.disconnect())
      intervals.forEach(clearInterval)
      timeouts.forEach(clearTimeout)
    }
  }, [])

  return <div className="entv2" ref={rootRef} dangerouslySetInnerHTML={{ __html: markup }} />
}
