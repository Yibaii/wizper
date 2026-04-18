/**
 * Wizper pitch deck generator.
 *
 * Theme mirrors the Wizper app UI:
 *   bg     = deep night navy       (#0a0f2c)
 *   panel  = slightly lighter      (#141a3f)
 *   cyan   = primary accent        (#00f5d4)   — "Wizper" brand color
 *   violet = secondary accent      (#b24bf3)
 *   gold   = highlight             (#ffd700)
 *   body   = off-white             (#e0e6f5)
 *   muted  = blue-grey             (#8a9cc9)
 *
 * Motif: thin cyan L-brackets on the top-left and bottom-right of every
 * content slide, echoing the pixel-card corner decorations in the app.
 *
 * Font: Consolas for headers (pixel-adjacent monospace), Calibri for body.
 */

const pptxgen = require('pptxgenjs');

// ─── Colors ─────────────────────────────────────────────────────────────
const C = {
  bg:      '0a0f2c',
  panel:   '141a3f',
  cardBg:  '1a2048',
  cyan:    '00f5d4',
  violet:  'b24bf3',
  gold:    'ffd700',
  ember:   'ff6b35',
  green:   '39ff14',
  body:    'e0e6f5',
  muted:   '8a9cc9',
  dim:     '5a6a99',
};

const FONT_HEAD = 'Consolas';
const FONT_BODY = 'Calibri';

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';  // 13.3" × 7.5"
pres.author = 'Wizper';
pres.title = 'Wizper — Anonymous Spirits';
pres.company = 'Wizper';

const W = 13.333;
const H = 7.5;

// ─── Helpers ────────────────────────────────────────────────────────────
function addBackground(slide) {
  slide.background = { color: C.bg };
  // Faint star field: a handful of tiny off-white dots for atmosphere.
  const stars = [
    [0.8, 0.6], [2.1, 1.3], [3.5, 0.4], [5.2, 1.0], [6.4, 0.3],
    [8.5, 0.9], [10.2, 0.5], [11.8, 1.2], [12.5, 0.7],
    [0.5, 3.4], [1.9, 4.7], [4.1, 6.8], [7.3, 6.2], [9.7, 5.4],
    [11.4, 6.9], [12.9, 4.1], [6.0, 7.1], [3.0, 5.9], [13.0, 2.0],
  ];
  for (const [x, y] of stars) {
    slide.addShape(pres.shapes.OVAL, {
      x, y, w: 0.035, h: 0.035,
      fill: { color: C.muted, transparency: 40 },
      line: { type: 'none' },
    });
  }
}

// Thin corner L-bracket in cyan — matches ConfessionCard decoration.
function addCornerBrackets(slide, color = C.cyan) {
  const arm = 0.35;
  const t = 0.025;
  // top-left
  slide.addShape(pres.shapes.RECTANGLE, { x: 0.3, y: 0.3, w: arm, h: t, fill: { color }, line: { type: 'none' } });
  slide.addShape(pres.shapes.RECTANGLE, { x: 0.3, y: 0.3, w: t, h: arm, fill: { color }, line: { type: 'none' } });
  // top-right
  slide.addShape(pres.shapes.RECTANGLE, { x: W - 0.3 - arm, y: 0.3, w: arm, h: t, fill: { color }, line: { type: 'none' } });
  slide.addShape(pres.shapes.RECTANGLE, { x: W - 0.3 - t, y: 0.3, w: t, h: arm, fill: { color }, line: { type: 'none' } });
  // bottom-left
  slide.addShape(pres.shapes.RECTANGLE, { x: 0.3, y: H - 0.3 - t, w: arm, h: t, fill: { color }, line: { type: 'none' } });
  slide.addShape(pres.shapes.RECTANGLE, { x: 0.3, y: H - 0.3 - arm, w: t, h: arm, fill: { color }, line: { type: 'none' } });
  // bottom-right
  slide.addShape(pres.shapes.RECTANGLE, { x: W - 0.3 - arm, y: H - 0.3 - t, w: arm, h: t, fill: { color }, line: { type: 'none' } });
  slide.addShape(pres.shapes.RECTANGLE, { x: W - 0.3 - t, y: H - 0.3 - arm, w: t, h: arm, fill: { color }, line: { type: 'none' } });
}

// Small "✦" glyph before a label.
function sparkLabel(slide, x, y, text, color = C.cyan, size = 11) {
  slide.addText([
    { text: '✦ ', options: { color, bold: true } },
    { text, options: { color } },
  ], { x, y, w: 6, h: 0.35, fontFace: FONT_HEAD, fontSize: size, margin: 0 });
}

// Page number + footer.
function addFooter(slide, pageNum, totalPages, section) {
  slide.addText(section, {
    x: 0.5, y: H - 0.45, w: 8, h: 0.3,
    fontFace: FONT_HEAD, fontSize: 8, color: C.dim, margin: 0,
  });
  slide.addText(`${pageNum} / ${totalPages}`, {
    x: W - 1.5, y: H - 0.45, w: 1, h: 0.3,
    fontFace: FONT_HEAD, fontSize: 8, color: C.dim, align: 'right', margin: 0,
  });
}

// Card with left accent bar.
function addCard(slide, { x, y, w, h, accent = C.cyan }) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: C.cardBg },
    line: { color: accent, width: 0.75, transparency: 70 },
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w: 0.06, h,
    fill: { color: accent }, line: { type: 'none' },
  });
}

// Tiny pixel wizard using rectangles (bonus visual motif).
function addPixelWizard(slide, cx, cy, unit = 0.12, color = C.violet, hat = C.violet, skin = 'f0d0a0') {
  // 8x10-ish pixel sprite
  const px = (col) => cx + (col - 4) * unit;
  const py = (row) => cy + (row - 5) * unit;
  function p(r, c, col) {
    slide.addShape(pres.shapes.RECTANGLE, {
      x: px(c), y: py(r), w: unit, h: unit,
      fill: { color: col }, line: { type: 'none' },
    });
  }
  // hat (rows 0-2)
  p(0, 4, hat);
  p(1, 3, hat); p(1, 4, hat); p(1, 5, hat);
  p(2, 2, hat); p(2, 3, hat); p(2, 4, hat); p(2, 5, hat); p(2, 6, hat);
  // face (rows 3-4)
  p(3, 3, skin); p(3, 4, skin); p(3, 5, skin);
  p(4, 2, skin); p(4, 3, 'ffffff'); p(4, 4, skin); p(4, 5, 'ffffff'); p(4, 6, skin);
  // robe (rows 5-8)
  p(5, 3, color); p(5, 4, color); p(5, 5, color);
  p(6, 2, color); p(6, 3, color); p(6, 4, color); p(6, 5, color); p(6, 6, color);
  p(7, 2, color); p(7, 3, color); p(7, 4, color); p(7, 5, color); p(7, 6, color);
  p(8, 2, color); p(8, 3, color); p(8, 5, color); p(8, 6, color);
  // staff (right column)
  p(1, 7, C.gold);
  p(2, 7, C.gold); p(3, 7, C.gold); p(4, 7, C.gold); p(5, 7, C.gold);
  p(6, 7, C.gold); p(7, 7, C.gold); p(8, 7, C.gold);
  // orb on top of staff
  p(0, 7, C.cyan);
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 1 — COVER
// ═══════════════════════════════════════════════════════════════════════
const TOTAL = 13;

{
  const s = pres.addSlide();
  addBackground(s);
  addCornerBrackets(s, C.violet);

  // Wizard sprite — center top
  addPixelWizard(s, W / 2, 2.5, 0.16);

  // Title
  s.addText('Wizper', {
    x: 0, y: 3.4, w: W, h: 1.1,
    fontFace: FONT_HEAD, fontSize: 84, bold: true,
    color: C.cyan, align: 'center', margin: 0,
  });

  // Tagline
  s.addText('Where Emotions Become Spirits', {
    x: 0, y: 4.55, w: W, h: 0.5,
    fontFace: FONT_HEAD, fontSize: 20, color: C.violet,
    align: 'center', margin: 0, charSpacing: 2,
  });

  // Subline
  s.addText('Anonymous spirits, verifiable without identity.', {
    x: 0, y: 5.3, w: W, h: 0.4,
    fontFace: FONT_BODY, fontSize: 16, italic: true, color: C.muted,
    align: 'center', margin: 0,
  });

  // Three-pillar footer
  s.addText('ANONYMOUS   ·   EXPRESSIVE   ·   YOURS', {
    x: 0, y: 6.5, w: W, h: 0.4,
    fontFace: FONT_HEAD, fontSize: 11, color: C.gold,
    align: 'center', margin: 0, charSpacing: 8,
  });
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 2 — PROBLEM SECTION OPENER
// ═══════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBackground(s);
  addCornerBrackets(s, C.ember);

  s.addText('01', {
    x: 0.8, y: 1.2, w: 3, h: 2,
    fontFace: FONT_HEAD, fontSize: 180, bold: true,
    color: C.ember, margin: 0, charSpacing: -4,
  });

  s.addText('The Problem', {
    x: 4.2, y: 2.0, w: 8, h: 1.2,
    fontFace: FONT_HEAD, fontSize: 54, bold: true, color: C.body, margin: 0,
  });

  s.addText('Two worlds, one missing need', {
    x: 4.2, y: 3.2, w: 8, h: 0.5,
    fontFace: FONT_BODY, fontSize: 20, italic: true, color: C.muted, margin: 0,
  });

  // Divider line
  s.addShape(pres.shapes.RECTANGLE, {
    x: 4.2, y: 3.85, w: 2, h: 0.03,
    fill: { color: C.ember }, line: { type: 'none' },
  });

  s.addText(
    'People want to speak freely — without being watched, sold, or profiled.\n' +
    'Web2 platforms can\'t offer that. Web3 promised it, but quietly failed.',
    {
      x: 4.2, y: 4.1, w: 8, h: 1.8,
      fontFace: FONT_BODY, fontSize: 16, color: C.body,
      lineSpacingMultiple: 1.4, margin: 0,
    },
  );

  addFooter(s, 2, TOTAL, '01 · PROBLEM');
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 3 — CHALLENGE OUTSIDE CRYPTO
// ═══════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBackground(s);
  addCornerBrackets(s);

  sparkLabel(s, 0.8, 0.55, '01 · OUTSIDE CRYPTO', C.ember, 10);

  s.addText('The internet forgot how to whisper', {
    x: 0.8, y: 0.95, w: 12, h: 0.9,
    fontFace: FONT_HEAD, fontSize: 36, bold: true, color: C.body, margin: 0,
  });

  s.addText('Social networks optimized for reach. Nothing optimized for release.', {
    x: 0.8, y: 1.85, w: 12, h: 0.5,
    fontFace: FONT_BODY, fontSize: 16, italic: true, color: C.muted, margin: 0,
  });

  // 4-card grid for the challenges
  const cards = [
    {
      title: 'Surveillance by default',
      body:   'Every post on Instagram, X, WeChat is tied to a real-name account. Data sold, indexed, retained forever.',
    },
    {
      title: 'Algorithmic amplification',
      body:   'Raw emotion gets rewarded only when it\'s marketable. Quiet grief and ordinary rage are invisible.',
    },
    {
      title: 'Self-censorship',
      body:   'Employers, family, followers all watch. 62% of Gen-Z report holding back posts for fear of context collapse.',
    },
    {
      title: 'No archival memory',
      body:   'Burner posts and disappearing stories leave nothing behind. People want to release, then remember.',
    },
  ];
  const cardW = 5.8, cardH = 2.0;
  const positions = [
    [0.8, 2.7], [6.8, 2.7],
    [0.8, 4.85], [6.8, 4.85],
  ];
  cards.forEach((c, i) => {
    const [x, y] = positions[i];
    addCard(s, { x, y, w: cardW, h: cardH, accent: C.ember });
    s.addText(c.title, {
      x: x + 0.3, y: y + 0.2, w: cardW - 0.5, h: 0.5,
      fontFace: FONT_HEAD, fontSize: 16, bold: true, color: C.ember, margin: 0,
    });
    s.addText(c.body, {
      x: x + 0.3, y: y + 0.75, w: cardW - 0.5, h: 1.15,
      fontFace: FONT_BODY, fontSize: 13, color: C.body,
      lineSpacingMultiple: 1.35, margin: 0,
    });
  });

  addFooter(s, 3, TOTAL, '01 · PROBLEM / OUTSIDE CRYPTO');
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 4 — CHALLENGE INSIDE CRYPTO
// ═══════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBackground(s);
  addCornerBrackets(s);

  sparkLabel(s, 0.8, 0.55, '01 · INSIDE CRYPTO', C.gold, 10);

  s.addText('"Anonymous" — but your wallet is public', {
    x: 0.8, y: 0.95, w: 12, h: 0.9,
    fontFace: FONT_HEAD, fontSize: 32, bold: true, color: C.body, margin: 0,
  });

  s.addText('Farcaster, Lens, Mirror, existing "anonymous" NFT projects — all share the same flaw.', {
    x: 0.8, y: 1.85, w: 12, h: 0.5,
    fontFace: FONT_BODY, fontSize: 15, italic: true, color: C.muted, margin: 0,
  });

  // Big comparison row — "What chain sees"
  addCard(s, { x: 0.8, y: 2.6, w: 5.8, h: 4.2, accent: C.ember });
  s.addText('What the chain sees today', {
    x: 1.05, y: 2.8, w: 5.5, h: 0.5,
    fontFace: FONT_HEAD, fontSize: 15, bold: true, color: C.ember, margin: 0,
  });
  const todayPoints = [
    { text: 'ownerOf(tokenId) → your main wallet', options: { bullet: true, breakLine: true, color: C.body } },
    { text: 'Transfer events link every post to that wallet', options: { bullet: true, breakLine: true, color: C.body } },
    { text: 'Wallet ties back to CEX deposits, KYC, IP', options: { bullet: true, breakLine: true, color: C.body } },
    { text: 'ZK \u201Chash commitments\u201D on top — theater,\nnot anonymity (author still msg.sender)', options: { bullet: true, color: C.body } },
  ];
  s.addText(todayPoints, {
    x: 1.05, y: 3.4, w: 5.3, h: 3.2,
    fontFace: FONT_BODY, fontSize: 13, color: C.body,
    lineSpacingMultiple: 1.5, paraSpaceAfter: 8, margin: 0,
  });

  addCard(s, { x: 7, y: 2.6, w: 5.5, h: 4.2, accent: C.cyan });
  s.addText('What users thought they were getting', {
    x: 7.25, y: 2.8, w: 5.2, h: 0.5,
    fontFace: FONT_HEAD, fontSize: 15, bold: true, color: C.cyan, margin: 0,
  });
  const thoughtPoints = [
    { text: 'Pseudonymous account, no real name', options: { bullet: true, breakLine: true, color: C.body } },
    { text: 'Censorship resistance', options: { bullet: true, breakLine: true, color: C.body } },
    { text: 'Own your data', options: { bullet: true, breakLine: true, color: C.body } },
    { text: 'But: \u201Cpseudonymous\u201D \u2260 anonymous. A single doxx\nretroactively de-anonymizes everything you ever posted.', options: { bullet: true, color: C.body } },
  ];
  s.addText(thoughtPoints, {
    x: 7.25, y: 3.4, w: 5.0, h: 3.2,
    fontFace: FONT_BODY, fontSize: 13, color: C.body,
    lineSpacingMultiple: 1.5, paraSpaceAfter: 8, margin: 0,
  });

  addFooter(s, 4, TOTAL, '01 · PROBLEM / INSIDE CRYPTO');
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 5 — SOLUTION SECTION OPENER
// ═══════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBackground(s);
  addCornerBrackets(s, C.cyan);

  s.addText('02', {
    x: 0.8, y: 1.2, w: 3, h: 2,
    fontFace: FONT_HEAD, fontSize: 180, bold: true,
    color: C.cyan, margin: 0, charSpacing: -4,
  });

  s.addText('The Solution', {
    x: 4.2, y: 2.0, w: 8, h: 1.2,
    fontFace: FONT_HEAD, fontSize: 54, bold: true, color: C.body, margin: 0,
  });

  s.addText('Decouple three layers of identity', {
    x: 4.2, y: 3.2, w: 8, h: 0.5,
    fontFace: FONT_BODY, fontSize: 20, italic: true, color: C.muted, margin: 0,
  });

  s.addShape(pres.shapes.RECTANGLE, {
    x: 4.2, y: 3.85, w: 2, h: 0.03,
    fill: { color: C.cyan }, line: { type: 'none' },
  });

  s.addText(
    'Membership. Authorship. Ownership.\n' +
    'Each proven separately, each unlinkable to the others.',
    {
      x: 4.2, y: 4.1, w: 8, h: 1.8,
      fontFace: FONT_BODY, fontSize: 16, color: C.body,
      lineSpacingMultiple: 1.4, margin: 0,
    },
  );

  addFooter(s, 5, TOTAL, '02 · SOLUTION');
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 6 — BLOCKCHAIN ECOSYSTEM
// ═══════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBackground(s);
  addCornerBrackets(s);

  sparkLabel(s, 0.8, 0.55, '02 · BLOCKCHAIN ECOSYSTEM', C.cyan, 10);

  s.addText('The stack', {
    x: 0.8, y: 0.95, w: 12, h: 0.9,
    fontFace: FONT_HEAD, fontSize: 36, bold: true, color: C.body, margin: 0,
  });

  s.addText('Chosen for cheap gas, mature tooling, and a ZK primitive that already works.', {
    x: 0.8, y: 1.85, w: 12, h: 0.5,
    fontFace: FONT_BODY, fontSize: 15, italic: true, color: C.muted, margin: 0,
  });

  // Three columns
  const cols = [
    {
      title: 'Chain',
      color: C.cyan,
      rows: [
        ['Base', 'L2 rollup, ~$0.005 per mint'],
        ['Chain ID', '84532 (Sepolia testnet today)'],
        ['Ready for', 'Base Mainnet migration'],
      ],
    },
    {
      title: 'Language & Contracts',
      color: C.violet,
      rows: [
        ['Solidity', '0.8.23+'],
        ['OpenZeppelin', 'v5 (ERC-721 Enumerable)'],
        ['Semaphore', 'v4 (PSE deployment)'],
      ],
    },
    {
      title: 'App Layer',
      color: C.gold,
      rows: [
        ['Frontend', 'Next.js 16, React 19'],
        ['Wallet / RPC', 'wagmi 3, viem 2'],
        ['Storage', 'IPFS (Pinata) + Postgres cache'],
      ],
    },
  ];

  const colW = 4.0, colH = 4.3;
  cols.forEach((col, i) => {
    const x = 0.8 + i * 4.15;
    const y = 2.6;
    addCard(s, { x, y, w: colW, h: colH, accent: col.color });

    s.addText(col.title, {
      x: x + 0.3, y: y + 0.2, w: colW - 0.5, h: 0.5,
      fontFace: FONT_HEAD, fontSize: 16, bold: true, color: col.color, margin: 0,
    });

    col.rows.forEach((r, ri) => {
      const ry = y + 0.85 + ri * 1.1;
      s.addText(r[0], {
        x: x + 0.3, y: ry, w: colW - 0.5, h: 0.35,
        fontFace: FONT_HEAD, fontSize: 11, bold: true, color: C.body, margin: 0,
      });
      s.addText(r[1], {
        x: x + 0.3, y: ry + 0.35, w: colW - 0.5, h: 0.55,
        fontFace: FONT_BODY, fontSize: 13, color: C.muted, margin: 0,
      });
    });
  });

  addFooter(s, 6, TOTAL, '02 · SOLUTION / STACK');
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 7 — SMART CONTRACTS
// ═══════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBackground(s);
  addCornerBrackets(s);

  sparkLabel(s, 0.8, 0.55, '02 · SMART CONTRACTS', C.cyan, 10);

  s.addText('One contract, five verbs', {
    x: 0.8, y: 0.95, w: 12, h: 0.9,
    fontFace: FONT_HEAD, fontSize: 36, bold: true, color: C.body, margin: 0,
  });

  s.addText('WizperAnonymous.sol · extends ERC-721 + ERC-721Enumerable · references Semaphore externally.', {
    x: 0.8, y: 1.85, w: 12, h: 0.5,
    fontFace: FONT_BODY, fontSize: 14, italic: true, color: C.muted, margin: 0,
  });

  // A single big table with 5 rows
  const verbs = [
    { fn: 'initialize()',                       caller: 'owner, once',        eff: 'Creates a Semaphore group with this contract as admin' },
    { fn: 'joinGroup(commitment)',              caller: 'any wallet',         eff: 'Inserts identity commitment into the Merkle tree' },
    { fn: 'mintSpirit(proof, stealthOwner, …)', caller: 'relayer',            eff: 'Verifies ZK proof → mints ERC-721 to stealth address' },
    { fn: 'requestLink(from, to, sig)',         caller: 'relayer',            eff: 'ECDSA sig must recover to ownerOf(from); marks Pending' },
    { fn: 'confirmLink(from, to, sig)',         caller: 'relayer',            eff: 'ECDSA sig must recover to ownerOf(to); marks Confirmed' },
  ];

  const tX = 0.8, tY = 2.6, rowH = 0.75;
  // header row
  s.addShape(pres.shapes.RECTANGLE, {
    x: tX, y: tY, w: W - 1.6, h: 0.5,
    fill: { color: C.panel }, line: { color: C.cyan, width: 0.5, transparency: 60 },
  });
  s.addText('Function', { x: tX + 0.2, y: tY + 0.08, w: 4.5, h: 0.35, fontFace: FONT_HEAD, fontSize: 11, bold: true, color: C.cyan, margin: 0 });
  s.addText('Caller',   { x: tX + 5.0, y: tY + 0.08, w: 2.3, h: 0.35, fontFace: FONT_HEAD, fontSize: 11, bold: true, color: C.cyan, margin: 0 });
  s.addText('Effect',   { x: tX + 7.4, y: tY + 0.08, w: 5.0, h: 0.35, fontFace: FONT_HEAD, fontSize: 11, bold: true, color: C.cyan, margin: 0 });

  verbs.forEach((v, i) => {
    const ry = tY + 0.5 + i * rowH;
    if (i % 2 === 0) {
      s.addShape(pres.shapes.RECTANGLE, {
        x: tX, y: ry, w: W - 1.6, h: rowH,
        fill: { color: C.cardBg, transparency: 50 }, line: { type: 'none' },
      });
    }
    s.addText(v.fn,     { x: tX + 0.2, y: ry + 0.18, w: 4.7, h: 0.45, fontFace: 'Consolas', fontSize: 12, color: C.violet, margin: 0 });
    s.addText(v.caller, { x: tX + 5.0, y: ry + 0.18, w: 2.3, h: 0.45, fontFace: FONT_BODY, fontSize: 12, color: C.gold, margin: 0 });
    s.addText(v.eff,    { x: tX + 7.4, y: ry + 0.18, w: 5.2, h: 0.45, fontFace: FONT_BODY, fontSize: 12, color: C.body, margin: 0 });
  });

  addFooter(s, 7, TOTAL, '02 · SOLUTION / CONTRACTS');
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 8 — THREE LAYERS OF ANONYMITY
// ═══════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBackground(s);
  addCornerBrackets(s);

  sparkLabel(s, 0.8, 0.55, '02 · ARCHITECTURE', C.cyan, 10);

  s.addText('Three layers, unlinkable to each other', {
    x: 0.8, y: 0.95, w: 12, h: 0.9,
    fontFace: FONT_HEAD, fontSize: 30, bold: true, color: C.body, margin: 0,
  });

  const layers = [
    {
      n: '01',
      color: C.cyan,
      title: 'Membership',
      how:   'Semaphore group join',
      proof: 'Main wallet signs once. On-chain record: "some wallet joined Wizper." No record of which wallet owns which post.',
    },
    {
      n: '02',
      color: C.violet,
      title: 'Authorship',
      how:   'ZK proof per mint',
      proof: 'Every mint submits a fresh Groth16 proof + random nullifier. Contract sees: "a group member posted this signal" — not which one.',
    },
    {
      n: '03',
      color: C.gold,
      title: 'Ownership',
      how:   'Stealth address',
      proof: 'NFT minted to keccak256(identity_secret). Only the user can derive the key. No on-chain trace back to main wallet.',
    },
  ];

  const blockH = 1.45;
  const blockY0 = 2.3;
  layers.forEach((l, i) => {
    const y = blockY0 + i * (blockH + 0.15);
    // Big number column
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.8, y, w: 1.2, h: blockH,
      fill: { color: C.panel }, line: { color: l.color, width: 0.75, transparency: 50 },
    });
    s.addText(l.n, {
      x: 0.8, y: y + 0.25, w: 1.2, h: 0.9,
      fontFace: FONT_HEAD, fontSize: 44, bold: true, color: l.color, align: 'center', margin: 0,
    });

    // Content block
    addCard(s, { x: 2.1, y, w: W - 2.9, h: blockH, accent: l.color });
    s.addText([
      { text: l.title, options: { fontFace: FONT_HEAD, fontSize: 18, bold: true, color: l.color } },
      { text: '    ', options: {} },
      { text: l.how,   options: { fontFace: FONT_BODY, fontSize: 13, italic: true, color: C.muted } },
    ], {
      x: 2.35, y: y + 0.2, w: W - 3.3, h: 0.5, margin: 0,
    });
    s.addText(l.proof, {
      x: 2.35, y: y + 0.7, w: W - 3.3, h: 0.75,
      fontFace: FONT_BODY, fontSize: 13, color: C.body,
      lineSpacingMultiple: 1.35, margin: 0,
    });
  });

  addFooter(s, 8, TOTAL, '02 · SOLUTION / ANONYMITY LAYERS');
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 9 — ECONOMIC THEORY OF VALUE
// ═══════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBackground(s);
  addCornerBrackets(s);

  sparkLabel(s, 0.8, 0.55, '02 · ECONOMIC THEORY OF VALUE', C.cyan, 10);

  s.addText('What is the good being traded?', {
    x: 0.8, y: 0.95, w: 12, h: 0.9,
    fontFace: FONT_HEAD, fontSize: 32, bold: true, color: C.body, margin: 0,
  });

  s.addText('Not the NFT. The act of being released from silence.', {
    x: 0.8, y: 1.85, w: 12, h: 0.5,
    fontFace: FONT_BODY, fontSize: 16, italic: true, color: C.violet, margin: 0,
  });

  // Left: three sources of value as stacked bars
  const vs = [
    { label: 'Anonymity',      sub: 'scarce, cryptographically guaranteed',           color: C.cyan   },
    { label: 'Expression',     sub: 'raw emotion, preserved without judgment',         color: C.violet },
    { label: 'Connection',     sub: 'link spirits, discover shared feelings',          color: C.gold   },
  ];

  s.addText('Three sources of value', {
    x: 0.8, y: 2.6, w: 6, h: 0.4,
    fontFace: FONT_HEAD, fontSize: 14, bold: true, color: C.muted, margin: 0,
  });

  vs.forEach((v, i) => {
    const y = 3.1 + i * 1.2;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.8, y, w: 0.1, h: 0.95,
      fill: { color: v.color }, line: { type: 'none' },
    });
    s.addText(v.label, {
      x: 1.05, y: y, w: 5, h: 0.4,
      fontFace: FONT_HEAD, fontSize: 18, bold: true, color: v.color, margin: 0,
    });
    s.addText(v.sub, {
      x: 1.05, y: y + 0.45, w: 5, h: 0.5,
      fontFace: FONT_BODY, fontSize: 13, color: C.body,
      lineSpacingMultiple: 1.35, margin: 0,
    });
  });

  // Right: principle card
  addCard(s, { x: 7.1, y: 2.6, w: 5.4, h: 4.4, accent: C.violet });
  s.addText('Design principle', {
    x: 7.35, y: 2.8, w: 5, h: 0.4,
    fontFace: FONT_HEAD, fontSize: 14, bold: true, color: C.violet, margin: 0,
  });
  s.addText('Anonymity is the primary asset.', {
    x: 7.35, y: 3.2, w: 5, h: 0.5,
    fontFace: FONT_HEAD, fontSize: 18, bold: true, color: C.body, margin: 0,
  });
  s.addText(
    'Users don\'t mint Wizper spirits because NFTs are valuable. They mint because the act costs nothing — financially, socially, psychologically.\n\n' +
    'The NFT is a witness, not a commodity. It says: "you were heard, even though nobody knows who you are."\n\n' +
    'The platform\'s job is to preserve that asymmetry — add friction to surveillance, remove friction to release.',
    {
      x: 7.35, y: 3.75, w: 5, h: 3.2,
      fontFace: FONT_BODY, fontSize: 13, color: C.body,
      lineSpacingMultiple: 1.5, margin: 0,
    },
  );

  addFooter(s, 9, TOTAL, '02 · SOLUTION / ECONOMIC THEORY');
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 10 — VALUE FLOW DIAGRAM
// ═══════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBackground(s);
  addCornerBrackets(s);

  sparkLabel(s, 0.8, 0.55, '02 · VALUE FLOW', C.cyan, 10);

  s.addText('How value moves through the system', {
    x: 0.8, y: 0.95, w: 12, h: 0.9,
    fontFace: FONT_HEAD, fontSize: 30, bold: true, color: C.body, margin: 0,
  });

  // Horizontal flow: User → Relayer → Chain → Community
  const steps = [
    { title: 'User',      sub: 'writes text\ngenerates proof',                  color: C.cyan   },
    { title: 'Relayer',   sub: 'pays gas\nforwards proof',                     color: C.violet },
    { title: 'Chain',     sub: 'verifies\nmints to stealth',                   color: C.gold   },
    { title: 'Community', sub: 'discovers, links\n"you are not alone"',        color: C.green  },
  ];

  const boxW = 2.5, boxH = 1.8;
  const gap = 0.55;
  const totalW = steps.length * boxW + (steps.length - 1) * gap;
  const startX = (W - totalW) / 2;
  const y = 2.6;

  steps.forEach((step, i) => {
    const x = startX + i * (boxW + gap);

    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: boxW, h: boxH,
      fill: { color: C.cardBg }, line: { color: step.color, width: 1.2 },
    });
    s.addText(step.title, {
      x, y: y + 0.3, w: boxW, h: 0.5,
      fontFace: FONT_HEAD, fontSize: 18, bold: true, color: step.color,
      align: 'center', margin: 0,
    });
    s.addText(step.sub, {
      x, y: y + 0.85, w: boxW, h: 0.85,
      fontFace: FONT_BODY, fontSize: 12, color: C.body,
      align: 'center', lineSpacingMultiple: 1.3, margin: 0,
    });

    // Arrow between boxes
    if (i < steps.length - 1) {
      const ax = x + boxW + 0.05;
      const ay = y + boxH / 2;
      s.addShape(pres.shapes.RECTANGLE, {
        x: ax, y: ay - 0.02, w: gap - 0.25, h: 0.04,
        fill: { color: C.muted }, line: { type: 'none' },
      });
      // Arrowhead
      s.addShape(pres.shapes.RIGHT_TRIANGLE, {
        x: ax + gap - 0.3, y: ay - 0.11, w: 0.2, h: 0.22,
        fill: { color: C.muted }, line: { type: 'none' },
        rotate: 90,
      });
    }
  });

  // Return loop arrow
  s.addText('↺  expression archive, link graph, sentiment signal', {
    x: startX, y: y + boxH + 0.5, w: totalW, h: 0.4,
    fontFace: FONT_HEAD, fontSize: 12, color: C.muted, italic: true, align: 'center', margin: 0,
  });

  // Bottom callout
  addCard(s, { x: 0.8, y: 5.7, w: W - 1.6, h: 1.3, accent: C.gold });
  s.addText([
    { text: 'Value stays with the user: ', options: { bold: true, color: C.gold } },
    { text: 'the NFT is theirs, the secret is theirs, the link they chose is theirs. ', options: { color: C.body } },
    { text: 'The platform holds nothing a subpoena could expose.', options: { italic: true, color: C.muted } },
  ], {
    x: 1.1, y: 5.9, w: W - 2.2, h: 0.9,
    fontFace: FONT_BODY, fontSize: 14, lineSpacingMultiple: 1.4, margin: 0,
  });

  addFooter(s, 10, TOTAL, '02 · SOLUTION / VALUE FLOW');
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 11 — USERS / PERSONAS
// ═══════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBackground(s);
  addCornerBrackets(s);

  sparkLabel(s, 0.8, 0.55, '03 · USERS', C.cyan, 10);

  s.addText('Who shows up to become a spirit?', {
    x: 0.8, y: 0.95, w: 12, h: 0.9,
    fontFace: FONT_HEAD, fontSize: 30, bold: true, color: C.body, margin: 0,
  });

  s.addText('Two overlapping audiences, one shared need: speak without being tracked.', {
    x: 0.8, y: 1.85, w: 12, h: 0.5,
    fontFace: FONT_BODY, fontSize: 15, italic: true, color: C.muted, margin: 0,
  });

  const personas = [
    {
      color: C.violet,
      title: 'The emotional refugee',
      sub:   'burnt out on web2 performance',
      points: [
        'Anxious sharers, marginalized voices,',
        'whistleblowers, people in grief.',
        'Already using burner Instagrams, alt',
        'Twitter, WeChat small circles.',
        'Willing to learn a new tool if it',
        'stops the surveillance.',
      ],
    },
    {
      color: C.cyan,
      title: 'The crypto native',
      sub:   'already in a wallet, tired of doxx risk',
      points: [
        'Farcaster / Lens users who want a',
        'channel the main address can\'t reach.',
        'ZK enthusiasts testing Semaphore in',
        'the wild.',
        'Early NFT collectors who value',
        'artifacts of ephemeral moments.',
      ],
    },
    {
      color: C.gold,
      title: 'The collector & curator',
      sub:   'builds meaning on top of anonymity',
      points: [
        'Artists curating emotion feeds.',
        'Researchers (with consent-aware',
        'framing) studying anonymous sentiment.',
        'Communities around shared feelings —',
        'grief groups, fandom catharsis,',
        'political dissent.',
      ],
    },
  ];

  const pW = 4.0, pH = 4.3;
  personas.forEach((p, i) => {
    const x = 0.8 + i * 4.15;
    const y = 2.6;
    addCard(s, { x, y, w: pW, h: pH, accent: p.color });

    // persona icon (pixel wizard tiny)
    addPixelWizard(s, x + pW / 2, y + 0.75, 0.08, p.color, p.color);

    s.addText(p.title, {
      x: x + 0.25, y: y + 1.45, w: pW - 0.5, h: 0.4,
      fontFace: FONT_HEAD, fontSize: 15, bold: true, color: p.color, align: 'center', margin: 0,
    });
    s.addText(p.sub, {
      x: x + 0.25, y: y + 1.85, w: pW - 0.5, h: 0.4,
      fontFace: FONT_BODY, fontSize: 12, italic: true, color: C.muted, align: 'center', margin: 0,
    });

    s.addText(p.points.join('\n'), {
      x: x + 0.3, y: y + 2.35, w: pW - 0.6, h: 1.8,
      fontFace: FONT_BODY, fontSize: 12, color: C.body,
      lineSpacingMultiple: 1.35, margin: 0,
    });
  });

  addFooter(s, 11, TOTAL, '03 · USERS & REVENUE / USERS');
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 12 — REVENUE MODEL
// ═══════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBackground(s);
  addCornerBrackets(s);

  sparkLabel(s, 0.8, 0.55, '03 · REVENUE MODEL', C.cyan, 10);

  s.addText('How does it make money — without selling users?', {
    x: 0.8, y: 0.95, w: 12, h: 0.9,
    fontFace: FONT_HEAD, fontSize: 28, bold: true, color: C.body, margin: 0,
  });

  s.addText('Every revenue path must pass the test: can we earn without breaking the anonymity promise?', {
    x: 0.8, y: 1.85, w: 12, h: 0.5,
    fontFace: FONT_BODY, fontSize: 14, italic: true, color: C.muted, margin: 0,
  });

  const streams = [
    {
      tag:   'A',
      color: C.cyan,
      title: 'Relayer fee markup',
      sub:   'primary stream · day 1',
      body:  'Users pay a small premium (~15-30%) over raw gas. Relayer covers the tx; the spread funds operations. Zero PII collected.',
      pass:  true,
    },
    {
      tag:   'B',
      color: C.violet,
      title: 'NFT secondary royalty',
      sub:   'opt-in · non-soulbound mode',
      body:  'If a user opts into transferable spirits, Wizper takes 2-5% royalty on secondary sales via ERC-2981. Collectors pay, creators and platform share.',
      pass:  true,
    },
    {
      tag:   'C',
      color: C.gold,
      title: 'Identity insurance (freemium)',
      sub:   'premium tier',
      body:  'Backup your Semaphore identity to an encrypted recovery service (client-side E2E encrypted key shards). $3/mo for peace of mind.',
      pass:  true,
    },
    {
      tag:   'D',
      color: C.green,
      title: 'Aggregated sentiment API',
      sub:   'B2B · k-anonymous only',
      body:  'Brands and researchers query emotion trends over text signals, with k-anonymity guarantees. Never sells per-user data — it literally can\'t.',
      pass:  true,
    },
  ];

  const sw = 5.9, sh = 2.0;
  const positions = [
    [0.8, 2.55], [6.75, 2.55],
    [0.8, 4.75], [6.75, 4.75],
  ];
  streams.forEach((st, i) => {
    const [x, y] = positions[i];
    addCard(s, { x, y, w: sw, h: sh, accent: st.color });

    // Tag letter
    s.addShape(pres.shapes.OVAL, {
      x: x + 0.25, y: y + 0.25, w: 0.55, h: 0.55,
      fill: { color: st.color }, line: { type: 'none' },
    });
    s.addText(st.tag, {
      x: x + 0.25, y: y + 0.3, w: 0.55, h: 0.45,
      fontFace: FONT_HEAD, fontSize: 16, bold: true, color: C.bg,
      align: 'center', margin: 0,
    });

    s.addText(st.title, {
      x: x + 0.95, y: y + 0.22, w: sw - 1.2, h: 0.4,
      fontFace: FONT_HEAD, fontSize: 15, bold: true, color: st.color, margin: 0,
    });
    s.addText(st.sub, {
      x: x + 0.95, y: y + 0.62, w: sw - 1.2, h: 0.3,
      fontFace: FONT_BODY, fontSize: 11, italic: true, color: C.muted, margin: 0,
    });
    s.addText(st.body, {
      x: x + 0.25, y: y + 1.0, w: sw - 0.5, h: 0.95,
      fontFace: FONT_BODY, fontSize: 12, color: C.body,
      lineSpacingMultiple: 1.4, margin: 0,
    });
  });

  addFooter(s, 12, TOTAL, '03 · USERS & REVENUE / REVENUE');
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 13 — CLOSING
// ═══════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addBackground(s);
  addCornerBrackets(s, C.gold);

  // Tiny wizard
  addPixelWizard(s, W / 2, 2.0, 0.16);

  s.addText('Be heard', {
    x: 0, y: 3.2, w: W, h: 0.9,
    fontFace: FONT_HEAD, fontSize: 58, bold: true, color: C.cyan, align: 'center', margin: 0,
  });
  s.addText('without being known.', {
    x: 0, y: 4.1, w: W, h: 0.9,
    fontFace: FONT_HEAD, fontSize: 58, bold: true, color: C.violet, align: 'center', margin: 0,
  });

  s.addText('wizper — a place to release, remember, and recognize each other.', {
    x: 0, y: 5.4, w: W, h: 0.4,
    fontFace: FONT_BODY, fontSize: 15, italic: true, color: C.muted, align: 'center', margin: 0,
  });

  s.addText('thank you', {
    x: 0, y: 6.5, w: W, h: 0.4,
    fontFace: FONT_HEAD, fontSize: 11, color: C.gold, align: 'center', charSpacing: 8, margin: 0,
  });
}

// ═══════════════════════════════════════════════════════════════════════
pres.writeFile({ fileName: 'Wizper-Pitch.pptx' }).then(fn => {
  console.log('wrote', fn);
});
