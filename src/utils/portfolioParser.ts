export interface ParsedAssetDraft {
  symbol: string; // e.g. 'BTCUSDT'
  baseAsset: string; // e.g. 'BTC'
  amount: number;
  buyPrice?: number;
  rawName?: string;
}

const FIAT_EXCLUSIONS = new Set(['TRY', 'TL', 'USD', 'EUR', 'GBP']);
const NOISE_WORDS = new Set([
  'IMAGE',
  'KRIPTO',
  'İŞLEM',
  'ISLEM',
  'TOPLAM',
  'KULLANILABILIR',
  'KULLANILABİLİR',
  'DEĞER',
  'DEGER',
  'BAKİYE',
  'BAKIYE',
  'ACTION',
  'ACTIONS',
]);

/**
 * Clean string representation of numeric quantities that might contain commas
 * e.g., '580,928.3' -> 580928.3 or '0.00189313' -> 0.00189313
 */
function parseLocaleNumber(str: string): number | null {
  if (!str) return null;
  const cleaned = str.trim().replace(/,/g, '');
  const num = parseFloat(cleaned);
  return !isNaN(num) && isFinite(num) && num > 0 ? num : null;
}

/**
 * Formats a raw crypto symbol to standard USDT pair, e.g. BTC -> BTCUSDT
 */
function normalizeSymbol(raw: string): { baseAsset: string; symbol: string } {
  const upper = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (upper.endsWith('USDT')) {
    return { baseAsset: upper.replace('USDT', ''), symbol: upper };
  }
  return { baseAsset: upper, symbol: `${upper}USDT` };
}

/**
 * Parses pasted text from Binance TR, Binance Global, or freeform text (e.g. 'BTC 0.05')
 */
export function parsePortfolioText(rawText: string): ParsedAssetDraft[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const results: ParsedAssetDraft[] = [];
  const seenSymbols = new Set<string>();

  // Pass 1: Check for Binance TR Web table structure
  // Pattern:
  // Line i: Symbol (e.g. BTC, SUI, DOGE)
  // Line i+1: FullName \t TotalBalance \t AvailableBalance ...
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upperLine = line.toUpperCase();

    // Check if line looks like a standalone ticker symbol (2-10 uppercase alphanumeric chars)
    if (/^[A-Z0-9]{2,10}$/.test(upperLine)) {
      if (FIAT_EXCLUSIONS.has(upperLine) || NOISE_WORDS.has(upperLine)) {
        continue;
      }

      // Check next line for balance values
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        // Split by tabs or 2+ spaces (clipboard table format)
        const parts = nextLine.split(/\t+|\s{2,}/).map((p) => p.trim()).filter(Boolean);

        if (parts.length >= 2) {
          // parts[0] is usually full name (e.g. "Bitcoin", "Dogecoin", "SHIBA INU")
          // parts[1] is Total Balance
          const rawName = parts[0];
          const totalBal = parseLocaleNumber(parts[1]);

          if (totalBal !== null && totalBal > 0) {
            const { baseAsset, symbol } = normalizeSymbol(upperLine);
            if (!seenSymbols.has(symbol)) {
              seenSymbols.add(symbol);
              results.push({
                symbol,
                baseAsset,
                amount: totalBal,
                rawName,
              });
              i++; // Skip nextLine since it was consumed
              continue;
            }
          }
        }
      }
    }
  }

  // If Pass 1 matched 2 or more assets, this was definitely a Binance TR table format
  if (results.length > 0) {
    return results;
  }

  // Pass 2: Freeform line-by-line format:
  // Examples:
  // "BTC 0.05"
  // "BTC 0.05 65000"
  // "ETH: 1.2"
  // "SOL, 15, 140"
  // "AVAX - 40"
  for (const line of lines) {
    const cleanLine = line.replace(/[:,;-]/g, ' ').replace(/\s+/g, ' ').trim();
    const tokens = cleanLine.split(' ');

    if (tokens.length >= 2) {
      const candidateSymbol = tokens[0].toUpperCase();
      if (
        /^[A-Z0-9]{2,10}$/.test(candidateSymbol) &&
        !FIAT_EXCLUSIONS.has(candidateSymbol) &&
        !NOISE_WORDS.has(candidateSymbol)
      ) {
        const amount = parseLocaleNumber(tokens[1]);
        const buyPrice = tokens.length >= 3 ? parseLocaleNumber(tokens[2]) ?? undefined : undefined;

        if (amount !== null && amount > 0) {
          const { baseAsset, symbol } = normalizeSymbol(candidateSymbol);
          if (!seenSymbols.has(symbol)) {
            seenSymbols.add(symbol);
            results.push({
              symbol,
              baseAsset,
              amount,
              buyPrice,
            });
          }
        }
      }
    }
  }

  return results;
}
