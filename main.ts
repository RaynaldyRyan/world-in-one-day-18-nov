// The World in One Day — Wednesday 18 November 2026
// Draws a 1024x1024 newspaper-style poster summing up the day's world news.
// Node 22, standard library only. No network, no randomness, fully deterministic:
// two runs write byte-identical PNGs.
//
// Layout: navy masthead with title + date, a subhead strip, six dated story
// panels in a 2x3 grid (one per major story), and a footer line.

import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------------------
// 5x7 bitmap font. Every glyph is 7 rows of 5 bits ("1" = ink). All text is
// rendered in capitals, so only capitals, digits and punctuation are defined.
// ---------------------------------------------------------------------------
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "#": ["01010", "01010", "11111", "01010", "11111", "01010", "01010"],
  "*": ["00000", "10101", "01110", "10101", "00000", "00000", "00000"],
  _: ["00000", "00000", "00000", "00000", "00000", "00000", "11111"],
  "[": ["01110", "01000", "01000", "01000", "01000", "01000", "01110"],
  "]": ["01110", "00010", "00010", "00010", "00010", "00010", "01110"],
  "<": ["00010", "00100", "01000", "10000", "01000", "00100", "00010"],
  ">": ["01000", "00100", "00010", "00001", "00010", "00100", "01000"],
  "|": ["00100", "00100", "00100", "00100", "00100", "00100", "00100"],
  "\\": ["10000", "01000", "01000", "00100", "00010", "00010", "00001"],
};

// ---------------------------------------------------------------------------
// Canvas: 24-bit RGB framebuffer + drawing primitives.
// ---------------------------------------------------------------------------
type RGB = [number, number, number];

const PAPER: RGB = [245, 239, 227];
const INK: RGB = [26, 26, 26];
const BODY: RGB = [58, 54, 46];
const NAVY: RGB = [22, 35, 63];
const GOLD: RGB = [232, 182, 76];
const WHITE: RGB = [255, 253, 248];
const RULE: RGB = [179, 32, 44];
const PANEL_LINE: RGB = [203, 192, 172];

const fb = new Uint8Array(W * H * 3);

function setPixel(x: number, y: number, c: RGB): void {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 3;
  fb[i] = c[0];
  fb[i + 1] = c[1];
  fb[i + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) setPixel(xx, yy, c);
  }
}

function strokeRect(x: number, y: number, w: number, h: number, c: RGB): void {
  fillRect(x, y, w, 1, c);
  fillRect(x, y + h - 1, w, 1, c);
  fillRect(x, y, 1, h, c);
  fillRect(x + w - 1, y, 1, h, c);
}

function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) setPixel(x, y, c);
    }
  }
}

function strokeCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let a = 0; a < 360; a++) {
    const rad = (a * Math.PI) / 180;
    setPixel(Math.round(cx + r * Math.cos(rad)), Math.round(cy + r * Math.sin(rad)), c);
  }
}

// ---------------------------------------------------------------------------
// Text: draw one glyph, measure text, draw text, word-wrap.
// ---------------------------------------------------------------------------
function charAdvance(scale: number): number {
  return 5 * scale + scale; // 5 glyph columns + 1 column gap, both scaled
}

function textWidth(text: string, scale: number): number {
  const t = text.toUpperCase();
  if (t.length === 0) return 0;
  return t.length * charAdvance(scale) - scale;
}

function drawChar(ch: string, x: number, y: number, scale: number, c: RGB): void {
  const glyph = FONT[ch] ?? FONT["?"];
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 5; col++) {
      if (glyph[row][col] === "1") {
        fillRect(x + col * scale, y + row * scale, scale, scale, c);
      }
    }
  }
}

function drawText(text: string, x: number, y: number, scale: number, c: RGB): void {
  const t = text.toUpperCase();
  let cx = x;
  for (const ch of t) {
    drawChar(ch, cx, y, scale, c);
    cx += charAdvance(scale);
  }
}

function drawTextCentered(text: string, cx: number, y: number, scale: number, c: RGB): void {
  drawText(text, cx - Math.floor(textWidth(text, scale) / 2), y, scale, c);
}

// Greedy word wrap: returns at most maxLines lines fitting maxWidth px.
function wrapText(text: string, scale: number, maxWidth: number, maxLines: number): string[] {
  const words = text.toUpperCase().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const trial = cur === "" ? word : cur + " " + word;
    if (textWidth(trial, scale) <= maxWidth) {
      cur = trial;
    } else {
      if (cur !== "") lines.push(cur);
      cur = word;
    }
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && cur !== "") lines.push(cur);
  return lines.slice(0, maxLines);
}

// ---------------------------------------------------------------------------
// PNG encoder: signature, IHDR, IDAT (zlib deflate, filter 0), IEND.
// CRC-32 (IEEE) table built once; deflate output is deterministic.
// ---------------------------------------------------------------------------
const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type 2 = RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Raw scanlines: filter byte 0 + RGB triplets per row.
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(fb.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// The day's news — six stories, all reported on Wednesday 18 November 2026.
// Sources: wire and major-outlet reporting of the day (Reuters, AP, BBC,
// Al Jazeera, UN briefings, as carried by the day's news roundups).
// ---------------------------------------------------------------------------
interface Story {
  num: string;
  kicker: string;
  accent: RGB;
  headline: string[]; // pre-split lines, scale 3
  body: string;
  fact: string; // one-line key figure, drawn in the accent colour at the panel foot
}

const STORIES: Story[] = [
  {
    num: "1",
    kicker: "THE GULF",
    accent: [179, 32, 44],
    headline: ["US STRIKES IRAN,", "IRAN HITS BACK"],
    body: "US jets hit a Revolutionary Guard missile site on Qeshm Island. Iran fired drones at US radar sites in Bahrain and Kuwait.",
    fact: "3RD ATTACK ON BAHRAIN IN A WEEK",
  },
  {
    num: "2",
    kicker: "UKRAINE",
    accent: [31, 78, 121],
    headline: ["KERCH BRIDGE HIT", "FOR SECOND DAY"],
    body: "Ukraine struck the bridge to occupied Crimea again and part of a road span fell into the strait. Russia hit bridges of its own.",
    fact: "BRIDGE SHUT AFTER 2ND NIGHT",
  },
  {
    num: "3",
    kicker: "ASIA-PACIFIC",
    accent: [15, 118, 110],
    headline: ["APEC OPENS", "IN SHENZHEN"],
    body: "Xi Jinping opened the APEC summit in Shenzhen, urging free trade and AI cooperation. A first Trump-Xi-Putin summit follows on Thursday.",
    fact: "21 APEC ECONOMIES MEET IN SHENZHEN",
  },
  {
    num: "4",
    kicker: "UNITED STATES",
    accent: [124, 45, 18],
    headline: ["DEMOCRATS FLIP", "ALASKA SENATE SEAT"],
    body: "Mary Peltola defeated Dan Sullivan in Alaska, giving Democrats 56 seats in the Senate - a historic flip in congressional politics.",
    fact: "SENATE NOW 56 DEMOCRAT SEATS",
  },
  {
    num: "5",
    kicker: "PUBLIC HEALTH",
    accent: [21, 128, 61],
    headline: ["AMERICA LOSES", "MEASLES-FREE STATUS"],
    body: "Health authorities stripped the US of measles elimination status after 26 years, with more than 5,400 cases reported in 2026.",
    fact: "5,400+ CASES IN 2026 - A 40-YEAR HIGH",
  },
  {
    num: "6",
    kicker: "AFRICA",
    accent: [180, 83, 9],
    headline: ["EBOLA CASES MORE", "THAN DOUBLE"],
    body: "The Ebola outbreak in DR Congo has passed 11,000 cases and 5,400 deaths, the UN said - more than double three months ago.",
    fact: "11,000+ CASES - 5,400 DEATHS, UN SAYS",
  },
];

// ---------------------------------------------------------------------------
// Draw the poster.
// ---------------------------------------------------------------------------
function drawPoster(): void {
  fillRect(0, 0, W, H, PAPER);

  // ---- Masthead ------------------------------------------------------------
  fillRect(0, 0, W, 168, NAVY);
  drawTextCentered("THE WORLD IN ONE DAY", W / 2, 30, 5, WHITE);
  drawTextCentered("WEDNESDAY 18 NOVEMBER 2026", W / 2, 104, 3, GOLD);
  fillRect(0, 168, W, 6, RULE);

  // Small globe emblem at the right of the masthead: gold ring, latitude
  // chords and a vertical meridian ellipse.
  const gx = 924;
  const gy = 84;
  strokeCircle(gx, gy, 40, GOLD);
  // Latitude chords at -20, 0 and +20 px from the centre.
  for (const dy of [-20, 0, 20]) {
    const half = Math.floor(Math.sqrt(Math.max(0, 40 * 40 - dy * dy)));
    fillRect(gx - half, gy + dy - 1, half * 2, 2, GOLD);
  }
  // Vertical meridian: an ellipse 16 px wide, 40 px tall.
  for (let a = 0; a < 360; a++) {
    const rad = (a * Math.PI) / 180;
    setPixel(Math.round(gx + 16 * Math.cos(rad)), Math.round(gy + 40 * Math.sin(rad)), GOLD);
  }
  fillRect(gx - 2, gy - 40, 2, 80, GOLD);

  // ---- Subhead strip -------------------------------------------------------
  drawTextCentered("SIX STORIES THAT DEFINED THE DAY", W / 2, 190, 2, INK);
  fillRect(212, 218, 600, 2, PANEL_LINE);

  // ---- Story grid: 2 columns x 3 rows --------------------------------------
  const margin = 24;
  const gutter = 16;
  const panelW = (W - margin * 2 - gutter) / 2; // 480
  const panelH = 232;
  const top = 232;
  const rowGap = 16;

  STORIES.forEach((story, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = margin + col * (panelW + gutter);
    const y = top + row * (panelH + rowGap);

    // Panel body + border.
    fillRect(x, y, panelW, panelH, WHITE);
    strokeRect(x, y, panelW, panelH, PANEL_LINE);

    // Accent band with story number and region kicker.
    fillRect(x, y, panelW, 40, story.accent);
    fillCircle(x + 28, y + 20, 13, WHITE);
    drawTextCentered(story.num, x + 28, y + 12, 2, story.accent);
    drawText(story.kicker, x + 52, y + 12, 2, WHITE);

    // Headline, two lines, scale 3.
    let hy = y + 54;
    for (const line of story.headline) {
      drawText(line, x + 16, hy, 3, INK);
      hy += 26;
    }

    // Body text, wrapped, scale 2, up to 4 lines.
    const lines = wrapText(story.body, 2, panelW - 32, 4);
    let by = y + 118;
    for (const line of lines) {
      drawText(line, x + 16, by, 2, BODY);
      by += 18;
    }

    // Key-figure strip at the panel foot: thin rule + accent-coloured fact.
    fillRect(x + 16, y + panelH - 32, panelW - 32, 2, PANEL_LINE);
    drawText(story.fact, x + 16, y + panelH - 24, 2, story.accent);
  });

  // ---- Footer --------------------------------------------------------------
  drawTextCentered("ALL EVENTS REPORTED ON WEDNESDAY 18 NOVEMBER 2026", W / 2, 962, 2, INK);
  drawTextCentered("COMPILED FROM WIRE REPORTS AND MAJOR NEWS OUTLETS", W / 2, 988, 2, BODY);
}

// ---------------------------------------------------------------------------
// Main: draw, encode, write to $MAKEFUN_OUTPUT_DIR/entry.png (default /output).
// ---------------------------------------------------------------------------
function main(): void {
  drawPoster();
  const png = encodePNG();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "entry.png");
  fs.writeFileSync(outPath, png);
}

main();
