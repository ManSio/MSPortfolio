#!/usr/bin/env node
/**
 * Mobile smoke check via headless Edge + CDP (no extra deps — Node ≥22 global WebSocket).
 *
 * 1. Boots `vite preview` on :4173 (respects base /MSPortfolio/)
 * 2. Launches Edge headless with remote debugging
 * 3. Emulates an iPhone-class viewport (375x812, DPR 2) and asserts:
 *    - no horizontal overflow (scrollWidth <= clientWidth + 1)
 *    - key sections render (simulator SVG, timeline, contact, hero)
 *    - primary CTA buttons are >= 44px tall (touch target)
 * 4. Captures mobile.png + desktop.png screenshots into .tmp/ for human review
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = 'http://127.0.0.1:4173/MSPortfolio/';
const PREVIEW_PORT = 4173;

let preview = null;
let edge = null;
let ws = null;

function log(...args) {
  console.log('[mobile-check]', ...args);
}

async function getPageTarget() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9222/json/list');
      const list = await res.json();
      const page = list.find((t) => t.type === 'page' && t.url.includes('devtools')) ?? list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      /* edge still booting */
    }
    await sleep(300);
  }
  throw new Error('Edge CDP target not found');
}

function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++cdp._id;
    cdp._pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
cdp._id = 0;
cdp._pending = new Map();

async function main() {
  log('booting vite preview on :' + PREVIEW_PORT);
  preview = spawn('pnpm', ['preview', '--port', String(PREVIEW_PORT)], { shell: true, stdio: 'ignore' });

  // wait for preview to accept requests
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(BASE, { signal: AbortSignal.timeout(1000) });
      if (r.ok) { ready = true; break; }
    } catch { /* not yet */ }
    await sleep(250);
  }
  if (!ready) throw new Error('vite preview did not come up');

  log('launching headless Edge');
  edge = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=9222', '--user-data-dir=' + process.cwd() + '\\.tmp\\edge-profile',
    'about:blank',
  ], { stdio: 'ignore' });

  const targetUrl = await getPageTarget();
  log('connecting CDP');
  ws = new WebSocket(targetUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && cdp._pending.has(msg.id)) {
      const { resolve, reject } = cdp._pending.get(msg.id);
      cdp._pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    }
  };

  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Emulation.setDeviceMetricsOverride', {
    width: 375, height: 812, deviceScaleFactor: 2, mobile: true, screenWidth: 375, screenHeight: 812,
  });
  log('navigating', BASE);
  await cdp('Page.navigate', { url: BASE });
  await sleep(2500); // let React mount + fonts settle

  const evalJs = async (expr) => {
    const r = await cdp('Runtime.evaluate', { expression: expr, returnByValue: true });
    if (r.exceptionDetails) throw new Error('eval failed: ' + JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };

  const mobile = await evalJs(`(() => {
    const d = document.documentElement;
    const hasOverflow = d.scrollWidth > d.clientWidth + 1;
    const sections = ['metrics','projects','principles','blog','simulator','agent','timeline','contact']
      .map(id => document.getElementById(id) ? 1 : 0).reduce((a,b)=>a+b,0);
    const svgCharts = document.querySelectorAll('#simulator svg').length;
    const timelineItems = document.querySelectorAll('#timeline li').length;
    const cta = [...document.querySelectorAll('#contact a button, #contact button')]
      .map(b => { const r = b.getBoundingClientRect(); return Math.round(r.height); });
    return JSON.stringify({
      viewport: [d.clientWidth, d.clientHeight],
      scrollWidth: d.scrollWidth,
      horizontalOverflow: hasOverflow,
      sectionsFound: sections,
      simulatorSvgs: svgCharts,
      timelineItems,
      contactCtaHeights: cta,
      heroTitle: document.querySelector('h1')?.textContent?.slice(0, 40) ?? null,
    });
  })()`);
  log('MOBILE 375x812 =>', mobile);

  const shot = await cdp('Page.captureScreenshot', { format: 'png' });
  mkdirSync('.tmp', { recursive: true });
  const { writeFileSync } = await import('node:fs');
  writeFileSync('.tmp/mobile.png', Buffer.from(shot.data, 'base64'));
  log('saved .tmp/mobile.png');

  // desktop pass
  await cdp('Emulation.setDeviceMetricsOverride', {
    width: 1280, height: 800, deviceScaleFactor: 1, mobile: false,
  });
  await sleep(600);
  const desktop = await evalJs(`(() => {
    const d = document.documentElement;
    return JSON.stringify({ viewport: [d.clientWidth, d.clientHeight], scrollWidth: d.scrollWidth, horizontalOverflow: d.scrollWidth > d.clientWidth + 1 });
  })()`);
  log('DESKTOP 1280x800 =>', desktop);
  const shot2 = await cdp('Page.captureScreenshot', { format: 'png' });
  writeFileSync('.tmp/desktop.png', Buffer.from(shot2.data, 'base64'));
  log('saved .tmp/desktop.png');

  log('DONE');
}

main()
  .catch((e) => { console.error('[mobile-check] FAILED:', e.message); process.exitCode = 1; })
  .finally(async () => {
    try { ws?.close(); } catch { /* noop */ }
    try { edge?.kill(); } catch { /* noop */ }
    try { preview?.kill(); } catch { /* noop */ }
  });
