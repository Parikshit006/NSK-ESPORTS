/**
 * NSK ESPORTS — Free Fire MAX Scoreboard OCR Engine
 *
 * Specifically designed for Free Fire MAX post-match results layout:
 * - Two-Panel Horizontal Layout:
 *     - Left Column: Placements 1 to 5
 *     - Right Column: Placements 6 to 11/12
 * - Squad Structure:
 *     - 4 players per squad arranged in a 2x2 grid
 *     - Each player row: [IGN] [Number] Eliminations
 *     - Total squad kills = Sum of individual player eliminations
 * - Image Pre-processing:
 *     - Upscaling for low-res screenshots
 *     - Contrast-enhancement and binarization for bright gaming text on dark banners
 *     - Column-based cropping to prevent horizontal line bleeding
 */

import { createWorker } from 'tesseract.js';
import { normalizeIGN, matchSquadToTeams } from '../../../utils/fuzzyMatch.js';

/**
 * Common regex pattern to detect elimination entries:
 * Matches variations like:
 * "9TE iMOOGI 6 Eliminations"
 * "EASY_GAME> 1 Eliminations"
 * "GODR.HENT4I 7 Elimination"
 * "WKB-FAKER69 5 Elim"
 * "6 Eliminations"
 */
const ELIMINATION_REGEX = /^(.*?)\s*?(\d{1,2})\s*(?:eliminations?|elim|elims?|ellminations?|eliminatons?)\b/i;
const STANDALONE_ELIM_REGEX = /(\d{1,2})\s*(?:eliminations?|elim|elims?)\b/i;

/**
 * Filter out common UI words that are not player IGNs
 */
const UI_NOISE_WORDS = [
  'free fire', 'freefire', 'eliminations', 'elimination', 'elims',
  'back', 'match', 'result', 'booyah', 'winner', 'rank', 'squad'
];

/**
 * Parses a single text line to extract player IGN and kill count
 * @param {string} line - Raw text line from OCR
 * @returns {{ ign: string, kills: number, raw: string } | null}
 */
export function parseScoreboardLine(line) {
  if (!line || typeof line !== 'string') return null;
  const trimmed = line.trim();
  if (trimmed.length < 3) return null;

  // Check if entire line is just UI noise
  const lower = trimmed.toLowerCase();
  if (UI_NOISE_WORDS.some(w => lower === w || lower === `${w}s`)) {
    return null;
  }

  // Case 1: Standard "[IGN] [N] Eliminations"
  const match = trimmed.match(ELIMINATION_REGEX);
  if (match) {
    let ign = match[1].trim();
    const kills = parseInt(match[2], 10);

    // Clean up IGN: remove explicit rank indicators like "1. ", "#1 ", "1- " while preserving tags like "9TE"
    ign = ign.replace(/^([#]?\d{1,2}[\.\-:\)]\s+|[#]\d{1,2}\s+)/, '').trim();

    if (ign.length >= 2 && !UI_NOISE_WORDS.includes(ign.toLowerCase())) {
      return { ign, kills: isNaN(kills) ? 0 : kills, raw: trimmed };
    }
  }

  // Case 2: Line has "[N] Eliminations" without clean prefix
  const standaloneMatch = trimmed.match(STANDALONE_ELIM_REGEX);
  if (standaloneMatch) {
    const kills = parseInt(standaloneMatch[1], 10);
    let remaining = trimmed.replace(STANDALONE_ELIM_REGEX, '').trim();
    remaining = remaining.replace(/^([#]?\d{1,2}[\.\-:\)]\s+|[#]\d{1,2}\s+)/, '').trim();

    if (remaining.length >= 2 && !UI_NOISE_WORDS.includes(remaining.toLowerCase())) {
      return { ign: remaining, kills: isNaN(kills) ? 0 : kills, raw: trimmed };
    }
  }

  return null;
}

/**
 * Pre-processes an image and creates a cropped canvas for a specific region
 * @param {HTMLImageElement|HTMLCanvasElement} sourceImage
 * @param {object} cropRatio - { x: 0..1, y: 0..1, w: 0..1, h: 0..1 }
 * @returns {HTMLCanvasElement}
 */
export function createEnhancedRegionCanvas(sourceImage, cropRatio) {
  const canvas = document.createElement('canvas');
  const srcW = sourceImage.naturalWidth || sourceImage.width;
  const srcH = sourceImage.naturalHeight || sourceImage.height;

  const sx = Math.floor(cropRatio.x * srcW);
  const sy = Math.floor(cropRatio.y * srcH);
  const sw = Math.floor(cropRatio.w * srcW);
  const sh = Math.floor(cropRatio.h * srcH);

  // Upscale if cropped region is narrow to boost OCR accuracy
  const targetW = Math.max(sw * 2, 1000);
  const scale = targetW / sw;
  const targetH = Math.floor(sh * scale);

  canvas.width = targetW;
  canvas.height = targetH;

  const ctx = canvas.getContext('2d');
  // High quality interpolation
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw cropped image
  ctx.drawImage(sourceImage, sx, sy, sw, sh, 0, 0, targetW, targetH);

  // Contrast enhancement & Binarization
  // Gaming text is bright yellow or white on dark backgrounds
  const imgData = ctx.getImageData(0, 0, targetW, targetH);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Perceived luminance
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

    // Detect if pixel is part of yellow kill text or bright white IGN text
    const isYellow = (r > 150 && g > 130 && b < 100);
    const isBright = luminance > 140;

    if (isBright || isYellow) {
      // Set to solid black text for Tesseract
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
    } else {
      // Set background to solid white
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Segments lines of OCR text into squad groups
 * @param {Array<{ text: string, bbox?: object }>} lines
 * @param {number} expectedSquads - Number of squads expected in this column (5 for left, 6 for right)
 * @param {number} startPlacement - Starting placement rank (1 for left, 6 for right)
 * @returns {Array<{ placement: number, players: Array<{ ign: string, kills: number, raw: string }>, warnings: string[] }>}
 */
export function groupLinesIntoSquads(lines, expectedSquads, startPlacement) {
  const parsedPlayers = [];

  for (const line of lines) {
    const text = typeof line === 'string' ? line : line.text;
    if (!text) continue;

    // A single line might have multiple player entries if both sub-columns were read together
    // E.g. "9TE iMOOGI 6 Eliminations JA | ERENYEAGR 13 Eliminations"
    const subMatches = text.match(/([^\d\n\r]+?\s*\d{1,2}\s*(?:eliminations?|elim|elims?))/gi);
    if (subMatches && subMatches.length > 1) {
      for (const sub of subMatches) {
        const parsed = parseScoreboardLine(sub);
        if (parsed) parsedPlayers.push(parsed);
      }
    } else {
      const parsed = parseScoreboardLine(text);
      if (parsed) parsedPlayers.push(parsed);
    }
  }

  const squads = [];

  // Group by chunks of up to 4 players per squad
  for (let s = 0; s < expectedSquads; s++) {
    const placement = startPlacement + s;
    const squadPlayers = parsedPlayers.splice(0, 4);
    const warnings = [];

    if (squadPlayers.length === 0) {
      warnings.push(`No players detected for Placement #${placement}`);
    } else if (squadPlayers.length < 4) {
      warnings.push(`Detected ${squadPlayers.length}/4 players. Please verify.`);
    }

    squads.push({
      placement,
      players: squadPlayers,
      warnings
    });
  }

  // If leftover players exist, attach to the last squad
  if (parsedPlayers.length > 0 && squads.length > 0) {
    squads[squads.length - 1].players.push(...parsedPlayers);
  }

  return squads;
}

/**
 * Main OCR Runner for Free Fire Scoreboard
 *
 * @param {HTMLImageElement|File|Blob|string} imageInput
 * @param {Array} registeredTeams - Tournament confirmed teams
 * @param {Function} onProgress - Progress callback ({ step, percent, message })
 * @returns {Promise<Array<object>>} - Parsed squad results ready for admin verification
 */
export async function runFreeFireOcr(imageInput, registeredTeams = [], onProgress = () => {}) {
  let imgElement = null;

  onProgress({ step: 'init', percent: 10, message: 'Loading image and OCR worker...' });

  // 1. Resolve image to HTMLImageElement
  if (imageInput instanceof HTMLImageElement && imageInput.complete) {
    imgElement = imageInput;
  } else {
    imgElement = await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(new Error('Failed to load image for OCR processing'));

      if (typeof imageInput === 'string') {
        img.src = imageInput;
      } else if (imageInput instanceof File || imageInput instanceof Blob) {
        img.src = URL.createObjectURL(imageInput);
      } else {
        reject(new Error('Unsupported image input type'));
      }
    });
  }

  onProgress({ step: 'crop', percent: 25, message: 'Segmenting Left and Right scoreboard panels...' });

  // 2. Define coordinate ratios for Free Fire MAX scoreboard layout
  // Left Panel: Ranks 1 to 5
  const leftRatio = { x: 0.06, y: 0.20, w: 0.45, h: 0.70 };
  // Right Panel: Ranks 6 to 11 (avoiding yellow Back button at bottom right)
  const rightRatio = { x: 0.51, y: 0.20, w: 0.45, h: 0.70 };

  const leftCanvas = createEnhancedRegionCanvas(imgElement, leftRatio);
  const rightCanvas = createEnhancedRegionCanvas(imgElement, rightRatio);

  onProgress({ step: 'ocr_left', percent: 40, message: 'Recognizing Placements 1–5 (Left Panel)...' });

  // 3. Initialize Tesseract worker
  const worker = await createWorker('eng');

  // Set character whitelist and page segmentation mode for sparse text
  await worker.setParameters({
    tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()-_+=<>:;.,/|~ ',
    tessedit_pageseg_mode: '6', // Assume a single uniform block of text
  });

  // Recognize Left Panel
  const leftResult = await worker.recognize(leftCanvas);
  const leftLines = (leftResult.data?.lines || []).map(l => l.text);

  onProgress({ step: 'ocr_right', percent: 70, message: 'Recognizing Placements 6–12 (Right Panel)...' });

  // Recognize Right Panel
  const rightResult = await worker.recognize(rightCanvas);
  const rightLines = (rightResult.data?.lines || []).map(l => l.text);

  await worker.terminate();

  onProgress({ step: 'parsing', percent: 85, message: 'Grouping squad eliminations and summing kills...' });

  // 4. Group lines into squads
  const leftSquads = groupLinesIntoSquads(leftLines, 5, 1);
  const rightSquads = groupLinesIntoSquads(rightLines, 6, 6);

  const allSquads = [...leftSquads, ...rightSquads];

  onProgress({ step: 'matching', percent: 95, message: 'Fuzzy matching squads to registered teams...' });

  // 5. Match each squad to registered teams
  const finalResults = allSquads.map(squad => {
    const extractedIGNs = squad.players.map(p => p.ign);
    const match = matchSquadToTeams(extractedIGNs, registeredTeams);

    // Sum individual player kills to get total squad kills
    const totalKills = squad.players.reduce((sum, p) => sum + (p.kills || 0), 0);

    return {
      placement: squad.placement,
      teamId: match.team ? match.team.id : '',
      teamName: match.team ? match.team.teamName : '',
      slotNumber: match.team ? match.team.slotNumber : null,
      confidence: match.confidence,
      matchScore: match.score,
      matchedCount: match.matchedCount,
      matchedPlayers: match.matchedPlayers,
      candidates: match.candidates || [],
      totalKills,
      killsOverridden: false,
      players: squad.players.map(p => ({
        rawIGN: p.ign,
        cleanIGN: normalizeIGN(p.ign),
        kills: p.kills,
        matchedIGN: match.matchedPlayers.find(mp => mp.extracted === p.ign)?.registered || ''
      })),
      warnings: [...squad.warnings]
    };
  });

  onProgress({ step: 'complete', percent: 100, message: 'OCR analysis complete! Ready for review.' });

  return finalResults;
}
