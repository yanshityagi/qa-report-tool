# qa-report-tool

A reusable [Playwright](https://playwright.dev) reporter that turns any app's e2e test run into a single, shareable HTML report — with every test's video embedded, a frame-annotation tool, pinned comments, and a run-history index. No server, no third-party upload: the whole thing is one self-contained `.html` file per run.

This started as part of a single app's test repo and was pulled out here so it can be pointed at any app's Playwright suite, independently of that app's test cases.

## What it does

- After a run, writes `reports/run-<timestamp>.html`: a standalone report with sidebar test list, embedded per-test video, error/step/console panels, frame annotation (draw on a paused video frame, export as PNG), and pinned comments.
- Writes/updates `reports/index.html`: a run-history index across every run in that directory.
- Copies Playwright's own HTML report (trace viewer, attachments) alongside each run's report so it isn't overwritten by the next run.

## Install

In the app repo that owns the test cases:

```bash
npm install github:yanshityagi/qa-report-tool
```

## Use

In that app's `playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['qa-report-tool', { appName: 'My App E2E', outputDir: 'reports' }],
  ],
  // ...rest of your config
});
```

### Options

| Option      | Default    | Description                                                        |
| ----------- | ---------- | -------------------------------------------------------------------- |
| `appName`   | `"QA"`     | Shown in report titles/headers (e.g. `"Mobile E2E"`).            |
| `outputDir` | `"reports"`| Directory (relative to cwd) reports are written to.                  |

### Prerequisite: turn on video capture

This reporter only *embeds* video that Playwright itself already recorded — it does not record video on its own. If your report shows "No video recorded for this test" for every test, your app's `playwright.config.ts` is missing video capture. Add it under `use:`:

```ts
use: {
  video: 'on', // or 'retain-on-failure' to only keep video for failed tests
  // ...
},
```

## Develop

```bash
npm install
npm run build   # compiles src/ -> dist/
```

The `prepare` script runs the build automatically when this package is installed as a git dependency, so consumers never need to build it themselves.
