import type {
  Reporter,
  TestCase,
  TestResult,
  TestStep,
  FullResult,
} from '@playwright/test/reporter';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ICON_COPY =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
const ICON_DOWNLOAD =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>';
const ICON_CHECK =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
const ICON_SPARKLE =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z"></path></svg>';
const ICON_COMMENT =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>';
const ICON_TRASH =
  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
const ICON_PEN =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>';
const ICON_RECT =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="1.5"></rect></svg>';
const ICON_CIRCLE =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle></svg>';
const ICON_SAVE =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>';
const ICON_SHARE =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.6" y1="10.5" x2="15.4" y2="6.5"></line><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"></line></svg>';
const ICON_IMAGE =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
const ICON_CLOSE =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

interface StepNode {
  title: string;
  category: string;
  durationMs: number;
  error: string | null;
  children: StepNode[];
}

interface TestEntry {
  title: string;
  status: string;
  durationMs: number;
  retry: number;
  errorHtml: string | null;
  errorText: string | null;
  errorSnippet: string | null;
  stdout: string | null;
  stderr: string | null;
  steps: StepNode[];
  videoDataUri: string | null;
}

function buildSteps(steps: TestStep[]): StepNode[] {
  return steps.map((s) => ({
    title: s.title,
    category: s.category,
    durationMs: s.duration,
    error: s.error?.message ? stripAnsi(s.error.message) : null,
    children: buildSteps(s.steps),
  }));
}

function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[\d+m/g, '');
}

/**
 * Playwright's assertion messages carry ANSI SGR codes (dim/red/green/inverse)
 * for terminal output — convert the small set it actually emits into inline
 * spans so the shareable report shows the same red/green highlighting as
 * `npx playwright show-report` instead of raw escape sequences.
 */
function ansiToHtml(s: string): string {
  const CLASS_BY_CODE: Record<string, string> = {
    '2': 'ansi-dim',
    '31': 'ansi-red',
    '32': 'ansi-green',
    '7': 'ansi-inverse',
  };
  const CLOSERS = new Set(['22', '39', '27', '0']);

  const parts = s.split(/\x1b\[(\d+)m/);
  let out = '';
  let openCount = 0;
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      out += esc(parts[i]);
    } else {
      const code = parts[i];
      if (CLOSERS.has(code)) {
        if (openCount > 0) {
          out += '</span>';
          openCount--;
        }
      } else if (CLASS_BY_CODE[code]) {
        out += `<span class="${CLASS_BY_CODE[code]}">`;
        openCount++;
      }
    }
  }
  out += '</span>'.repeat(openCount);
  return out;
}

export interface ShareableReportReporterOptions {
  /** Shown in report titles/headers, e.g. "Mobile E2E". Defaults to "QA". */
  appName?: string;
  /** Directory (relative to cwd) reports are written to. Defaults to "reports". */
  outputDir?: string;
}

/**
 * Produces one self-contained .html file per run (test results + every
 * test's video, inlined as base64 data URIs) so the whole run can be shared
 * by just sending that single file — no companion `test-results/` folder,
 * no server, no third-party upload. Also gives the video a "draw" mode so a
 * reviewer can freeze a frame, annotate it, and export a PNG screenshot.
 */
export default class ShareableReportReporter implements Reporter {
  private entries: TestEntry[] = [];
  private runStart = new Date();
  private appName: string;
  private outputDir: string;
  private storagePrefix: string;

  constructor(options: ShareableReportReporterOptions = {}) {
    this.appName = options.appName ?? 'QA';
    this.outputDir = options.outputDir ?? 'reports';
    this.storagePrefix = slugify(this.appName) || 'qa-report-tool';
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const videoAttachment = result.attachments.find((a) => a.name === 'video' && a.path);
    let videoDataUri: string | null = null;
    if (videoAttachment?.path && fs.existsSync(videoAttachment.path)) {
      const bytes = fs.readFileSync(videoAttachment.path);
      videoDataUri = `data:video/webm;base64,${bytes.toString('base64')}`;
    }

    const errorHtml = result.errors.length
      ? result.errors.map((e) => ansiToHtml(e.message ?? String(e))).join('\n\n')
      : null;
    const errorText = result.errors.length
      ? result.errors.map((e) => stripAnsi(e.message ?? String(e))).join('\n\n')
      : null;
    const errorSnippet = result.errors.find((e) => e.snippet)?.snippet ?? null;

    const stdout = result.stdout.length
      ? result.stdout.map((s) => (typeof s === 'string' ? s : s.toString())).join('')
      : null;
    const stderr = result.stderr.length
      ? result.stderr.map((s) => (typeof s === 'string' ? s : s.toString())).join('')
      : null;

    this.entries.push({
      title: test.titlePath().filter(Boolean).join(' › '),
      status: result.status,
      durationMs: result.duration,
      retry: result.retry,
      errorHtml,
      errorText,
      errorSnippet,
      stdout,
      stderr,
      steps: buildSteps(result.steps),
      videoDataUri,
    });
  }

  onEnd(_result: FullResult) {
    if (this.entries.length === 0) return;

    const reportsDir = path.resolve(process.cwd(), this.outputDir);
    fs.mkdirSync(reportsDir, { recursive: true });

    const stamp = formatStamp(this.runStart);
    const fileName = `run-${stamp.fileSafe}.html`;
    const outPath = path.join(reportsDir, fileName);
    fs.writeFileSync(
      outPath,
      buildReportHtml(this.entries, stamp.display, stamp.fileSafe, this.appName, this.storagePrefix),
    );

    const sizeMb = fs.statSync(outPath).size / (1024 * 1024);

    const passed = this.entries.filter((e) => e.status === 'passed').length;
    const failed = this.entries.filter((e) => e.status === 'failed' || e.status === 'timedOut').length;
    const skipped = this.entries.filter((e) => e.status === 'skipped').length;

    const manifestPath = path.join(reportsDir, 'manifest.json');
    const manifest: ManifestEntry[] = fs.existsSync(manifestPath)
      ? JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
      : [];
    manifest.push({
      file: fileName,
      isoDate: this.runStart.toISOString(),
      display: stamp.display,
      total: this.entries.length,
      passed,
      failed,
      skipped,
      sizeMb: Math.round(sizeMb * 10) / 10,
    });
    // Preserve this run's official Playwright HTML report (trace viewer, full
    // attachments) alongside ours — the ['html'] reporter listed before this
    // one in playwright.config.ts has already finished writing it by the time
    // this onEnd runs, but it lives at a fixed path that the *next* run would
    // otherwise overwrite.
    const sourceReportDir = path.resolve(process.cwd(), 'playwright-report');
    let playwrightReportDir: string | null = null;
    if (fs.existsSync(sourceReportDir)) {
      const destDirName = `playwright-report-${stamp.fileSafe}`;
      fs.cpSync(sourceReportDir, path.join(reportsDir, destDirName), { recursive: true });
      playwrightReportDir = destDirName;
    }

    manifest[manifest.length - 1].playwrightReportDir = playwrightReportDir;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    fs.writeFileSync(path.join(reportsDir, 'index.html'), buildIndexHtml(manifest, this.appName, this.outputDir));

    // eslint-disable-next-line no-console
    console.log(`\nShareable run report: ${outPath} (${sizeMb.toFixed(1)} MB)`);
    // eslint-disable-next-line no-console
    console.log(`Run history: ${path.join(reportsDir, 'index.html')}`);
  }
}

interface ManifestEntry {
  file: string;
  isoDate: string;
  display: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  sizeMb: number;
  playwrightReportDir?: string | null;
}

function formatStamp(d: Date): { display: string; fileSafe: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const display = d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const fileSafe = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(
    d.getHours(),
  )}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
  return { display, fileSafe };
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function buildIndexHtml(manifest: ManifestEntry[], appName: string, outputDir = 'reports'): string {
  const rows = [...manifest]
    .reverse()
    .map((m) => {
      const failClass = m.failed > 0 ? 'has-fail' : '';
      const showReportCmd = `npx playwright show-report ${outputDir}/${m.playwrightReportDir}`;
      const officialReportCell = m.playwrightReportDir
        ? `<button class="copy-cmd" data-cmd="${esc(showReportCmd)}" title="Copy: ${esc(
            showReportCmd,
          )}">${ICON_COPY}</button>`
        : '<span class="dim">—</span>';
      return `<tr class="${failClass}">
        <td><a href="./${esc(m.file)}">${esc(m.display)}</a></td>
        <td>${m.total}</td>
        <td class="passed">${m.passed}</td>
        <td class="failed">${m.failed}</td>
        <td class="skipped">${m.skipped}</td>
        <td>${m.sizeMb} MB</td>
        <td>${officialReportCell}</td>
      </tr>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(appName)} — Run History</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #111; color: #eee; padding: 32px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  p.sub { color: #9ab; font-size: 13px; margin: 0 0 24px; }
  table { width: 100%; max-width: 900px; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 10px 14px; border-bottom: 1px solid #262626; }
  th { color: #9ab; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.03em; }
  tr:hover { background: #1a1a1a; }
  tr.has-fail td:first-child a { color: #f87171; }
  a { color: #7db8ff; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .passed { color: #4ade80; }
  .failed { color: #f87171; }
  .skipped { color: #cbd5e1; }
  .dim { color: #555; }
  button.copy-cmd { background: transparent; border: 1px solid #333; color: #ccc; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; justify-content: center; padding: 0; }
  button.copy-cmd:hover { background: #24344d; border-color: #3b5b8a; }
  button.copy-cmd.copied { background: #16a34a; border-color: #16a34a; }
  p.hint { color: #777; font-size: 12px; max-width: 700px; margin-top: 24px; }
</style>
</head>
<body>
  <h1>${esc(appName)} — Run History</h1>
  <p class="sub">${manifest.length} run${manifest.length === 1 ? '' : 's'} recorded. Newest first. Click a date to open that run's report + videos.</p>
  <table>
    <thead>
      <tr><th>Run date &amp; time</th><th>Tests</th><th>Passed</th><th>Failed</th><th>Skipped</th><th>Size</th><th>Official Playwright report</th></tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <p class="hint">The official report (trace viewer, network, DOM snapshots) can't be opened by double-clicking its index.html — Playwright's report loads its data over a local server. The copy button copies the exact <code>npx playwright show-report ...</code> command for that run; paste it into a terminal in this project folder.</p>
  <script>
    const CHECK_ICON = ${JSON.stringify(ICON_CHECK)};
    document.querySelectorAll('.copy-cmd').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cmd = btn.dataset.cmd;
        navigator.clipboard.writeText(cmd).then(() => {
          const original = btn.innerHTML;
          btn.innerHTML = CHECK_ICON;
          btn.classList.add('copied');
          setTimeout(() => { btn.innerHTML = original; btn.classList.remove('copied'); }, 1500);
        }).catch(() => { prompt('Copy this command:', cmd); });
      });
    });
  </script>
</body>
</html>
`;
}

function buildReportHtml(
  entries: TestEntry[],
  runDisplay: string,
  runStamp: string,
  appName: string,
  storagePrefix: string,
): string {
  const passed = entries.filter((e) => e.status === 'passed').length;
  const failed = entries.filter((e) => e.status === 'failed' || e.status === 'timedOut').length;
  const skipped = entries.filter((e) => e.status === 'skipped').length;
  const reportId = crypto.randomUUID();

  const data = JSON.stringify(
    entries.map((e) => ({
      title: e.title,
      status: e.status,
      duration: e.durationMs,
      retry: e.retry,
      errorHtml: e.errorHtml,
      errorText: e.errorText,
      errorSnippet: e.errorSnippet,
      stdout: e.stdout,
      stderr: e.stderr,
      steps: e.steps,
      video: e.videoDataUri,
      comments: [] as unknown[],
      annotations: [] as unknown[],
    })),
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(appName)} — Run ${esc(runDisplay)}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #111; color: #eee; display: flex; height: 100vh; overflow: hidden; }
  #sidebar { width: 340px; overflow-y: auto; border-right: 1px solid #333; flex-shrink: 0; display: flex; flex-direction: column; transition: width 0.15s; }
  #sidebar.collapsed { width: 40px; overflow: hidden; }
  #sidebar.collapsed #sidebar-header > *:not(#sidebar-top-row) { display: none; }
  #sidebar.collapsed #list { display: none; }
  #sidebar-header { padding: 14px 16px; border-bottom: 1px solid #333; flex-shrink: 0; display: flex; flex-direction: column; gap: 12px; }
  #sidebar.collapsed #sidebar-header { padding: 14px 8px; }
  #sidebar-top-row { display: flex; justify-content: flex-end; }
  #sidebar.collapsed #sidebar-top-row { justify-content: center; }
  #sidebar-header h1 { font-size: 15px; margin: 0; }
  .header-lines { display: flex; flex-direction: column; gap: 5px; }
  .run-date { font-size: 12px; color: #9ab; }
  .run-date a { color: #7db8ff; text-decoration: none; }
  .run-date a:hover { text-decoration: underline; }
  #summary { display: flex; gap: 10px; font-size: 12px; }
  #summary span { padding: 2px 8px; border-radius: 3px; }
  #summary .passed { background: #16a34a33; color: #4ade80; }
  #summary .failed { background: #dc262633; color: #f87171; }
  #summary .skipped { background: #6b728033; color: #cbd5e1; }
  #list { list-style: none; margin: 0; padding: 0; overflow-y: auto; }
  #list li { padding: 10px 16px; cursor: pointer; border-bottom: 1px solid #222; font-size: 13px; display: flex; align-items: center; gap: 8px; }
  #list li:hover { background: #1c1c1c; }
  #list li.active { background: #24344d; }
  .badge { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 3px; text-transform: uppercase; flex-shrink: 0; }
  .badge.passed { background: #16a34a; color: #fff; }
  .badge.failed, .badge.timedOut { background: #dc2626; color: #fff; }
  .badge.skipped { background: #6b7280; color: #fff; }
  .title-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0; }
  .comment-count-badge { font-size: 10px; color: #7db8ff; background: #24344d; border-radius: 8px; padding: 1px 6px; flex-shrink: 0; display: flex; align-items: center; gap: 2px; }
  main { flex: 1; min-width: 0; display: flex; flex-direction: column; padding: 20px 24px; box-sizing: border-box; overflow-y: auto; }
  #now-row { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; flex-shrink: 0; flex-wrap: wrap; }
  #now { font-size: 15px; margin-right: 4px; }
  #toolbar { display: flex; gap: 6px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; flex-shrink: 0; }
  button { background: #24344d; color: #eee; border: none; padding: 8px 14px; border-radius: 4px; cursor: pointer; font-size: 13px; font-family: inherit; }
  button:hover { background: #2f4260; }
  button:disabled { opacity: 0.4; cursor: default; }
  button.small { font-size: 11px; padding: 4px 9px; }
  button.active-tool { background: #3b5b8a; box-shadow: 0 0 0 2px #6ea1e0 inset; }
  #exportBtn { align-self: flex-start; font-size: 12px; padding: 6px 10px; display: inline-flex; align-items: center; gap: 6px; }
  .icon-btn { background: transparent; border: 1px solid #333; color: #ccc; width: 30px; height: 30px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; padding: 0; cursor: pointer; flex-shrink: 0; line-height: 1; }
  .icon-btn:hover { background: #24344d; border-color: #3b5b8a; color: #fff; }
  .icon-btn.tiny { width: 24px; height: 24px; font-size: 12px; }
  .icon-btn.ghost { border-color: transparent; }
  #media-area { flex: 1; min-height: 0; display: flex; gap: 16px; }
  #stage { position: relative; flex: 1.2; min-height: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #000; border-radius: 6px; }
  video { max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; display: block; }
  canvas#annotate-canvas { position: absolute; touch-action: none; cursor: crosshair; display: none; }
  #no-video { color: #888; font-size: 13px; }
  #details-panel { flex: 1; min-width: 320px; max-width: 480px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; transition: min-width 0.15s, max-width 0.15s; }
  #details-panel.collapsed { flex: 0 0 40px; min-width: 40px; max-width: 40px; overflow: hidden; }
  #details-panel.collapsed > *:not(#details-top-row) { display: none; }
  #details-top-row { display: flex; justify-content: flex-end; }
  #details-panel.collapsed #details-top-row { justify-content: center; }
  #details-meta { font-size: 12px; color: #9ab; display: flex; gap: 14px; flex-wrap: wrap; }
  .panel { border-top: 1px solid #262626; padding-top: 10px; }
  .panel.accent { border: 1px solid #3b5b8a; border-radius: 8px; padding: 10px 12px 12px; background: linear-gradient(180deg, #1a2740 0%, #161c2b 100%); }
  .panel.accent .panel-title-row h2 { color: #bcd7ff; }
  .panel-header { display: flex; align-items: center; justify-content: space-between; cursor: pointer; gap: 8px; }
  .panel-title-row { display: flex; align-items: center; gap: 6px; min-width: 0; }
  .panel-title-row h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #9ab; margin: 0; }
  .panel-count { color: #667; font-weight: 400; text-transform: none; letter-spacing: 0; }
  .panel.accent .panel-count { color: #7db8ff; }
  .chevron { color: #667; font-size: 10px; transition: transform 0.15s; flex-shrink: 0; }
  .panel.collapsed .chevron { transform: rotate(-90deg); }
  .panel-actions { display: flex; gap: 4px; flex-shrink: 0; }
  .panel-body { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
  .panel.collapsed .panel-body { display: none; }
  #error-message { padding: 10px 12px; background: #2a1414; border: 1px solid #5c2626; border-radius: 6px; font-size: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre-wrap; color: #ddd; max-height: 220px; overflow-y: auto; }
  .ansi-red { color: #f87171; }
  .ansi-green { color: #4ade80; }
  .ansi-dim { color: #888; }
  .ansi-inverse { background: #f87171; color: #1a0000; border-radius: 2px; }
  #error-snippet { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; background: #161616; border: 1px solid #2a2a2a; border-radius: 6px; padding: 10px 0; overflow-x: auto; }
  #error-snippet .line { white-space: pre; padding: 1px 12px; }
  #error-snippet .line.error-line { background: #3a1414; color: #ff9d9d; }
  #steps-list { list-style: none; margin: 0; padding: 0; font-size: 12px; }
  #steps-list ul { list-style: none; margin: 0; padding-left: 16px; }
  #steps-list li { padding: 3px 0; border-left: 1px solid #2a2a2a; padding-left: 8px; margin-left: 2px; }
  .step-row { display: flex; align-items: baseline; gap: 6px; }
  .step-icon { flex-shrink: 0; }
  .step-icon.ok { color: #4ade80; }
  .step-icon.err { color: #f87171; }
  .step-title { color: #ddd; }
  .step-category { color: #666; font-size: 10px; }
  .step-duration { color: #666; font-size: 10px; margin-left: auto; flex-shrink: 0; }
  .step-error { color: #f3a; font-size: 11px; white-space: pre-wrap; margin: 2px 0 4px 20px; }
  #console-box pre { font-size: 11px; white-space: pre-wrap; background: #161616; border: 1px solid #2a2a2a; border-radius: 6px; padding: 8px 10px; max-height: 140px; overflow-y: auto; margin: 0 0 8px; }
  #console-box h3 { font-size: 11px; color: #888; margin: 0 0 4px; text-transform: uppercase; }
  .empty-hint { color: #666; font-size: 12px; display: flex; align-items: center; gap: 6px; }
  .comment-list { display: flex; flex-direction: column; gap: 8px; }
  .comment { background: #161616; border: 1px solid #2a2a2a; border-radius: 6px; padding: 8px 10px; font-size: 12px; display: flex; gap: 8px; }
  .comment-avatar { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #111; flex-shrink: 0; margin-top: 1px; }
  .comment-main { flex: 1; min-width: 0; }
  .comment-meta { color: #888; font-size: 10px; margin-bottom: 4px; display: flex; gap: 8px; align-items: center; }
  .comment-author { color: #ccc; font-weight: 600; }
  .comment-target-badge { padding: 1px 6px; border-radius: 3px; font-size: 9px; text-transform: uppercase; }
  .comment-target-badge.general { background: #24344d; color: #9ab; }
  .comment-target-badge.video { background: #3b2d5c; color: #c9a9ff; }
  .comment-target-badge.error { background: #4a1414; color: #f87171; }
  .comment-target-badge.steps { background: #1f3a2e; color: #6ee7b7; }
  .comment-target-badge.jump { cursor: pointer; }
  .comment-body { color: #ddd; white-space: pre-wrap; }
  .comment-delete { margin-left: auto; flex-shrink: 0; }
  #commentAuthor { width: 100%; box-sizing: border-box; background: #161616; border: 1px solid #2a2a2a; border-radius: 6px; color: #eee; font-size: 12px; padding: 7px 9px; }
  .swatch { width: 20px; height: 20px; border-radius: 50%; border: 2px solid #444; cursor: pointer; padding: 0; }
  .swatch.selected { border-color: #fff; }

  /* --- pinned comments (Figma-style) --- */
  .pin-surface { position: relative; }
  .pin-layer { position: absolute; inset: 0; pointer-events: none; }
  #stage.comment-mode-active, .pin-surface.comment-mode-active { cursor: crosshair; }
  #stage.comment-mode-active::after, .pin-surface.comment-mode-active::after { content: ''; position: absolute; inset: 0; background: rgba(59, 91, 138, 0.1); outline: 1px dashed #3b5b8a; outline-offset: -2px; pointer-events: none; }
  .pin { position: absolute; width: 22px; height: 22px; border-radius: 50% 50% 50% 0; transform: translate(-50%, -100%) rotate(-45deg); display: flex; align-items: center; justify-content: center; cursor: pointer; pointer-events: auto; border: 2px solid #111; box-shadow: 0 1px 4px rgba(0,0,0,0.5); z-index: 5; }
  .pin:hover { filter: brightness(1.15); }
  .pin-inner { transform: rotate(45deg); font-size: 9px; font-weight: 700; color: #111; }
  .pin-popover { position: fixed; z-index: 1000; width: 240px; background: #1c1c1c; border: 1px solid #333; border-radius: 8px; padding: 10px; box-shadow: 0 6px 24px rgba(0,0,0,0.55); font-size: 12px; }
  .pin-popover textarea { width: 100%; box-sizing: border-box; background: #111; border: 1px solid #2a2a2a; border-radius: 6px; color: #eee; font-size: 12px; padding: 7px; resize: vertical; min-height: 44px; font-family: inherit; }
  .pin-popover-actions { display: flex; justify-content: flex-end; gap: 6px; margin-top: 8px; }
  .pin-popover-actions button { font-size: 11px; padding: 5px 10px; }
  .pin-popover-header { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
  .pin-popover .comment-body { margin-top: 4px; }
  #width-label { font-size: 12px; color: #aaa; }

  /* --- shape tool selector --- */
  .tool-btn.selected { background: #3b5b8a; border-color: #6ea1e0; color: #fff; }

  /* --- saved annotations gallery --- */
  .annotation-grid { display: flex; flex-wrap: wrap; gap: 8px; }
  .annotation-thumb { position: relative; width: 74px; height: 130px; border-radius: 6px; overflow: hidden; border: 1px solid #2a2a2a; cursor: pointer; background: #000; }
  .annotation-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .annotation-thumb .annotation-delete { position: absolute; top: 3px; right: 3px; width: 20px; height: 20px; background: rgba(0,0,0,0.6); border: none; }
  .annotation-thumb .annotation-meta { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(0deg, rgba(0,0,0,0.75), transparent); color: #eee; font-size: 9px; padding: 3px 5px; }
  .annotation-lightbox { position: fixed; inset: 0; background: rgba(0,0,0,0.88); display: flex; align-items: center; justify-content: center; z-index: 2000; flex-direction: column; gap: 12px; }
  .annotation-lightbox img { max-width: 90vw; max-height: 82vh; border-radius: 8px; box-shadow: 0 10px 40px rgba(0,0,0,0.6); }
  .annotation-lightbox .lightbox-caption { color: #9ab; font-size: 12px; }
  .annotation-lightbox .lightbox-close { position: absolute; top: 18px; right: 18px; background: rgba(255,255,255,0.08); }

  /* --- test selection / sharing --- */
  #selection-bar { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-bottom: 1px solid #222; font-size: 11px; color: #9ab; flex-shrink: 0; }
  #selection-bar .sel-count { flex: 1; }
  #selection-bar button { font-size: 11px; padding: 4px 8px; }
  .list-checkbox { flex-shrink: 0; accent-color: #3b5b8a; cursor: pointer; }
  .share-current-btn { }
</style>
</head>
<body>
  <div id="sidebar">
    <div id="sidebar-header">
      <div id="sidebar-top-row">
        <button class="icon-btn tiny ghost" id="sidebarToggle" title="Collapse test list">«</button>
      </div>
      <div class="header-lines">
        <h1>${esc(appName)} — Run Report</h1>
        <div class="run-date">Test run &amp; report generated: ${esc(runDisplay)}</div>
        <div class="run-date"><a href="./index.html">&larr; All runs</a></div>
      </div>
      <div id="summary">
        <span class="passed">${passed} passed</span>
        <span class="failed">${failed} failed</span>
        <span class="skipped">${skipped} skipped</span>
      </div>
      <button id="exportBtn" title="Download a standalone copy of this report with your comments baked in">${ICON_DOWNLOAD} Export with comments</button>
    </div>
    <div id="selection-bar">
      <span class="sel-count" id="selCount">Check tests to share a subset</span>
      <button class="icon-btn tiny" id="shareSelectedBtn" title="Share the checked tests as a standalone file">${ICON_SHARE}</button>
      <button class="icon-btn tiny ghost" id="clearSelectionBtn" title="Clear selection">${ICON_CLOSE}</button>
    </div>
    <ul id="list"></ul>
  </div>
  <main>
    <div id="now-row">
      <div id="now"></div>
      <button class="icon-btn" id="copyNameBtn" title="Copy test name">${ICON_COPY}</button>
      <button class="icon-btn" id="copyPromptBtn" title="Copy test + error as an AI debugging prompt">${ICON_SPARKLE}</button>
    </div>
    <div id="toolbar">
      <button class="icon-btn" id="annotateBtn" title="Annotate this frame">✏️</button>
      <button class="icon-btn" id="commentModeBtn" title="Add a comment — click anywhere on the video, error, or steps to pin it">${ICON_COMMENT}</button>
      <button class="icon-btn" id="resumeBtn" title="Resume video playback" style="display:none">▶</button>
      <span id="drawTools" style="display:none; gap:8px; align-items:center;">
        <button class="icon-btn tiny tool-btn selected" data-tool="pen" title="Pen">${ICON_PEN}</button>
        <button class="icon-btn tiny tool-btn" data-tool="rect" title="Rectangle">${ICON_RECT}</button>
        <button class="icon-btn tiny tool-btn" data-tool="circle" title="Circle">${ICON_CIRCLE}</button>
        <button class="swatch selected" data-color="#ff3b30" style="background:#ff3b30" title="Red"></button>
        <button class="swatch" data-color="#ffd60a" style="background:#ffd60a" title="Yellow"></button>
        <button class="swatch" data-color="#34c759" style="background:#34c759" title="Green"></button>
        <button class="swatch" data-color="#0a84ff" style="background:#0a84ff" title="Blue"></button>
        <button class="swatch" data-color="#ffffff" style="background:#ffffff" title="White"></button>
        <span id="width-label">width</span>
        <input type="range" id="widthRange" min="2" max="14" value="4" title="Pen width" />
        <button class="icon-btn" id="clearBtn" title="Clear drawing">🧹</button>
        <button class="icon-btn" id="saveAnnotationBtn" title="Save this annotation to the report">${ICON_SAVE}</button>
        <button class="icon-btn" id="downloadPngBtn" title="Download annotated screenshot (.png)">${ICON_DOWNLOAD}</button>
      </span>
      <button class="icon-btn" id="downloadVideoBtn" title="Download video (.webm)">${ICON_DOWNLOAD}</button>
      <button class="icon-btn" id="shareCurrentBtn" title="Share only this test as a standalone file">${ICON_SHARE}</button>
    </div>
    <div id="media-area">
      <div id="stage">
        <video id="player" controls></video>
        <canvas id="annotate-canvas"></canvas>
        <div class="pin-layer" id="video-pin-layer"></div>
        <div id="no-video" style="display:none">No video recorded for this test.</div>
      </div>
      <div id="details-panel">
        <div id="details-top-row">
          <button class="icon-btn tiny ghost" id="detailsToggle" title="Collapse details panel">»</button>
        </div>
        <div id="details-meta"></div>

        <div class="panel accent" id="comments-panel">
          <div class="panel-header">
            <div class="panel-title-row"><span class="chevron">▾</span><h2>💬 Comments <span class="panel-count" id="comment-count"></span></h2></div>
            <div class="panel-actions"></div>
          </div>
          <div class="panel-body">
            <input type="text" id="commentAuthor" placeholder="Your name (used when you pin a comment)" />
            <div class="comment-list" id="comment-list"></div>
          </div>
        </div>

        <div class="panel accent" id="annotations-panel">
          <div class="panel-header">
            <div class="panel-title-row"><span class="chevron">▾</span><h2>${ICON_IMAGE} Annotations <span class="panel-count" id="annotation-count"></span></h2></div>
            <div class="panel-actions"></div>
          </div>
          <div class="panel-body">
            <div class="annotation-grid" id="annotation-grid"></div>
          </div>
        </div>

        <div class="panel" id="error-panel">
          <div class="panel-header">
            <div class="panel-title-row"><span class="chevron">▾</span><h2>Error</h2></div>
            <div class="panel-actions">
              <button class="icon-btn tiny" id="copyErrorBtn" title="Copy error">${ICON_COPY}</button>
              <button class="icon-btn tiny" id="downloadErrorBtn" title="Download error as .txt">${ICON_DOWNLOAD}</button>
            </div>
          </div>
          <div class="panel-body pin-surface" id="error-pin-surface">
            <div id="error-message"></div>
            <div id="error-snippet"></div>
            <div class="pin-layer" id="error-pin-layer"></div>
          </div>
        </div>

        <div class="panel" id="steps-panel">
          <div class="panel-header">
            <div class="panel-title-row"><span class="chevron">▾</span><h2>Test steps</h2></div>
            <div class="panel-actions">
              <button class="icon-btn tiny" id="copyStepsBtn" title="Copy steps">${ICON_COPY}</button>
              <button class="icon-btn tiny" id="downloadStepsBtn" title="Download steps as .txt">${ICON_DOWNLOAD}</button>
            </div>
          </div>
          <div class="panel-body pin-surface" id="steps-pin-surface">
            <ul id="steps-list"></ul>
            <div class="pin-layer" id="steps-pin-layer"></div>
          </div>
        </div>

        <div class="panel" id="console-panel">
          <div class="panel-header">
            <div class="panel-title-row"><span class="chevron">▾</span><h2>Console output</h2></div>
            <div class="panel-actions"></div>
          </div>
          <div class="panel-body" id="console-box"></div>
        </div>
      </div>
    </div>
    <div id="controls" style="margin-top:12px; display:flex; gap:8px; flex-shrink:0;">
      <button class="icon-btn" id="prev" title="Previous test">◀</button>
      <button class="icon-btn" id="next" title="Next test">▶</button>
    </div>
  </main>
  <script type="application/json" id="tests-data">${data}</script>
  <script>
    const reportId = '${reportId}';
    const runStamp = ${JSON.stringify(runStamp)};
    const runDisplay = ${JSON.stringify(runDisplay)};
    const storagePrefix = ${JSON.stringify(storagePrefix)};
    const CHECK_ICON = ${JSON.stringify(ICON_CHECK)};
    const tests = JSON.parse(document.getElementById('tests-data').textContent);
    let index = 0;
    let drawing = false;
    let currentColor = '#ff3b30';
    let currentWidth = 4;
    let currentTool = 'pen';
    let isPointerDown = false;
    let lastX = 0, lastY = 0;
    let shapeStartPoint = null;
    let shapeSnapshot = null;
    const selectedTests = new Set();

    const listEl = document.getElementById('list');
    const videoEl = document.getElementById('player');
    const canvasEl = document.getElementById('annotate-canvas');
    const ctx = canvasEl.getContext('2d');
    const nowEl = document.getElementById('now');
    const prevBtn = document.getElementById('prev');
    const nextBtn = document.getElementById('next');
    const noVideoEl = document.getElementById('no-video');
    const errorPanel = document.getElementById('error-panel');
    const errorMessageEl = document.getElementById('error-message');
    const errorSnippetEl = document.getElementById('error-snippet');
    const detailsMeta = document.getElementById('details-meta');
    const stepsList = document.getElementById('steps-list');
    const consoleBox = document.getElementById('console-box');
    const annotateBtn = document.getElementById('annotateBtn');
    const resumeBtn = document.getElementById('resumeBtn');
    const drawTools = document.getElementById('drawTools');
    const clearBtn = document.getElementById('clearBtn');
    const downloadPngBtn = document.getElementById('downloadPngBtn');
    const downloadVideoBtn = document.getElementById('downloadVideoBtn');
    const widthRange = document.getElementById('widthRange');
    const copyNameBtn = document.getElementById('copyNameBtn');
    const copyPromptBtn = document.getElementById('copyPromptBtn');
    const copyErrorBtn = document.getElementById('copyErrorBtn');
    const downloadErrorBtn = document.getElementById('downloadErrorBtn');
    const copyStepsBtn = document.getElementById('copyStepsBtn');
    const downloadStepsBtn = document.getElementById('downloadStepsBtn');
    const exportBtn = document.getElementById('exportBtn');
    const commentListEl = document.getElementById('comment-list');
    const commentCountEl = document.getElementById('comment-count');
    const commentAuthor = document.getElementById('commentAuthor');
    const commentModeBtn = document.getElementById('commentModeBtn');
    const videoPinLayer = document.getElementById('video-pin-layer');
    const errorPinLayer = document.getElementById('error-pin-layer');
    const stepsPinLayer = document.getElementById('steps-pin-layer');
    const errorPinSurface = document.getElementById('error-pin-surface');
    const stepsPinSurface = document.getElementById('steps-pin-surface');
    const sidebarEl = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const detailsPanelEl = document.getElementById('details-panel');
    const detailsToggle = document.getElementById('detailsToggle');
    const saveAnnotationBtn = document.getElementById('saveAnnotationBtn');
    const annotationGrid = document.getElementById('annotation-grid');
    const annotationCountEl = document.getElementById('annotation-count');
    const shareCurrentBtn = document.getElementById('shareCurrentBtn');
    const shareSelectedBtn = document.getElementById('shareSelectedBtn');
    const clearSelectionBtn = document.getElementById('clearSelectionBtn');
    const selCountEl = document.getElementById('selCount');

    // --- small helpers ---
    function randomId() {
      if (window.crypto && crypto.randomUUID) { try { return crypto.randomUUID(); } catch (e) {} }
      return 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
    }
    function formatDuration(ms) {
      if (ms < 1000) return ms + 'ms';
      return (ms / 1000).toFixed(1) + 's';
    }
    function slug(s) {
      return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    }
    function fileBase(i) {
      return runStamp + '_test' + String(i + 1).padStart(2, '0') + '_' + slug(tests[i].title);
    }
    function copyText(text, btn) {
      navigator.clipboard.writeText(text).then(() => {
        if (btn) {
          const original = btn.innerHTML;
          const originalTitle = btn.title;
          btn.innerHTML = CHECK_ICON;
          btn.title = 'Copied!';
          setTimeout(() => { btn.innerHTML = original; btn.title = originalTitle; }, 1200);
        }
      }).catch(() => { prompt('Copy this:', text); });
    }
    function timeAgo(iso) {
      const diffMs = Date.now() - new Date(iso).getTime();
      const s = Math.floor(diffMs / 1000);
      if (s < 60) return 'just now';
      const m = Math.floor(s / 60);
      if (m < 60) return m + 'm ago';
      const h = Math.floor(m / 60);
      if (h < 24) return h + 'h ago';
      const d = Math.floor(h / 24);
      if (d < 7) return d + 'd ago';
      return new Date(iso).toLocaleDateString();
    }
    function avatarColor(name) {
      const colors = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#34d399', '#22d3ee', '#60a5fa', '#a78bfa', '#f472b6'];
      let hash = 0;
      for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
      return colors[Math.abs(hash) % colors.length];
    }
    function initials(name) {
      const parts = name.trim().split(/\\s+/).filter(Boolean);
      if (!parts.length) return '?';
      return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
    }
    function downloadText(text, filename, mime) {
      const blob = new Blob([text], { type: mime || 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
    }
    function stepsToText(steps, depth) {
      depth = depth || 0;
      let out = '';
      (steps || []).forEach((s) => {
        out += '  '.repeat(depth) + (s.error ? '[FAIL] ' : '[OK] ') + s.title + ' (' + s.category + ', ' + formatDuration(s.durationMs) + ')\\n';
        if (s.error) out += '  '.repeat(depth + 1) + 'Error: ' + s.error + '\\n';
        if (s.children && s.children.length) out += stepsToText(s.children, depth + 1);
      });
      return out;
    }
    function buildErrorPrompt(t) {
      let out = 'Playwright test: ' + t.title + '\\n';
      out += 'Run: ' + runDisplay + '\\n';
      out += 'Status: ' + t.status + ' (duration ' + formatDuration(t.duration) + (t.retry ? ', retry #' + t.retry : '') + ')\\n\\n';
      if (t.errorText) out += 'Error:\\n' + t.errorText + '\\n\\n';
      if (t.errorSnippet) out += 'Code:\\n' + t.errorSnippet + '\\n\\n';
      out += 'Please help me understand why this Playwright test failed and how to fix it.';
      return out;
    }

    // --- collapsible panels ---
    document.querySelectorAll('.panel-header').forEach((header) => {
      header.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        header.closest('.panel').classList.toggle('collapsed');
      });
    });

    // --- collapsible columns (test list / details panel) ---
    sidebarToggle.addEventListener('click', () => {
      const collapsed = sidebarEl.classList.toggle('collapsed');
      sidebarToggle.textContent = collapsed ? '»' : '«';
      sidebarToggle.title = collapsed ? 'Expand test list' : 'Collapse test list';
    });
    detailsToggle.addEventListener('click', () => {
      const collapsed = detailsPanelEl.classList.toggle('collapsed');
      detailsToggle.textContent = collapsed ? '«' : '»';
      detailsToggle.title = collapsed ? 'Expand details panel' : 'Collapse details panel';
    });

    // --- sidebar list ---
    function buildListItem(t, i) {
      const li = document.createElement('li');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'list-checkbox';
      checkbox.title = 'Select for sharing';
      checkbox.checked = selectedTests.has(i);
      checkbox.addEventListener('click', (e) => e.stopPropagation());
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) selectedTests.add(i); else selectedTests.delete(i);
        updateSelectionBar();
      });
      const badge = document.createElement('span');
      badge.className = 'badge ' + t.status;
      badge.textContent = t.status;
      const label = document.createElement('span');
      label.className = 'title-text';
      label.textContent = t.title;
      li.appendChild(checkbox);
      li.appendChild(badge);
      li.appendChild(label);
      const commentBadge = document.createElement('span');
      commentBadge.className = 'comment-count-badge';
      commentBadge.style.display = 'none';
      li.appendChild(commentBadge);
      li.title = t.title;
      li.addEventListener('click', () => selectTest(i));
      return li;
    }
    function updateListCommentBadge(i) {
      const li = listEl.children[i];
      if (!li) return;
      const el = li.querySelector('.comment-count-badge');
      if (!el) return;
      const nComments = (tests[i].comments || []).length;
      const nAnnotations = (tests[i].annotations || []).length;
      const parts = [];
      if (nComments > 0) parts.push('💬 ' + nComments);
      if (nAnnotations > 0) parts.push('📷 ' + nAnnotations);
      if (parts.length) {
        el.style.display = '';
        el.textContent = parts.join(' ');
      } else {
        el.style.display = 'none';
      }
    }
    tests.forEach((t, i) => {
      listEl.appendChild(buildListItem(t, i));
      updateListCommentBadge(i);
    });

    document.querySelectorAll('.swatch').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.swatch').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        currentColor = btn.dataset.color;
      });
    });
    widthRange.addEventListener('input', () => { currentWidth = Number(widthRange.value); });

    document.querySelectorAll('.tool-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tool-btn').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        currentTool = btn.dataset.tool;
      });
    });

    function selectTest(i) {
      exitDrawMode();
      index = Math.max(0, Math.min(tests.length - 1, i));
      const t = tests[index];

      [...listEl.children].forEach((li, i2) => li.classList.toggle('active', i2 === index));
      nowEl.textContent = 'Test ' + (index + 1) + ' / ' + tests.length + ': ' + t.title + ' (' + t.status + ')';
      prevBtn.disabled = index === 0;
      nextBtn.disabled = index === tests.length - 1;

      if (t.video) {
        videoEl.style.display = '';
        noVideoEl.style.display = 'none';
        annotateBtn.style.display = '';
        downloadVideoBtn.style.display = '';
        videoEl.src = t.video;
        videoEl.play().catch(() => {});
      } else {
        videoEl.style.display = 'none';
        videoEl.removeAttribute('src');
        noVideoEl.style.display = '';
        annotateBtn.style.display = 'none';
        downloadVideoBtn.style.display = 'none';
      }

      if (t.errorHtml) {
        errorPanel.style.display = '';
        errorMessageEl.innerHTML = t.errorHtml;
        errorSnippetEl.innerHTML = '';
        if (t.errorSnippet) {
          t.errorSnippet.split('\\n').forEach((line) => {
            const div = document.createElement('div');
            div.className = 'line' + (/^>/.test(line) ? ' error-line' : '');
            div.textContent = line;
            errorSnippetEl.appendChild(div);
          });
        }
      } else {
        errorPanel.style.display = 'none';
        errorMessageEl.innerHTML = '';
        errorSnippetEl.innerHTML = '';
      }

      detailsMeta.innerHTML = '';
      const durSpan = document.createElement('span');
      durSpan.textContent = 'Duration: ' + formatDuration(t.duration);
      detailsMeta.appendChild(durSpan);
      if (t.retry > 0) {
        const retrySpan = document.createElement('span');
        retrySpan.textContent = 'Retry #' + t.retry;
        detailsMeta.appendChild(retrySpan);
      }

      stepsList.innerHTML = '';
      if (t.steps && t.steps.length) {
        t.steps.forEach((s) => stepsList.appendChild(renderStep(s)));
      } else {
        const li = document.createElement('li');
        li.className = 'empty-hint';
        li.textContent = 'No recorded steps for this test.';
        stepsList.appendChild(li);
      }

      consoleBox.innerHTML = '';
      if (t.stdout) consoleBox.appendChild(consoleBlock('stdout', t.stdout));
      if (t.stderr) consoleBox.appendChild(consoleBlock('stderr', t.stderr));
      if (!t.stdout && !t.stderr) {
        const div = document.createElement('div');
        div.className = 'empty-hint';
        div.textContent = 'No console output for this test.';
        consoleBox.appendChild(div);
      }

      closeAllPinPopovers();
      renderPins('video');
      renderPins('error');
      renderPins('steps');
      renderCommentsList();
      renderAnnotations();
    }

    function consoleBlock(label, text) {
      const wrap = document.createElement('div');
      const h3 = document.createElement('h3');
      h3.textContent = label;
      const pre = document.createElement('pre');
      pre.textContent = text;
      wrap.appendChild(h3);
      wrap.appendChild(pre);
      return wrap;
    }

    function renderStep(step) {
      const li = document.createElement('li');
      const row = document.createElement('div');
      row.className = 'step-row';

      const icon = document.createElement('span');
      icon.className = 'step-icon ' + (step.error ? 'err' : 'ok');
      icon.textContent = step.error ? '✗' : '✓';

      const title = document.createElement('span');
      title.className = 'step-title';
      title.textContent = step.title;

      const category = document.createElement('span');
      category.className = 'step-category';
      category.textContent = step.category;

      const duration = document.createElement('span');
      duration.className = 'step-duration';
      duration.textContent = formatDuration(step.durationMs);

      row.appendChild(icon);
      row.appendChild(title);
      row.appendChild(category);
      row.appendChild(duration);
      li.appendChild(row);

      if (step.error) {
        const err = document.createElement('div');
        err.className = 'step-error';
        err.textContent = step.error;
        li.appendChild(err);
      }

      if (step.children && step.children.length) {
        const ul = document.createElement('ul');
        step.children.forEach((child) => ul.appendChild(renderStep(child)));
        li.appendChild(ul);
      }

      return li;
    }

    videoEl.addEventListener('ended', () => {
      if (index < tests.length - 1) selectTest(index + 1);
    });
    prevBtn.addEventListener('click', () => selectTest(index - 1));
    nextBtn.addEventListener('click', () => selectTest(index + 1));

    // --- copy / export actions ---
    copyNameBtn.addEventListener('click', () => copyText(tests[index].title, copyNameBtn));
    copyPromptBtn.addEventListener('click', () => copyText(buildErrorPrompt(tests[index]), copyPromptBtn));
    copyErrorBtn.addEventListener('click', () => {
      const t = tests[index];
      copyText((t.errorText || '') + (t.errorSnippet ? '\\n\\n' + t.errorSnippet : ''), copyErrorBtn);
    });
    downloadErrorBtn.addEventListener('click', () => {
      const t = tests[index];
      downloadText((t.errorText || '') + (t.errorSnippet ? '\\n\\n' + t.errorSnippet : ''), fileBase(index) + '_error.txt');
    });
    copyStepsBtn.addEventListener('click', () => copyText(stepsToText(tests[index].steps), copyStepsBtn));
    downloadStepsBtn.addEventListener('click', () => downloadText(stepsToText(tests[index].steps), fileBase(index) + '_steps.txt'));

    downloadVideoBtn.addEventListener('click', () => {
      const t = tests[index];
      if (!t.video) return;
      const a = document.createElement('a');
      a.href = t.video;
      a.download = fileBase(index) + '.webm';
      a.click();
    });

    // --- comments ---
    function loadComments() {
      try {
        const saved = localStorage.getItem(storagePrefix + '-comments-' + reportId);
        if (saved) {
          const savedComments = JSON.parse(saved);
          tests.forEach((t, i) => { if (savedComments[i]) t.comments = savedComments[i]; });
        }
        const author = localStorage.getItem(storagePrefix + '-comment-author');
        if (author) commentAuthor.value = author;
      } catch (e) {}
    }
    function syncTestsDataScript() {
      document.getElementById('tests-data').textContent = JSON.stringify(tests);
    }
    function saveComments() {
      try {
        localStorage.setItem(storagePrefix + '-comments-' + reportId, JSON.stringify(tests.map((t) => t.comments)));
      } catch (e) {}
      syncTestsDataScript();
    }
    function currentAuthor() {
      const author = commentAuthor.value.trim() || 'Anonymous';
      try { localStorage.setItem(storagePrefix + '-comment-author', author); } catch (e) {}
      return author;
    }

    // --- pinned comments: placement, rendering, popovers ---
    let commentMode = false;
    let openPopoverEl = null;
    const PIN_SURFACES = [
      { target: 'video', container: document.getElementById('stage'), layer: videoPinLayer },
      { target: 'error', container: errorPinSurface, layer: errorPinLayer },
      { target: 'steps', container: stepsPinSurface, layer: stepsPinLayer },
    ];

    function toggleCommentMode(force) {
      commentMode = typeof force === 'boolean' ? force : !commentMode;
      commentModeBtn.classList.toggle('active-tool', commentMode);
      commentModeBtn.title = commentMode
        ? 'Comment mode on — click anywhere to pin a comment (Esc to exit)'
        : 'Add a comment — click anywhere on the video, error, or steps to pin it';
      PIN_SURFACES.forEach((s) => s.container && s.container.classList.toggle('comment-mode-active', commentMode));
    }
    commentModeBtn.addEventListener('click', () => toggleCommentMode());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { toggleCommentMode(false); closeAllPinPopovers(); }
    });

    PIN_SURFACES.forEach(({ target, container }) => {
      if (!container) return;
      container.addEventListener('click', (e) => {
        if (!commentMode) return;
        if (e.target.closest('.pin') || e.target.closest('.pin-popover')) return;
        e.stopPropagation();
        const rect = container.getBoundingClientRect();
        const xPct = ((e.clientX - rect.left) / rect.width) * 100;
        const yPct = ((e.clientY - rect.top) / rect.height) * 100;
        closeAllPinPopovers();
        openNewPinPopover(target, container, xPct, yPct);
      });
    });

    function closeAllPinPopovers() {
      document.querySelectorAll('.pin-popover').forEach((el) => el.remove());
      document.querySelectorAll('.pin.new-pin-pending').forEach((el) => el.remove());
      openPopoverEl = null;
    }
    document.addEventListener('click', (e) => {
      if (openPopoverEl && !e.target.closest('.pin-popover') && !e.target.closest('.pin')) closeAllPinPopovers();
    });

    function positionPopoverNear(anchorRect, popoverEl) {
      document.body.appendChild(popoverEl);
      const margin = 10;
      let left = anchorRect.left;
      let top = anchorRect.bottom + 6;
      const w = 240;
      if (left + w + margin > window.innerWidth) left = window.innerWidth - w - margin;
      if (left < margin) left = margin;
      popoverEl.style.left = left + 'px';
      popoverEl.style.top = top + 'px';
      if (top + 160 > window.innerHeight) popoverEl.style.top = (anchorRect.top - 6) + 'px', popoverEl.style.transform = 'translateY(-100%)';
    }

    function openNewPinPopover(target, container, xPct, yPct) {
      const pin = document.createElement('div');
      pin.className = 'pin new-pin-pending';
      pin.style.left = xPct + '%';
      pin.style.top = yPct + '%';
      pin.style.background = avatarColor(commentAuthor.value.trim() || 'Anonymous');
      pin.innerHTML = '<span class="pin-inner">' + initials(commentAuthor.value.trim() || '?') + '</span>';
      PIN_SURFACES.find((s) => s.target === target).layer.appendChild(pin);
      const anchorRect = pin.getBoundingClientRect();

      const pop = document.createElement('div');
      pop.className = 'pin-popover';
      pop.innerHTML =
        '<div class="pin-popover-header"><strong style="color:#bcd7ff; font-size:11px; text-transform:uppercase;">New comment on ' + target + '</strong></div>' +
        '<textarea placeholder="What\\'s the issue here?"></textarea>' +
        '<div class="pin-popover-actions"><button class="small pin-cancel">Cancel</button><button class="small pin-post">Post</button></div>';
      positionPopoverNear(anchorRect, pop);
      openPopoverEl = pop;
      const textarea = pop.querySelector('textarea');
      textarea.focus();

      function cancel() { pin.remove(); pop.remove(); openPopoverEl = null; }
      pop.querySelector('.pin-cancel').addEventListener('click', (e) => { e.stopPropagation(); cancel(); });
      pop.querySelector('.pin-post').addEventListener('click', (e) => {
        e.stopPropagation();
        const text = textarea.value.trim();
        if (!text) { cancel(); return; }
        const author = currentAuthor();
        if (!tests[index].comments) tests[index].comments = [];
        tests[index].comments.push({ id: randomId(), author, text, target, x: xPct, y: yPct, createdAt: new Date().toISOString() });
        pop.remove();
        openPopoverEl = null;
        saveComments();
        renderPins(target);
        renderCommentsList();
        updateListCommentBadge(index);
      });
      textarea.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); pop.querySelector('.pin-post').click(); }
        e.stopPropagation();
      });
      pop.addEventListener('click', (e) => e.stopPropagation());
    }

    function openExistingPinPopover(comment, pinEl) {
      closeAllPinPopovers();
      const pop = document.createElement('div');
      pop.className = 'pin-popover';
      pop.innerHTML =
        '<div class="pin-popover-header">' +
        '<div class="comment-avatar" style="background:' + avatarColor(comment.author) + '">' + initials(comment.author) + '</div>' +
        '<div style="flex:1; min-width:0;"><div class="comment-author">' + escapeHtml(comment.author) + '</div>' +
        '<div style="color:#888; font-size:10px;" title="' + new Date(comment.createdAt).toLocaleString() + '">' + timeAgo(comment.createdAt) + '</div></div>' +
        '<button class="icon-btn tiny ghost pin-delete" title="Delete comment">${ICON_TRASH}</button>' +
        '</div>' +
        '<div class="comment-body"></div>';
      pop.querySelector('.comment-body').textContent = comment.text;
      const anchorRect = pinEl.getBoundingClientRect();
      positionPopoverNear(anchorRect, pop);
      openPopoverEl = pop;
      pop.querySelector('.pin-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        if (!confirm('Delete this comment?')) return;
        tests[index].comments = (tests[index].comments || []).filter((c) => c.id !== comment.id);
        saveComments();
        renderPins(comment.target);
        renderCommentsList();
        updateListCommentBadge(index);
        closeAllPinPopovers();
      });
      pop.addEventListener('click', (e) => e.stopPropagation());
    }

    function escapeHtml(s) {
      const d = document.createElement('div');
      d.textContent = s;
      return d.innerHTML;
    }

    function renderPins(target) {
      const surface = PIN_SURFACES.find((s) => s.target === target);
      if (!surface) return;
      surface.layer.innerHTML = '';
      const comments = (tests[index].comments || []).filter((c) => c.target === target);
      comments.forEach((c) => {
        const pin = document.createElement('div');
        pin.className = 'pin';
        pin.style.left = c.x + '%';
        pin.style.top = c.y + '%';
        pin.style.background = avatarColor(c.author);
        pin.dataset.commentId = c.id;
        pin.title = c.author + ': ' + c.text.slice(0, 60);
        pin.innerHTML = '<span class="pin-inner">' + initials(c.author) + '</span>';
        pin.addEventListener('click', (e) => {
          e.stopPropagation();
          if (openPopoverEl && openPopoverEl.dataset.forComment === c.id) { closeAllPinPopovers(); return; }
          openExistingPinPopover(c, pin);
          if (openPopoverEl) openPopoverEl.dataset.forComment = c.id;
        });
        surface.layer.appendChild(pin);
      });
    }

    function jumpToPin(comment) {
      const targetPanelId = comment.target === 'video' ? null : comment.target + '-panel';
      if (targetPanelId) {
        const panel = document.getElementById(targetPanelId);
        if (panel) panel.classList.remove('collapsed');
      }
      requestAnimationFrame(() => {
        const surface = PIN_SURFACES.find((s) => s.target === comment.target);
        if (!surface) return;
        surface.container.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const pin = surface.layer.querySelector('[data-comment-id="' + comment.id + '"]');
        if (pin) {
          setTimeout(() => openExistingPinPopover(comment, pin), 250);
        }
      });
    }

    function renderCommentsList() {
      commentListEl.innerHTML = '';
      const comments = (tests[index].comments || []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      commentCountEl.textContent = comments.length ? '(' + comments.length + ')' : '';
      if (!comments.length) {
        const div = document.createElement('div');
        div.className = 'empty-hint';
        div.textContent = '💬 No comments yet — click the comment button next to Annotate, then click on the video, error, or steps to pin one.';
        commentListEl.appendChild(div);
        return;
      }
      comments.forEach((c) => {
        const div = document.createElement('div');
        div.className = 'comment';

        const avatar = document.createElement('div');
        avatar.className = 'comment-avatar';
        avatar.style.background = avatarColor(c.author);
        avatar.textContent = initials(c.author);

        const mainCol = document.createElement('div');
        mainCol.className = 'comment-main';

        const meta = document.createElement('div');
        meta.className = 'comment-meta';
        const badge = document.createElement('span');
        badge.className = 'comment-target-badge jump ' + c.target;
        badge.textContent = c.target;
        badge.title = 'Jump to this comment';
        badge.addEventListener('click', () => jumpToPin(c));
        const who = document.createElement('span');
        who.className = 'comment-author';
        who.textContent = c.author;
        const when = document.createElement('span');
        when.textContent = timeAgo(c.createdAt);
        when.title = new Date(c.createdAt).toLocaleString();
        meta.appendChild(badge);
        meta.appendChild(who);
        meta.appendChild(when);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'icon-btn tiny ghost comment-delete';
        deleteBtn.title = 'Delete comment';
        deleteBtn.innerHTML = ${JSON.stringify(ICON_TRASH)};
        deleteBtn.addEventListener('click', () => {
          if (!confirm('Delete this comment?')) return;
          tests[index].comments = (tests[index].comments || []).filter((x) => x.id !== c.id);
          saveComments();
          renderPins(c.target);
          renderCommentsList();
          updateListCommentBadge(index);
        });
        meta.appendChild(deleteBtn);

        const body = document.createElement('div');
        body.className = 'comment-body';
        body.textContent = c.text;

        mainCol.appendChild(meta);
        mainCol.appendChild(body);
        div.appendChild(avatar);
        div.appendChild(mainCol);
        commentListEl.appendChild(div);
      });
    }

    loadComments();
    tests.forEach((t, i) => updateListCommentBadge(i));

    // --- export a standalone copy with comments baked in ---
    exportBtn.addEventListener('click', () => {
      exportTests(tests.map((_, i) => i), runStamp + '_with-comments.html');
    });

    // --- annotation mode ---
    function enterDrawMode() {
      if (!tests[index].video) return;
      videoEl.pause();
      drawing = true;

      const rect = videoEl.getBoundingClientRect();
      const stageRect = document.getElementById('stage').getBoundingClientRect();
      canvasEl.style.left = (rect.left - stageRect.left) + 'px';
      canvasEl.style.top = (rect.top - stageRect.top) + 'px';
      canvasEl.style.width = rect.width + 'px';
      canvasEl.style.height = rect.height + 'px';
      canvasEl.width = videoEl.videoWidth || rect.width;
      canvasEl.height = videoEl.videoHeight || rect.height;

      ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
      canvasEl.style.display = 'block';
      videoEl.style.visibility = 'hidden';

      annotateBtn.style.display = 'none';
      resumeBtn.style.display = '';
      drawTools.style.display = 'inline-flex';
    }

    function exitDrawMode() {
      drawing = false;
      canvasEl.style.display = 'none';
      videoEl.style.visibility = 'visible';
      annotateBtn.style.display = tests[index] && tests[index].video ? '' : 'none';
      resumeBtn.style.display = 'none';
      drawTools.style.display = 'none';
    }

    annotateBtn.addEventListener('click', enterDrawMode);
    resumeBtn.addEventListener('click', exitDrawMode);
    clearBtn.addEventListener('click', () => {
      ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
    });

    function canvasPoint(e) {
      const rect = canvasEl.getBoundingClientRect();
      const scaleX = canvasEl.width / rect.width;
      const scaleY = canvasEl.height / rect.height;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    }

    canvasEl.addEventListener('pointerdown', (e) => {
      if (!drawing) return;
      isPointerDown = true;
      const p = canvasPoint(e);
      lastX = p.x; lastY = p.y;
      if (currentTool !== 'pen') {
        shapeStartPoint = p;
        shapeSnapshot = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
      }
    });
    canvasEl.addEventListener('pointermove', (e) => {
      if (!drawing || !isPointerDown) return;
      const p = canvasPoint(e);
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = currentWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (currentTool === 'pen') {
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        lastX = p.x; lastY = p.y;
      } else if (shapeSnapshot) {
        ctx.putImageData(shapeSnapshot, 0, 0);
        ctx.beginPath();
        if (currentTool === 'rect') {
          ctx.strokeRect(shapeStartPoint.x, shapeStartPoint.y, p.x - shapeStartPoint.x, p.y - shapeStartPoint.y);
        } else if (currentTool === 'circle') {
          const rx = Math.abs(p.x - shapeStartPoint.x) / 2;
          const ry = Math.abs(p.y - shapeStartPoint.y) / 2;
          const cx = (p.x + shapeStartPoint.x) / 2;
          const cy = (p.y + shapeStartPoint.y) / 2;
          ctx.ellipse(cx, cy, Math.max(rx, 0.1), Math.max(ry, 0.1), 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    });
    window.addEventListener('pointerup', () => {
      isPointerDown = false;
      shapeSnapshot = null;
      shapeStartPoint = null;
    });

    downloadPngBtn.addEventListener('click', () => {
      const a = document.createElement('a');
      a.download = fileBase(index) + '_annotated.png';
      a.href = canvasEl.toDataURL('image/png');
      a.click();
    });

    // --- saved annotations gallery ---
    saveAnnotationBtn.addEventListener('click', () => {
      const dataUrl = canvasEl.toDataURL('image/png');
      const author = currentAuthor();
      if (!tests[index].annotations) tests[index].annotations = [];
      tests[index].annotations.push({ id: randomId(), author, dataUrl, createdAt: new Date().toISOString() });
      saveComments();
      renderAnnotations();
      updateListCommentBadge(index);
      const original = saveAnnotationBtn.innerHTML;
      saveAnnotationBtn.innerHTML = CHECK_ICON;
      setTimeout(() => { saveAnnotationBtn.innerHTML = original; }, 1200);
    });

    function renderAnnotations() {
      annotationGrid.innerHTML = '';
      const annotations = tests[index].annotations || [];
      annotationCountEl.textContent = annotations.length ? '(' + annotations.length + ')' : '';
      if (!annotations.length) {
        const div = document.createElement('div');
        div.className = 'empty-hint';
        div.textContent = '📷 No saved annotations yet — draw on the video, then hit Save.';
        annotationGrid.appendChild(div);
        return;
      }
      annotations.forEach((a) => {
        const thumb = document.createElement('div');
        thumb.className = 'annotation-thumb';
        const img = document.createElement('img');
        img.src = a.dataUrl;
        img.loading = 'lazy';
        thumb.appendChild(img);

        const meta = document.createElement('div');
        meta.className = 'annotation-meta';
        meta.textContent = a.author + ' · ' + timeAgo(a.createdAt);
        thumb.appendChild(meta);

        const del = document.createElement('button');
        del.className = 'icon-btn tiny annotation-delete';
        del.title = 'Delete annotation';
        del.innerHTML = ${JSON.stringify(ICON_TRASH)};
        del.addEventListener('click', (e) => {
          e.stopPropagation();
          if (!confirm('Delete this saved annotation?')) return;
          tests[index].annotations = (tests[index].annotations || []).filter((x) => x.id !== a.id);
          saveComments();
          renderAnnotations();
          updateListCommentBadge(index);
        });
        thumb.appendChild(del);

        thumb.addEventListener('click', () => openAnnotationLightbox(a));
        annotationGrid.appendChild(thumb);
      });
    }

    function openAnnotationLightbox(a) {
      const overlay = document.createElement('div');
      overlay.className = 'annotation-lightbox';
      const img = document.createElement('img');
      img.src = a.dataUrl;
      const caption = document.createElement('div');
      caption.className = 'lightbox-caption';
      caption.textContent = a.author + ' · ' + new Date(a.createdAt).toLocaleString();
      const closeBtn = document.createElement('button');
      closeBtn.className = 'icon-btn lightbox-close';
      closeBtn.innerHTML = ${JSON.stringify(ICON_CLOSE)};
      overlay.appendChild(img);
      overlay.appendChild(caption);
      overlay.appendChild(closeBtn);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay || e.target.closest('.lightbox-close')) overlay.remove();
      });
      document.addEventListener('keydown', function onEsc(e) {
        if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onEsc); }
      });
      document.body.appendChild(overlay);
    }

    // --- share one test / selected tests ---
    function updateSelectionBar() {
      const n = selectedTests.size;
      selCountEl.textContent = n > 0 ? n + ' test' + (n === 1 ? '' : 's') + ' selected' : 'Check tests to share a subset';
      shareSelectedBtn.disabled = n === 0;
    }
    shareSelectedBtn.addEventListener('click', () => {
      if (selectedTests.size === 0) return;
      const indices = [...selectedTests].sort((a, b) => a - b);
      exportTests(indices, runStamp + '_' + indices.length + '-tests_shared.html');
    });
    clearSelectionBtn.addEventListener('click', () => {
      selectedTests.clear();
      document.querySelectorAll('.list-checkbox').forEach((cb) => { cb.checked = false; });
      updateSelectionBar();
    });
    shareCurrentBtn.addEventListener('click', () => {
      exportTests([index], fileBase(index) + '_shared.html');
    });

    function exportTests(indices, filename) {
      exitDrawMode();
      toggleCommentMode(false);
      closeAllPinPopovers();

      const fullBackup = tests.slice();
      const savedIndex = index;
      const filtered = indices.map((i) => tests[i]);

      function renderSet(arr, selectIdx) {
        tests.length = 0;
        tests.push(...arr);
        document.getElementById('tests-data').textContent = JSON.stringify(tests);
        listEl.innerHTML = '';
        tests.forEach((t, i) => {
          listEl.appendChild(buildListItem(t, i));
          updateListCommentBadge(i);
        });
        selectTest(selectIdx);
      }

      renderSet(filtered, 0);

      // The reopened file's own bootstrap script repopulates #list from
      // tests-data — leave it empty in the serialized DOM or it duplicates.
      listEl.innerHTML = '';

      const savedSrc = videoEl.getAttribute('src');
      videoEl.removeAttribute('src');

      let html = '<!DOCTYPE html>\\n' + document.documentElement.outerHTML;
      html = html.split(reportId).join(randomId());

      if (savedSrc) videoEl.setAttribute('src', savedSrc);
      renderSet(fullBackup, Math.min(savedIndex, fullBackup.length - 1));

      downloadText(html, filename, 'text/html');
    }

    selectTest(0);
    updateSelectionBar();
  </script>
</body>
</html>
`;
}
