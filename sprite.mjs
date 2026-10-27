#!/usr/bin/env node
/**
 * Builds src/sprite.html — one <symbol> per asset, so icons can be dropped in
 * with <use href="#i-name"> and coloured from CSS.
 *
 * Line icons are drawn on a 16px grid but exported trimmed to their bounding
 * box, which would make their stroke weights differ once scaled to a common
 * size. `box` restores the 16px grid and `shift` re-centres the artwork on it.
 *
 * Run directly, or let build.mjs run it.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = join(dirname(fileURLToPath(import.meta.url)), 'src');
const read = f => readFileSync(join(src, 'assets', f), 'utf8');

const LINE = {
  plus:      { file: 'icon-plus.svg' },
  search:    { file: 'icon-search.svg',    shift: '0.75 0.75' },
  dolist:    { file: 'icon-dolist.svg',    shift: '0.5 0.5' },
  projects:  { file: 'icon-projects.svg',  shift: '0 0.75' },
  matters:   { file: 'icon-matters.svg' },
  routines:  { file: 'icon-routines.svg' },
  meetings:  { file: 'icon-meetings.svg',  shift: '0.75 0' },
  artifacts: { file: 'icon-artifacts.svg', shift: '0.75 0' },
  playbooks: { file: 'icon-playbooks.svg' },
  vault:     { file: 'icon-vault.svg' },
  templates: { file: 'icon-templates.svg' },
  requests:  { file: 'icon-requests.svg' },
  intake:    { file: 'icon-intake.svg' },
  agents:    { file: 'icon-agents.svg' },
  skills:    { file: 'icon-skills.svg' },
  collapse:  { file: 'icon-layout-left.svg', box: '0 0 20 20' },
};

const inner = svg => svg
  .replace(/^[\s\S]*?<svg[^>]*>/, '')
  .replace(/<\/svg>\s*$/, '')
  .replace(/stroke="white"/g, 'stroke="currentColor"')
  .replace(/\s*stroke-opacity="[^"]*"/g, '')
  .trim();

/* Not every export carries a viewBox — some only set width/height. Falling
   back to a 16px box silently crops such a file to nothing, which is how
   Slack came through blank. Derive the box from the dimensions instead. */
const viewBox = (svg) => {
  const vb = svg.match(/viewBox="([^"]+)"/);
  if (vb) return vb[1];
  const w = svg.match(/\swidth="([\d.]+)/), h = svg.match(/\sheight="([\d.]+)/);
  if (w && h) return `0 0 ${w[1]} ${h[1]}`;
  console.warn('  ! no viewBox and no dimensions; assuming 24');
  return '0 0 24 24';
};


/**
 * Namespace everything in an export that is global once inlined.
 *
 * Two hazards, both from putting several exports in one DOM: Illustrator's
 * .st0….stN class names, and the id of every gradient, mask and filter —
 * real brand SVGs routinely call theirs "a", "b" or "linear0". Whichever
 * file is parsed last would otherwise win, and the earlier ones render wrong.
 */
function scopeIds(markup, name) {
  let out = markup
    .replace(/\.st(\d+)\b/g, `.${name}-st$1`)
    .replace(/class="st(\d+)"/g, `class="${name}-st$1"`);

  for (const id of [...out.matchAll(/\sid="([^"]+)"/g)].map(m => m[1])) {
    const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out
      .replace(new RegExp(`(\\sid=")${esc}(")`, 'g'), `$1${name}-${id}$2`)
      .replace(new RegExp(`url\\(#${esc}\\)`, 'g'), `url(#${name}-${id})`)
      .replace(new RegExp(`((?:xlink:)?href=")#${esc}(")`, 'g'), `$1#${name}-${id}$2`);
  }
  return out;
}

const symbols = [];

for (const [name, { file, box = '0 0 16 16', shift }] of Object.entries(LINE)) {
  const body = inner(read(file));
  symbols.push(
    `<symbol id="i-${name}" viewBox="${box}" fill="none" ` +
    `stroke-linecap="round" stroke-linejoin="round">` +
    (shift ? `<g transform="translate(${shift})">${body}</g>` : body) +
    `</symbol>`
  );
}

// the three agent avatars differ only in the square behind identical artwork,
// so ship one symbol and let CSS tint it
const avatar = inner(read('agent-avatar-purple.svg'))
  .replace('fill="#8D75A8"', 'fill="currentColor"');
symbols.push(`<symbol id="i-agent" viewBox="0 0 20 20">${avatar}</symbol>`);

/**
 * Brand artwork. Each is a single fill with opacity classes doing the fade, so
 * one symbol serves gold / gold-tint / sand by inheriting `color`.
 *
 * The symbol is the full-fidelity 500px export; the wordmark is the current
 * UnifyApps type. (The UnifyAssets pack's own lockup is the previous "Unify.*"
 * brand — right artwork, wrong generation. Do not swap it back in.)
 *
 * Illustrator names its classes .st0….st17 in EVERY export, with different
 * meanings per file, so inlined together the later rules win. Prefix them per
 * symbol to keep the two sets apart.
 */
for (const [name, file] of [['logomark', 'logo-symbol.svg'], ['wordmark', 'logo-wordmark.svg']]) {
  const svg = read(file);
  symbols.push(
    `<symbol id="i-${name}" viewBox="${viewBox(svg)}" fill="none">${scopeIds(inner(svg), name)}</symbol>`
  );
}

/* real connector logos — these keep their own fills; the trace's own glyphs
   stay monochrome, and a brand mark only appears where it names a system */
for (const name of ['gmail', 'outlook', 'drive', 'sharepoint', 'salesforce', 'slack', 'gdocs',
                    'teams', 'onedrive', 'zoom', 'meet', 'gcal', 'google', 'microsoft',
                    'claude', 'gemini', 'mistral', 'qwen', 'openai', 'apple', 'chrome', 'box', 'imanage', 'dropbox']) {
  const svg = readFileSync(join(src, 'assets', 'brand', `${name}.svg`), 'utf8');
  /* A fill set on the root <svg> is lost when only its children move into
     the symbol, and the mark comes out black — Anthropic's does exactly
     this. Carry it across. */
  const fill = svg.match(/<svg[^>]*\sfill="([^"]+)"/);
  const att = fill ? ` fill="${fill[1]}"` : '';
  symbols.push(
    `<symbol id="b-${name}" viewBox="${viewBox(svg)}"${att}>${scopeIds(inner(svg), name)}</symbol>`
  );
}

const out = `<svg class="sprite" aria-hidden="true" focusable="false">\n${symbols.join('\n')}\n</svg>\n`;
writeFileSync(join(src, 'sprite.html'), out);
console.log(`sprite.html         ${(Buffer.byteLength(out) / 1024).toFixed(1)} KB, ${symbols.length} symbols`);
