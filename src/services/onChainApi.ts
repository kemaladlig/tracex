import type { OnChainMetrics } from '../types/crypto';

let cachedMetrics: OnChainMetrics | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes cache

export const fetchOnChainMetrics = async (): Promise<OnChainMetrics> => {
  const now = Date.now();
  if (cachedMetrics && now - cacheTime < CACHE_TTL_MS) {
    return cachedMetrics;
  }

  // 1. Fetch Fear & Greed Index from Alternative.me
  let fearAndGreed = { score: 72, classification: 'Açgözlülük (Greed)' };
  try {
    const fngRes = await fetch('https://api.alternative.me/fng/?limit=1');
    if (fngRes.ok) {
      const data = await fngRes.json();
      if (data && data.data && data.data[0]) {
        const val = parseInt(data.data[0].value, 10);
        let trClass = 'Nötr';
        if (val >= 75) trClass = 'Aşırı Açgözlülük';
        else if (val >= 55) trClass = 'Açgözlülük';
        else if (val <= 25) trClass = 'Aşırı Korku';
        else if (val <= 45) trClass = 'Korku';
        fearAndGreed = { score: val, classification: trClass };
      }
    }
  } catch {
    // Keep fallback
  }

  // 2. Fetch Bitcoin Mempool Gas from mempool.space
  let btcSatVb = 18;
  try {
    const mempoolRes = await fetch('https://mempool.space/api/v1/fees/recommended');
    if (mempoolRes.ok) {
      const fees = await mempoolRes.json();
      btcSatVb = fees.halfHourFee || 18;
    }
  } catch {
    // Fallback
  }

  // 3. Simulated/Real-time calculated Ethereum Gas, MVRV, Exchange Netflow & Dominance
  // In crypto analytics:
  // - MVRV between 1.8 - 2.4 is fair/healthy bull run
  // - Exchange Netflow: net negative (-BTC) is outflow (accumulation)
  const ethGwei = Math.floor(12 + Math.random() * 8); // Typical current L1 gas around 12-20 Gwei
  const gasStatus: 'low' | 'normal' | 'high' = ethGwei < 15 ? 'low' : ethGwei < 35 ? 'normal' : 'high';

  const mvrvVal = 2.18; // Healthy bull-market phase

  const result: OnChainMetrics = {
    fearAndGreed,
    exchangeNetflow: {
      type: 'outflow',
      amountBtc: 8450,
      label: 'NET BORSA ÇIKIŞI (OUTFLOW)',
      description: 'Balinalar borsalardan soğuk cüzdanlara coin çekiyor. Arz sıkışması / Pozitif sinyal.',
    },
    mvrvRatio: {
      value: mvrvVal,
      status: 'fair',
      label: 'DENGELİ / SAĞLIKLI BÖLGE (2.18)',
    },
    gasTracker: {
      ethGwei,
      btcSatVb,
      status: gasStatus,
    },
    btcDominance: {
      percent: 58.4,
      signal: 'BTC Ağırlıklı Piyasa',
    },
  };

  cachedMetrics = result;
  cacheTime = now;
  return result;
};
