// A small CSS reader for the two files the design system is made of
// (src/styles/tokens.css, src/styles/components.css). Not a general parser: it
// understands rules, @media / @supports nesting, custom-property declarations
// and the comments that sit above or beside them -- which is all the manifest
// needs, and it fails loudly rather than guessing on anything else.
//
// Returns every declaration as
//   { selector, media, prop, value, line, endLine, section, above, trailing }
// where `above` is the comment that sits directly over it (or over the group of
// declarations it belongs to: a comment covers the lines that follow it until
// a blank line) and `trailing` is a comment on the same line after the `;`.

const clean = (c) => c.replace(/^\/\*+|\*+\/$/g, '').split('\n').map((l) => l.replace(/^\s*\*?\s?/, '')).join(' ').replace(/\s+/g, ' ').trim();

/** A section divider, e.g. "===== 2. SEMANTIC =====". Not a note on anything. */
const SECTION = /^=+\s*(.*?)\s*=*$/;

export function parseCss(src) {
  const decls = [];
  const stack = [];                 // { kind: 'rule' | 'media' | 'skip', prelude }
  let buf = '', bufLine = 0, line = 1;
  let lastComment = null;           // { text, endLine } waiting for the next declaration
  let cover = null;                 // { text, lastLine } a comment currently covering a group
  let lastDecl = null;
  let section = null;

  const top = () => stack[stack.length - 1];
  const rulePrelude = () => { for (let i = stack.length - 1; i >= 0; i--) if (stack[i].kind === 'rule') return stack[i].prelude; return null; };
  const mediaPrelude = () => stack.filter((s) => s.kind === 'media').map((s) => s.prelude).join(' and ') || null;

  const flush = () => {
    const text = buf.trim();
    buf = '';
    if (!text) return;
    const t = top();
    if (!t || t.kind === 'skip') return;
    const colon = text.indexOf(':');
    if (colon < 0) return;
    const prop = text.slice(0, colon).trim();
    const value = text.slice(colon + 1).trim().replace(/\s+/g, ' ');
    let above = null;
    if (lastComment && lastComment.endLine === bufLine - 1) cover = { text: lastComment.text, lastLine: line };
    else if (cover && cover.lastLine === bufLine - 1) cover.lastLine = line;
    else cover = null;
    lastComment = null;
    if (cover) above = cover.text;
    lastDecl = { selector: rulePrelude(), media: mediaPrelude(), prop, value, line: bufLine, endLine: line, section, above, trailing: null };
    decls.push(lastDecl);
  };

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      if (end < 0) throw new Error(`css: unterminated comment at line ${line}`);
      const raw = src.slice(i, end + 2);
      const startLine = line;
      line += (raw.match(/\n/g) || []).length;
      i = end + 1;
      if (buf.trim()) continue;                       // inside a declaration or a selector: not a note
      const text = clean(raw);
      const sec = text.match(SECTION);
      if (raw.includes('=====') && sec) { section = sec[1]; lastComment = null; cover = null; continue; }
      if (lastDecl && lastDecl.endLine === startLine && !lastDecl.trailing) { lastDecl.trailing = text; continue; }
      lastComment = { text, endLine: line };
      cover = null;
      continue;
    }
    if (c === '"' || c === "'") {                     // a string: copy through
      const end = src.indexOf(c, i + 1);
      if (end < 0) throw new Error(`css: unterminated string at line ${line}`);
      if (!buf.trim()) bufLine = line;
      buf += src.slice(i, end + 1);
      i = end;
      continue;
    }
    if (c === '(') {                                  // url(...), var(...), :has(...): copy to the match
      let depth = 1, j = i + 1;
      while (j < src.length && depth) { if (src[j] === '(') depth++; else if (src[j] === ')') depth--; j++; }
      if (!buf.trim()) bufLine = line;
      const seg = src.slice(i, j);
      buf += seg;
      line += (seg.match(/\n/g) || []).length;
      i = j - 1;
      continue;
    }
    if (c === '{') {
      const prelude = buf.trim().replace(/\s+/g, ' ');
      buf = '';
      const kind = /^@(media|supports|container|layer)\b/.test(prelude) ? 'media' : prelude.startsWith('@') ? 'skip' : 'rule';
      stack.push({ kind, prelude: kind === 'media' ? prelude.replace(/^@\w+\s*/, '') : prelude });
      cover = null; lastComment = null; lastDecl = null;
      continue;
    }
    if (c === '}') { flush(); stack.pop(); cover = null; lastComment = null; lastDecl = null; continue; }
    if (c === ';') { flush(); continue; }
    if (c === '\n') { line++; if (buf.trim()) buf += ' '; continue; }
    if (!buf.trim() && c.trim()) bufLine = line;
    buf += c;
  }
  if (stack.length) throw new Error('css: unbalanced braces');
  return decls;
}

/** Every `--name` a value reads through var(), outermost and fallbacks alike. */
export function varRefs(value) {
  return [...value.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]);
}

/**
 * The classes a selector is *about*: the ffc- classes in its last compound
 * that has any, after :where / :is groups are spread out and :not / :has
 * arguments dropped. `.a .b__c` is about `.b__c`; `.ffc-zoom button` is about
 * `.ffc-zoom` (the button is the zoom's own); and
 * `.ffc-panel__footer:has(.ffc-itempager)` is about the footer, not the
 * ItemPager inside it.
 */
export function subjectClasses(selector) {
  const out = new Set();
  for (const part of splitTop(selector)) for (const one of spread(part)) addSubject(one, out);
  return [...out];
}
function spread(part) {
  const m = part.match(/:(?:where|is)\(((?:[^()]|\([^()]*\))*)\)/);
  if (!m) return [part];
  return splitTop(m[1]).flatMap((alt) => spread(part.replace(m[0], alt)));
}
function addSubject(part, out) {
  const bare = part.replace(/:(?:not|has)\((?:[^()]|\([^()]*\))*\)/g, '');
  const compounds = bare.trim().split(/\s*[>+~]\s*|\s+/).filter(Boolean);
  for (let i = compounds.length - 1; i >= 0; i--) {
    const found = [...compounds[i].matchAll(/\.(ffc-[\w-]+)/g)].map((m) => m[1]);
    if (found.length) { found.forEach((f) => out.add(f)); return; }
  }
}
function splitTop(s) {
  const out = []; let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === '(') depth++; else if (ch === ')') depth--;
    if (ch === ',' && !depth) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
