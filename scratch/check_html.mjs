import fs from 'fs';

const html = fs.readFileSync('frontend/pages/alertas.html', 'utf8');

// Testa parsing básico com htmlparser2 ou regex
const tagRegex = /<\/?([a-zA-Z0-9\-]+)([^>]*)>/g;
const voidTags = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
let stack = [];
let match;
let errors = [];

while ((match = tagRegex.exec(html)) !== null) {
  const lineNo = html.substring(0, match.index).split('\n').length;
  const full = match[0];
  const tagName = match[1].toLowerCase();
  const rawAttrs = match[2];

  if (full.endsWith('/>') || voidTags.has(tagName)) continue;

  if (full.startsWith('</')) {
    const last = stack.pop();
    if (!last || last.tag !== tagName) {
      errors.push({ line: lineNo, expected: last ? last.tag : 'NONE', got: tagName });
    }
  } else {
    stack.push({ tag: tagName, line: lineNo });
  }
}

console.log('Errors found:', errors);
console.log('Unclosed stack:', stack);
