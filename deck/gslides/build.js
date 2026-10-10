// Builds scrawl-pitch-deck.pptx: the pitch deck as native, editable slides (text, shapes and pictures),
// meant to be uploaded to Google Drive and opened as Google Slides.
const path = require("path");
const pptxgen = require("pptxgenjs");
const SKILL = "/Users/alphataco/.claude/skills/synced/f724c7e2-cd04-4fb5-a202-5c6b4ed43dae_98c386c3-1e1a-4b65-a717-d6affcc26450/pptx";
const { applyTheme } = require(path.join(SKILL, "scripts/apply_theme.js"));

const ROOT = path.resolve(__dirname, "..", "..");
const IMG = (p) => path.join(ROOT, p);

const THEME = {
  name: "Scrawl",
  headFontFace: "Orbitron",
  bodyFontFace: "Orbitron",
  colors: {
    dk1: "0A0014", lt1: "F4F0FF", dk2: "1800AD", lt2: "B9B0E6",
    accent1: "C1FF72", accent2: "FF9BF5", accent3: "FBBF24", accent4: "1800AD", accent5: "6EE7B7", accent6: "F87171",
    hlink: "C1FF72", folHlink: "FF9BF5",
  },
};
const NIGHT = "0A0014", INDIGO = "1800AD", LIME = "C1FF72", PINK = "FF9BF5", PAPER = "F4F0FF", MUTE = "B9B0E6", PANEL = "2A1A78";
const PIXEL = "Press Start 2P";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
pres.title = "Scrawl Pitch Deck";
pres.author = "Scrawl";
const C = pres.SchemeColor;

pres.defineSlideMaster({
  title: "SCRAWL_CONTENT",
  background: { path: path.join(__dirname, "bg.png") },
  objects: [],
  slideNumber: { x: 12.2, y: 7.0, w: 0.8, h: 0.3, fontFace: PIXEL, fontSize: 10, color: LIME, align: "right" },
});

const W = 13.333;
const X0 = 0.7;
const CW = W - 2 * X0; // content width

// ---------- helpers ----------
function tag(slide, text, y = 0.55) {
  slide.addText(text.toUpperCase(), { x: X0, y, w: CW, h: 0.3, fontFace: PIXEL, fontSize: 10, color: C.accent1, margin: 0, isTextBox: true, objectName: "Tag" });
}
function title(slide, text, y = 0.95, h = 1.1, size = 34) {
  slide.addText(text, { x: X0, y, w: CW, h, fontFace: "Orbitron", fontSize: size, bold: true, italic: true, color: C.accent1, margin: 0, valign: "top", fit: "shrink", isTextBox: true, objectName: "Title" });
}
// A bordered card with a hard offset shadow, like the app's boxes. Returns nothing; text goes in as runs.
function card(slide, x, y, w, h, runs, opts = {}) {
  const fill = opts.fill || NIGHT;
  const shadow = opts.shadow || INDIGO;
  slide.addShape(pres.ShapeType.roundRect, { x: x + 0.09, y: y + 0.09, w, h, fill: { color: shadow }, line: { color: shadow, width: 0 }, rectRadius: 0.14, objectName: "Card shadow" });
  slide.addText(runs || "", {
    shape: pres.ShapeType.roundRect, x, y, w, h, rectRadius: 0.14,
    fill: { color: fill }, line: { color: LIME, width: 2.5 },
    margin: [11, 14, 11, 14], valign: "top", fontFace: "Orbitron", fontSize: 14, color: PAPER, objectName: opts.name || "Card",
  });
}
const head = (t) => ({ text: t, options: { bold: true, color: LIME, fontSize: 16, breakLine: true, paraSpaceAfter: 6 } });
const body = (t, last) => ({ text: t, options: { color: MUTE, fontSize: 14, breakLine: !last } });

function newSlide(sectionTitle) {
  return pres.addSlide({ masterName: "SCRAWL_CONTENT", sectionTitle });
}

// ---------- 1 title ----------
pres.addSection({ title: "Intro" });
{
  const s = newSlide("Intro");
  s.addImage({ path: IMG("assets/logo.png"), x: X0, y: 0.75, w: 2.0, h: 2.0, altText: "Scrawl logo", objectName: "Logo" });
  s.addText("SCRAWL", { x: X0, y: 3.0, w: 8, h: 1.1, fontFace: "Orbitron", fontSize: 60, bold: true, color: C.accent1, margin: 0, isTextBox: true, objectName: "Title" });
  s.addText([
    { text: "Draw your futures. ", options: { color: LIME, bold: true } },
    { text: "Sketch the next 60 seconds of SOL, stake it on Solana, get scored on every move.", options: { color: PAPER } },
  ], { x: X0, y: 4.15, w: 8.4, h: 1.1, fontFace: "Orbitron", fontSize: 20, margin: 0, valign: "top", isTextBox: true, objectName: "Subtitle" });
  s.addText("SOLANA MOBILE HACKATHON  /  MOBILE TRACK  /  ANDROID  /  DEVNET", { x: X0, y: 5.5, w: 11, h: 0.3, fontFace: PIXEL, fontSize: 10, color: LIME, margin: 0, isTextBox: true, objectName: "Tag" });
  s.addImage({ path: IMG("deck/img/nyan-fade.png"), x: 6.1, y: 5.15, w: 7.0, h: 2.23, altText: "Nyan Cat running with a rainbow trail", objectName: "Nyan Cat" });
}

// ---------- 2 problem ----------
pres.addSection({ title: "Problem and idea" });
{
  const s = newSlide("Problem and idea");
  tag(s, "The problem");
  title(s, "Perps look like a cockpit. Most people never try one");
  const items = [
    ["Order books", "Limit, stop, reduce-only. Three tabs before you place a bet on a price."],
    ["Liquidation maths", "Margin, funding, maintenance. A wrong number and the position is gone."],
    ["Built for a desk", "Tiny charts and dense tables, on a screen you hold in one hand."],
  ];
  items.forEach(([h, b], i) => card(s, X0 + i * 4.15, 2.65, 3.8, 2.1, [head(h), body(b, true)]));
  s.addText("Phones are where people already have a wallet and a minute to spare. Nobody has made a market view that is native to that.", {
    x: X0, y: 5.4, w: 10.5, h: 1.0, fontFace: "Orbitron", fontSize: 18, color: PAPER, margin: 0, valign: "top", isTextBox: true, objectName: "Takeaway",
  });
}

// ---------- 3 idea ----------
{
  const s = newSlide("Problem and idea");
  tag(s, "The idea");
  title(s, "A futures trade, expressed as a drawing");
  const steps = [
    ["1", "Draw", "Trace where you think SOL goes over the next minute, with your finger."],
    ["2", "Stake", "Pick 0.01 SOL or more and leverage up to 100x. Approve once in your wallet."],
    ["3", "Score", "Every second's move is checked against your line. Call the direction right more than half the time and you profit."],
  ];
  steps.forEach(([n, h, b], i) => {
    const x = X0 + i * 4.15;
    card(s, x, 2.55, 3.8, 2.75, [
      { text: n, options: { fontFace: PIXEL, fontSize: 20, color: LIME, breakLine: true, paraSpaceAfter: 8 } },
      head(h), body(b, true),
    ], { fill: "140A5C", shadow: LIME });
  });
  s.addText("No order types, no liquidation price, no guessing where to click. One gesture, one minute, one number.", {
    x: X0, y: 5.7, w: 10.8, h: 0.8, fontFace: "Orbitron", fontSize: 16, color: MUTE, margin: 0, valign: "top", isTextBox: true, objectName: "Takeaway",
  });
}

// ---------- 4 product ----------
pres.addSection({ title: "Product" });
{
  const s = newSlide("Product");
  tag(s, "The app / captured on a phone, devnet");
  title(s, "Draw. Watch. Settle");
  const H = 4.0;
  const shots = [
    ["deck/img/draw.png", 1080 / 1860, "DRAW & PULL", "Drawing pad, time chips, stake and the SCRAWL lever"],
    ["deck/img/round.png", 1080 / 2030, "WATCH THE CLOCK", "Live round: your dotted line against the real price"],
    ["deck/img/result.png", 1080 / 2030, "SETTLED ON-CHAIN", "Result with accuracy, payout and transaction links"],
  ];
  const widths = shots.map(([, r]) => H * r);
  const gap = 0.9;
  const total = widths.reduce((a, b) => a + b, 0) + gap * 2;
  let x = (W - total) / 2;
  shots.forEach(([p, r, cap, alt], i) => {
    const w = widths[i];
    s.addShape(pres.ShapeType.roundRect, { x: x - 0.06, y: 1.97, w: w + 0.12, h: H + 0.12, fill: { color: NIGHT }, line: { color: LIME, width: 3 }, rectRadius: 0.1, objectName: "Phone frame" });
    s.addImage({ path: IMG(p), x, y: 2.03, w, h: H, altText: alt, objectName: "Screenshot" });
    s.addText(cap, { x: x - 0.4, y: 6.2, w: w + 0.8, h: 0.4, fontFace: PIXEL, fontSize: 10, color: LIME, align: "center", margin: 0, isTextBox: true, objectName: "Caption" });
    x += w + gap;
  });
}

// ---------- 5 scoring ----------
{
  const s = newSlide("Product");
  tag(s, "How a round is scored");
  title(s, "Direction, second by second");
  s.addText("The round has 60 samples, one per second. At each step we compare which way your line moved with which way the real price moved. Steps where the price did not tick are skipped.", {
    x: X0, y: 2.1, w: 6.3, h: 1.5, fontFace: "Orbitron", fontSize: 14, color: PAPER, margin: 0, valign: "top", isTextBox: true, objectName: "Explanation",
  });
  card(s, X0, 3.75, 6.3, 2.0, [
    { text: "accuracy = right calls / compared steps", options: { fontFace: PIXEL, fontSize: 10, color: PAPER, breakLine: true, paraSpaceAfter: 9 } },
    { text: "PnL = (2 x accuracy - 1) x max profit", options: { fontFace: PIXEL, fontSize: 10, color: LIME, breakLine: true, paraSpaceAfter: 9 } },
    { text: "max profit = |price move| x stake / start price x leverage", options: { fontFace: PIXEL, fontSize: 10, color: PAPER } },
  ], { name: "Formula" });
  s.addText("Loss is floored at your stake. Fee is 2% of profit only.", { x: X0, y: 6.05, w: 6.3, h: 0.4, fontFace: "Orbitron", fontSize: 14, color: MUTE, margin: 0, isTextBox: true, objectName: "Note" });

  const ex = [["Stake", "0.50 SOL at 10x"], ["SOL move", "$109.00 to $109.05"], ["Max profit", "0.0025 SOL"], ["Accuracy", "70%"], ["PnL", "+0.0010 SOL"]];
  const runs = [{ text: "EXAMPLE / ILLUSTRATIVE", options: { fontFace: PIXEL, fontSize: 10, color: LIME, breakLine: true, paraSpaceAfter: 10 } }];
  ex.forEach(([k, v], i) => {
    runs.push({ text: k + "   ", options: { bold: true, color: LIME, fontSize: 14 } });
    runs.push({ text: v, options: { color: PAPER, fontSize: 14, breakLine: i < ex.length - 1 } });
  });
  card(s, 7.55, 2.1, 5.1, 3.2, runs, { fill: "140A5C", shadow: LIME, name: "Example" });
  // accuracy meter: 70% filled, break-even marker at 50%
  const mx = 7.55, mw = 5.1, my = 5.65;
  s.addShape(pres.ShapeType.roundRect, { x: mx, y: my, w: mw, h: 0.32, fill: { color: NIGHT }, line: { color: LIME, width: 2.5 }, rectRadius: 0.16, objectName: "Meter track" });
  s.addShape(pres.ShapeType.roundRect, { x: mx + 0.05, y: my + 0.05, w: (mw - 0.1) * 0.7, h: 0.22, fill: { color: LIME }, line: { color: LIME, width: 0 }, rectRadius: 0.1, objectName: "Meter fill" });
  s.addShape(pres.ShapeType.rect, { x: mx + mw * 0.5 - 0.02, y: my - 0.05, w: 0.05, h: 0.42, fill: { color: PINK }, line: { color: PINK, width: 0 }, objectName: "Break-even mark" });
  s.addText("The pink mark is 50%: break-even. Right of it you win, left of it you lose.", { x: mx, y: my + 0.45, w: mw, h: 0.5, fontFace: "Orbitron", fontSize: 12, color: MUTE, margin: 0, valign: "top", isTextBox: true, objectName: "Meter note" });
}

// ---------- 6 mobile ----------
pres.addSection({ title: "Build" });
{
  const s = newSlide("Build");
  tag(s, "Built for Solana Mobile");
  title(s, "The whole loop fits in a thumb and a minute");
  const items = [
    ["Mobile Wallet Adapter 2.0", "Connect, authorize and sign through the wallet already on the phone. The auth token is cached in secure storage and refreshed silently."],
    ["Sign here, submit from the app", "The wallet only signs. The app checks what came back (only fee instructions may be added), then sends it through its own RPC."],
    ["Made for a small screen", "A finger-drawn canvas, a slot-machine lever, haptics on every pull and result, and the screen stays awake during a round."],
    ["Wallet errors that make sense", "Backing out of the wallet is a retry, not a failure. A fresh blockhash is fetched after approval so devnet's short expiry does not bite."],
  ];
  items.forEach(([h, b], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    card(s, X0 + col * 6.2, 2.45 + row * 2.2, 5.85, 1.95, [head(h), body(b, true)]);
  });
}

// ---------- 7 architecture ----------
{
  const s = newSlide("Build");
  tag(s, "On-chain design");
  title(s, "Stakes in a vault. Results written by a settler", 0.95, 0.6, 30);
  const box = (x, y, w, h, t, sub, hot) => {
    s.addText([
      { text: t, options: { bold: true, color: LIME, fontSize: 15, breakLine: true } },
      { text: sub, options: { color: hot ? PAPER : MUTE, fontSize: 12 } },
    ], { shape: pres.ShapeType.roundRect, x, y, w, h, rectRadius: 0.12, fill: { color: hot ? INDIGO : NIGHT }, line: { color: LIME, width: 2.5 }, margin: [8, 10, 8, 10], valign: "middle", fontFace: "Orbitron", objectName: t });
  };
  const bw = 3.0, bh = 1.0;
  const c1 = 1.1, c2 = 5.15, c3 = 9.2;
  const r1 = 1.95, r2 = 3.55, r3 = 5.15;
  box(c1, r1, bw, bh, "Scrawl app", "draw, hash, stake");
  box(c1, r2, bw, bh, "Wallet", "Mobile Wallet Adapter");
  box(c2, r2 - 0.25, bw, bh + 0.5, "Futures program", "Vault PDA holds SOL. Position PDA per bet. open / close, pause, fee, pnl bounds", true);
  box(c3, r2, bw, bh, "Settler", "scores and closes");
  box(c3, r3, bw, bh, "Price feed", "SOL/USDT, per second");
  const arrow = (x, y, w, h, flipH, flipV) => s.addShape(pres.ShapeType.line, { x, y, w, h, flipH: !!flipH, flipV: !!flipV, line: { color: LIME, width: 3, endArrowType: "triangle" }, objectName: "Arrow" });
  const label = (t, x, y) => s.addText(t, { x, y, w: 1.3, h: 0.3, fontFace: PIXEL, fontSize: 9, color: PINK, margin: 0, isTextBox: true, objectName: "Arrow label" });
  arrow(c1 + bw / 2, r1 + bh, 0, r2 - r1 - bh);               // app -> wallet
  label("SIGN", c1 + bw / 2 + 0.15, r1 + bh + 0.25);
  arrow(c1 + bw, r2 + bh / 2, c2 - c1 - bw, 0);                // wallet -> program
  label("STAKE", c1 + bw + 0.2, r2 + bh / 2 - 0.4);
  arrow(c3, r2 + bh / 2, -(c3 - c2 - bw), 0, true);             // settler -> program (points left)
  label("CLOSE", c2 + bw + 0.2, r2 + bh / 2 - 0.4);
  arrow(c3 + bw / 2, r3, 0, -(r3 - r2 - bh), false, true);      // feed -> settler (points up)
  label("PRICES", c3 + bw / 2 + 0.15, r3 - 0.5);

  card(s, X0, 6.35, CW - 0.1, 0.8, [
    { text: "Program   ", options: { bold: true, color: LIME, fontSize: 12 } },
    { text: "FYHebuyTZwg2JWaHTHtRY7xCYgEHpiX1Frq98Awzkhtu", options: { fontFace: PIXEL, fontSize: 9, color: PAPER } },
    { text: "     Cluster ", options: { bold: true, color: LIME, fontSize: 12 } },
    { text: "Solana devnet", options: { color: PAPER, fontSize: 12 } },
  ], { fill: "140A5C", shadow: LIME, name: "Program id" });
}

// ---------- 8 trust ----------
{
  const s = newSlide("Build");
  tag(s, "Trust model");
  title(s, "What is checked, and what is still trusted");
  const bullets = (items) => items.map((t, i) => ({ text: t, options: { bullet: true, color: PAPER, fontSize: 14, breakLine: i < items.length - 1, paraSpaceAfter: 8 } }));
  card(s, X0, 2.45, 5.85, 3.9, [head("Enforced on-chain"), ...bullets([
    "Only the settler key can close a position, and only after 60 seconds",
    "PnL is bounded to between your stake lost and stake x leverage",
    "The drawing's hash is stored before the round starts; a different drawing is rejected",
    "Fee on profit only, pause switch, a vault that cannot go below rent",
  ])], { fill: "140A5C", shadow: LIME, name: "Enforced" });
  card(s, X0 + 6.2, 2.45, 5.85, 3.9, [head("Trusted today"), ...bullets([
    "The settler records prices from a public exchange feed and scores the round",
    "One settler key, held off-device",
    "Emergency withdraw exists, as a demo-stage switch",
  ]), { text: "Next: read prices from an on-chain oracle so the score can be checked by anyone.", options: { color: MUTE, fontSize: 14, breakLine: false } }], { name: "Trusted" });
}

// ---------- 9 stickiness ----------
pres.addSection({ title: "Traction and plan" });
{
  const s = newSlide("Traction and plan");
  tag(s, "Why people come back");
  title(s, "One minute at a time. Easy to do twice");
  const items = [
    ["A loop you can finish on a bus", "Every position is 60 seconds. Stack up to five back to back with one approval."],
    ["Streaks and a daily bonus", "Play on consecutive days to build a streak and claim play currency."],
    ["Practice with NYAN", "No wallet or funds needed to learn the feel. Switch to devnet SOL when ready."],
  ];
  items.forEach(([h, b], i) => card(s, X0, 2.3 + i * 1.5, 6.4, 1.3, [head(h), body(b, true)]));
  card(s, 7.7, 2.3, 4.95, 2.9, [
    { text: "PICK YOUR HORIZON", options: { fontFace: PIXEL, fontSize: 10, color: LIME, breakLine: true } },
  ], { fill: "140A5C", shadow: LIME, name: "Horizon" });
  for (let i = 1; i <= 5; i++) {
    s.addImage({ path: IMG(`assets/ui/chip-${i}.png`), x: 7.95 + (i - 1) * 0.9, y: 2.95, w: 0.8, h: 0.8, altText: `${i} minute chip`, objectName: `Chip ${i}` });
  }
  s.addText("A 3-minute pick is three 60-second positions, staked in one transaction and settled one by one.", {
    x: 7.95, y: 3.95, w: 4.45, h: 1.1, fontFace: "Orbitron", fontSize: 14, color: MUTE, margin: 0, valign: "top", isTextBox: true, objectName: "Horizon note",
  });
}

// ---------- 10 status ----------
{
  const s = newSlide("Traction and plan");
  tag(s, "Where it stands");
  title(s, "What has been run, and what has not");
  const rows = [
    ["DONE", "Anchor program deployed to devnet, with 19 passing tests covering every instruction and failure path"],
    ["DONE", "Settler verified end to end on devnet: stake, drawing registered, scored, position closed, tampered drawing rejected"],
    ["DONE", "Full rounds played on a physical Android phone with a real wallet, stake and payout visible on the explorer"],
    ["NEXT", "Multi-minute batches and a winning-payout round on device"],
    ["NEXT", "Release APK with an https settler so anyone can install and play"],
    ["NEXT", "A shared leaderboard read from program events (today it is on the device)"],
  ];
  s.addShape(pres.ShapeType.roundRect, { x: X0 + 0.09, y: 2.34, w: CW - 0.1, h: 4.6, fill: { color: INDIGO }, line: { color: INDIGO, width: 0 }, rectRadius: 0.14, objectName: "Card shadow" });
  s.addShape(pres.ShapeType.roundRect, { x: X0, y: 2.25, w: CW - 0.1, h: 4.6, fill: { color: NIGHT }, line: { color: LIME, width: 2.5 }, rectRadius: 0.14, objectName: "Status card" });
  rows.forEach(([st, t], i) => {
    const y = 2.45 + i * 0.7;
    const done = st === "DONE";
    s.addText(st, { shape: pres.ShapeType.roundRect, x: X0 + 0.3, y, w: 0.95, h: 0.4, rectRadius: 0.2, fill: { color: done ? LIME : NIGHT }, line: { color: done ? LIME : PINK, width: 2 }, fontFace: PIXEL, fontSize: 9, color: done ? INDIGO : PINK, align: "center", valign: "middle", margin: 0, objectName: "Status " + st });
    s.addText(t, { x: X0 + 1.5, y: y - 0.06, w: CW - 2.0, h: 0.55, fontFace: "Orbitron", fontSize: 14, color: PAPER, margin: 0, valign: "middle", isTextBox: true, objectName: "Status text" });
  });
}

// ---------- 11 roadmap ----------
{
  const s = newSlide("Traction and plan");
  tag(s, "Roadmap");
  title(s, "From a one-phone demo to a game people share");
  const cols = [
    ["NOW", "Hackathon build", ["Release APK", "Demo video", "Hosted settler"]],
    ["NEXT", "Fair and social", ["On-chain price oracle", "Global leaderboard", "Push for settled rounds"]],
    ["LATER", "Open game", ["More assets and timeframes", "Seasons and rewards", "Verified app identity in wallets"]],
  ];
  cols.forEach(([t, h, items], i) => {
    card(s, X0 + i * 4.15, 2.45, 3.8, 3.4, [
      { text: t, options: { fontFace: PIXEL, fontSize: 10, color: LIME, breakLine: true, paraSpaceAfter: 8 } },
      head(h),
      ...items.map((it, k) => ({ text: it, options: { bullet: true, color: PAPER, fontSize: 14, breakLine: k < items.length - 1, paraSpaceAfter: 8 } })),
    ]);
  });
}

// ---------- 12 close ----------
{
  const s = newSlide("Traction and plan");
  tag(s, "Scrawl", 1.6);
  s.addText("Draw. Stake. Get scored.", { x: X0, y: 2.1, w: 11.5, h: 1.2, fontFace: "Orbitron", fontSize: 48, bold: true, italic: true, color: C.accent1, margin: 0, isTextBox: true, objectName: "Title" });
  s.addText("A futures game that fits in one thumb, on Solana Mobile.", { x: X0, y: 3.5, w: 10, h: 0.6, fontFace: "Orbitron", fontSize: 20, color: PAPER, margin: 0, isTextBox: true, objectName: "Subtitle" });
  s.addImage({ path: IMG("deck/img/nyan-fade.png"), x: 6.1, y: 5.15, w: 7.0, h: 2.23, altText: "Nyan Cat running with a rainbow trail", objectName: "Nyan Cat" });
}

const OUT = path.join(ROOT, "deck", "scrawl-pitch-deck.pptx");
pres.writeFile({ fileName: OUT }).then(async () => {
  await applyTheme(OUT, THEME);
  console.log("wrote", OUT);
});
