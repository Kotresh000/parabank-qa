import {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

interface TestRecord {
  suiteName: string;
  title: string;
  fullTitle: string;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted';
  duration: number;
  file: string;
  errorMessage?: string;
  errorStack?: string;
}

class GlassmorphismReporter implements Reporter {
  private tests: TestRecord[] = [];
  private startTime = Date.now();
  private outputFile: string;

  constructor(options: { outputFile?: string } = {}) {
    this.outputFile = options.outputFile ?? 'test-results/report.html';
  }

  onBegin(_config: FullConfig, _suite: Suite): void {
    this.startTime = Date.now();
    const dir = path.dirname(this.outputFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const titlePath = test.titlePath().filter(Boolean);
    this.tests.push({
      suiteName: titlePath.slice(0, -1).join(' › '),
      title: test.title,
      fullTitle: titlePath.join(' › '),
      status: result.status,
      duration: result.duration,
      file: path.basename(test.location.file),
      errorMessage: result.errors[0]?.message?.replace(/\x1b\[[0-9;]*m/g, ''),
      errorStack: result.errors[0]?.stack?.replace(/\x1b\[[0-9;]*m/g, ''),
    });
  }

  async onEnd(result: FullResult): Promise<void> {
    const html = this.buildHTML(result);
    fs.writeFileSync(this.outputFile, html, 'utf8');
    const abs = path.resolve(this.outputFile);
    console.log(`\n  Custom Glassmorphism Report → ${abs}\n`);
  }

  // ─── HTML builder ────────────────────────────────────────────────────────────

  private buildHTML(result: FullResult): string {
    const passed  = this.tests.filter(t => t.status === 'passed').length;
    const failed  = this.tests.filter(t => t.status === 'failed' || t.status === 'timedOut').length;
    const skipped = this.tests.filter(t => t.status === 'skipped').length;
    const total   = this.tests.length;
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    const runStatus = result.status === 'passed' ? 'PASSED' : 'FAILED';
    const runStatusClass = result.status === 'passed' ? 'pass' : 'fail';

    // Group tests by file
    const byFile = new Map<string, TestRecord[]>();
    for (const t of this.tests) {
      const list = byFile.get(t.file) ?? [];
      list.push(t);
      byFile.set(t.file, list);
    }

    const suiteBlocks = [...byFile.entries()].map(([file, records]) => {
      const rows = records.map(t => this.renderTestRow(t)).join('');
      return `
        <div class="suite-block">
          <div class="suite-header glass-light">
            <span class="suite-icon">📄</span>
            <span class="suite-name">${this.esc(file)}</span>
            <span class="suite-count">${records.length} test${records.length !== 1 ? 's' : ''}</span>
          </div>
          <div class="suite-tests">${rows}</div>
        </div>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>ParaBank QA Report</title>
<style>
/* ── Reset & base ───────────────────────────────────────── */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --accent:#F48031;
  --accent-glow:rgba(244,128,49,.35);
  --pass:#4ade80;
  --fail:#f87171;
  --skip:#facc15;
  --bg1:#0d0b1e;
  --bg2:#1a1535;
  --bg3:#231d4a;
  --glass-bg:rgba(255,255,255,.06);
  --glass-border:rgba(255,255,255,.12);
  --text:rgba(255,255,255,.88);
  --text-dim:rgba(255,255,255,.45);
  --radius:14px;
}
body{
  min-height:100vh;
  font-family:'Segoe UI',system-ui,sans-serif;
  background:linear-gradient(135deg,var(--bg1) 0%,var(--bg2) 50%,var(--bg3) 100%);
  background-attachment:fixed;
  color:var(--text);
  padding:2rem 1.5rem 4rem;
  line-height:1.5;
}

/* ── Glassmorphism card ─────────────────────────────────── */
.glass{
  background:var(--glass-bg);
  backdrop-filter:blur(16px);
  -webkit-backdrop-filter:blur(16px);
  border:1px solid var(--glass-border);
  border-radius:var(--radius);
}
.glass-light{
  background:rgba(255,255,255,.04);
  border:1px solid rgba(255,255,255,.08);
  border-radius:10px;
}

/* ── Header ─────────────────────────────────────────────── */
.page-header{
  text-align:center;
  margin-bottom:2.5rem;
}
.page-header h1{
  font-size:2rem;
  font-weight:800;
  color:var(--accent);
  letter-spacing:.5px;
  text-shadow:0 0 28px var(--accent-glow);
}
.page-header .subtitle{
  margin-top:.4rem;
  font-size:.85rem;
  color:var(--text-dim);
}
.run-badge{
  display:inline-block;
  margin-top:.8rem;
  padding:.25rem .9rem;
  border-radius:999px;
  font-size:.78rem;
  font-weight:700;
  letter-spacing:1.5px;
}
.run-badge.pass{background:rgba(74,222,128,.15);color:var(--pass);border:1px solid rgba(74,222,128,.3)}
.run-badge.fail{background:rgba(248,113,113,.15);color:var(--fail);border:1px solid rgba(248,113,113,.3)}

/* ── Summary grid ───────────────────────────────────────── */
.summary-grid{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(130px,1fr));
  gap:1rem;
  margin-bottom:2rem;
}
.stat-card{
  padding:1.2rem .8rem;
  text-align:center;
}
.stat-card .label{
  font-size:.7rem;
  text-transform:uppercase;
  letter-spacing:2px;
  color:var(--text-dim);
  margin-bottom:.4rem;
}
.stat-card .value{
  font-size:2.4rem;
  font-weight:800;
  line-height:1;
}
.stat-card.s-total  .value{color:var(--accent)}
.stat-card.s-passed .value{color:var(--pass)}
.stat-card.s-failed .value{color:var(--fail)}
.stat-card.s-skip   .value{color:var(--skip)}
.stat-card.s-rate   .value{color:var(--accent)}
.stat-card.s-time   .value{color:#a78bfa;font-size:1.5rem}

/* ── Progress bar ───────────────────────────────────────── */
.progress-wrap{
  height:6px;
  background:rgba(255,255,255,.08);
  border-radius:3px;
  overflow:hidden;
  margin-bottom:2.5rem;
}
.progress-fill{
  height:100%;
  background:linear-gradient(90deg,var(--accent),#f9a862);
  border-radius:3px;
  width:${passRate}%;
  transition:width 1s ease;
  box-shadow:0 0 10px var(--accent-glow);
}

/* ── Section title ──────────────────────────────────────── */
.section-title{
  font-size:.8rem;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:2px;
  color:var(--accent);
  margin-bottom:1rem;
  padding-bottom:.5rem;
  border-bottom:1px solid rgba(244,128,49,.25);
}

/* ── Suite block ────────────────────────────────────────── */
.suite-block{margin-bottom:1.5rem}
.suite-header{
  display:flex;
  align-items:center;
  gap:.6rem;
  padding:.6rem 1rem;
  margin-bottom:.5rem;
}
.suite-icon{font-size:1rem}
.suite-name{
  flex:1;
  font-size:.85rem;
  font-weight:600;
  color:var(--accent);
  font-family:monospace;
}
.suite-count{
  font-size:.75rem;
  color:var(--text-dim);
}

/* ── Test row ───────────────────────────────────────────── */
.test-row{
  display:flex;
  flex-direction:column;
  padding:.75rem 1.1rem;
  margin-bottom:.45rem;
  border-radius:10px;
  border:1px solid var(--glass-border);
  background:var(--glass-bg);
  backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);
  transition:transform .15s ease,box-shadow .15s ease;
}
.test-row:hover{
  transform:translateX(3px);
  box-shadow:0 4px 24px rgba(0,0,0,.3);
}
.test-row.pass{border-left:3px solid var(--pass)}
.test-row.fail{border-left:3px solid var(--fail)}
.test-row.skip{border-left:3px solid var(--skip)}

.test-main{
  display:flex;
  align-items:center;
  gap:.75rem;
}
.status-dot{
  width:8px;height:8px;
  border-radius:50%;
  flex-shrink:0;
}
.pass .status-dot{background:var(--pass);box-shadow:0 0 6px var(--pass)}
.fail .status-dot{background:var(--fail);box-shadow:0 0 6px var(--fail)}
.skip .status-dot{background:var(--skip)}

.test-title{
  flex:1;
  font-size:.88rem;
  color:var(--text);
}
.test-dur{
  font-size:.75rem;
  color:var(--text-dim);
  font-family:monospace;
  white-space:nowrap;
}

/* ── Error block ────────────────────────────────────────── */
.error-block{
  margin-top:.6rem;
  padding:.6rem .9rem;
  background:rgba(248,113,113,.08);
  border:1px solid rgba(248,113,113,.2);
  border-radius:8px;
  font-size:.76rem;
  font-family:monospace;
  color:#fca5a5;
  white-space:pre-wrap;
  word-break:break-all;
  max-height:200px;
  overflow-y:auto;
}

/* ── Footer ─────────────────────────────────────────────── */
footer{
  text-align:center;
  margin-top:3rem;
  font-size:.78rem;
  color:var(--text-dim);
}
footer span{color:var(--accent)}

/* ── Responsive ─────────────────────────────────────────── */
@media(max-width:600px){
  body{padding:1rem}
  .page-header h1{font-size:1.5rem}
  .stat-card .value{font-size:1.8rem}
}
</style>
</head>
<body>

<header class="page-header">
  <h1>⚡ ParaBank QA Dashboard</h1>
  <p class="subtitle">ImmverseAI · Senior QA Automation Engineer Assignment · ${new Date().toLocaleString()}</p>
  <span class="run-badge ${runStatusClass}">SUITE ${runStatus}</span>
</header>

<div class="summary-grid">
  <div class="stat-card glass s-total">
    <div class="label">Total</div>
    <div class="value">${total}</div>
  </div>
  <div class="stat-card glass s-passed">
    <div class="label">Passed</div>
    <div class="value">${passed}</div>
  </div>
  <div class="stat-card glass s-failed">
    <div class="label">Failed</div>
    <div class="value">${failed}</div>
  </div>
  <div class="stat-card glass s-skip">
    <div class="label">Skipped</div>
    <div class="value">${skipped}</div>
  </div>
  <div class="stat-card glass s-rate">
    <div class="label">Pass Rate</div>
    <div class="value">${passRate}%</div>
  </div>
  <div class="stat-card glass s-time">
    <div class="label">Duration</div>
    <div class="value">${elapsed}s</div>
  </div>
</div>

<div class="progress-wrap">
  <div class="progress-fill"></div>
</div>

<div class="section-title">Test Results by Scenario</div>

${suiteBlocks || '<div class="glass" style="padding:1.5rem;text-align:center;color:var(--text-dim)">No tests recorded.</div>'}

<footer>
  <p>Generated by <span>ParaBank QA Framework</span> · Powered by <span>Playwright</span></p>
</footer>

</body>
</html>`;
  }

  private renderTestRow(t: TestRecord): string {
    const cls  = (t.status === 'passed') ? 'pass' : (t.status === 'skipped') ? 'skip' : 'fail';
    const dur  = (t.duration / 1000).toFixed(2) + 's';
    const err  = t.errorMessage
      ? `<div class="error-block">${this.esc(t.errorMessage)}</div>`
      : '';
    return `
      <div class="test-row ${cls}">
        <div class="test-main">
          <div class="status-dot"></div>
          <span class="test-title">${this.esc(t.title)}</span>
          <span class="test-dur">${dur}</span>
        </div>
        ${err}
      </div>`;
  }

  private esc(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

export default GlassmorphismReporter;
