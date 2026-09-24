# TraceX - Architectural Blueprint & Agent Guidelines

TraceX is a mobile-first, zero-backend Single Page Application (SPA) for real-time cryptocurrency tracking, technical chart analysis, portfolio management, and on-chain intelligence. Built for web and Android/iOS Capacitor packaging.

---

## 1. Core Architecture & Tech Stack

- **Framework:** React 19 + TypeScript (Strict mode) + Vite 8
- **Styling:** Tailwind CSS v4 + Vanilla CSS Design Tokens (`src/index.css`)
- **State Management:** Zustand with LocalStorage Persistence (`tracex-storage-v3`)
- **Chart Engine:** TradingView Lightweight Charts (Lazy-loaded)
- **Data Pipeline:**
  - Real-time ticker feeds: Binance Public WebSocket Combined Stream (`wss://stream.binance.com:9443`) with batched updates and Page Visibility API throttling.
  - Search & Historical Klines: Binance Public REST API (`api.binance.com`).
  - Macro Sentiment: Alternative.me Fear & Greed Index API (`api.alternative.me`).
  - Bitcoin MVRV: Coin Metrics Community API (`CapMVRVCur`) primary with `bitcoin-data.com` fallback, hourly cache, and source-date freshness.
  - Market Breadth: Top 20 USDT markets by quote volume, classified above their 20-day and 50-day daily moving averages.
  - Volatility: BTC daily ATR14 derived from Binance spot klines.
  - Stablecoin Liquidity: DefiLlama global USD-pegged stablecoin supply with 7-day and 30-day changes.
  - Market Dominance: Coinlore Global API (`api.coinlore.net/api/global/`).
  - Futures Intelligence: Binance Futures REST API (`fapi.binance.com` for Long/Short, Funding Rate, Taker Volume, and Open Interest).

---

## 2. Directory Structure

```
src/
├── components/
│   ├── analytics/        # Macro, on-chain, derivatives & technical terminal
│   │   ├── AnalyticsView.tsx       # Loading, refresh and section controller
│   │   ├── AnalyticsSkeleton.tsx   # Responsive loading state
│   │   ├── AnalyticsPrimitives.tsx # Shared cards, source and stale indicators
│   │   ├── MarketGateCard.tsx     # Compact four-signal market regime summary
│   │   ├── MarketConditionsPanel.tsx # Breadth, volatility and liquidity detail
│   │   ├── CyclePanel.tsx          # Sentiment, MVRV and dominance
│   │   ├── DerivativesPanel.tsx    # Positioning, funding, taker and OI
│   │   └── TechnicalPanel.tsx      # BTC price, RSI and moving averages
│   ├── chart/            # TradingView Lightweight Charts & Technical Overlays
│   │   ├── DetailChartModal.tsx (Code-split with React.lazy)
│   │   └── volumeCandleSeries.ts
│   ├── common/           # Navigation, Header, Shell, Shared Modal, Banners
│   │   ├── BottomNav.tsx   (mobile <1024px)
│   │   ├── Sidebar.tsx     (desktop ≥1024px)
│   │   ├── Modal.tsx       (ONLY overlay pattern — portal, Esc/backdrop close, scroll lock)
│   │   ├── TerminalPrimitives.tsx # Shared terminal cards, headers, tabs, metrics & banners
│   │   ├── terminalTokens.ts
│   │   ├── Header.tsx
│   │   ├── OfflineBanner.tsx
│   │   ├── PullToRefresh.tsx
│   │   └── navItems.ts     (single source of truth for tab nav items)
│   ├── home/             # BTC cockpit, signal rail and wallet snapshot
│   │   └── HomeDashboardView.tsx
│   ├── markets/          # Watchlist, Search, Categories, Sort Chips, Sparklines
│   │   ├── AddWatchlistModal.tsx
│   │   ├── MarketItem.tsx
│   │   ├── MarketList.tsx
│   │   └── MarketTrendsBanner.tsx
│   └── portfolio/        # Ledger, PnL, DCA Merging, Sell Modals, Allocation Bar
│       ├── AddAssetModal.tsx
│       ├── PortfolioGroupSwitcher.tsx
│       ├── PortfolioItem.tsx
│       ├── PortfolioList.tsx
│       ├── PortfolioSummary.tsx
│       ├── SellAssetModal.tsx
│       └── SmartImportModal.tsx
├── hooks/
│   ├── useBinanceWebSocket.ts # Batched stream + visibility pause
│   ├── useNetworkStatus.ts    # Online/offline connection monitor
│   ├── useSwipeNavigation.ts  # Touch-only tab swipe (mobile)
│   └── useTabHotkeys.ts       # Desktop keys 1-4 switch tabs
├── services/
│   ├── binanceApi.ts          # Spot REST endpoints (Klines, Search)
│   ├── marketConditionsApi.ts # Breadth, ATR helpers and stablecoin liquidity
│   ├── onChainApi.ts          # Multi-period FNG, MVRV, Dominance, Taker Vol, RSI
│   └── storageCache.ts        # Namespaced localStorage cache with timestamp
├── store/
│   └── useCryptoStore.ts # Central Zustand store with persistence
├── types/
│   └── crypto.ts         # TypeScript interfaces & domain types
└── utils/
    ├── formatters.ts     # Currency, percentage, timestamp helpers
    └── haptics.ts        # Web Vibration API tactile touch helper
```

---

## 3. Design System: "Craft Paper & Thick Ink"

All UI elements must strictly adhere to the brutalist Craft Paper aesthetic:

1. **Color Tokens:**
   - Background Canvas: `#f4f0e6` (Warm paper)
   - Cards / Modals: `#ffffff` or `#faf7f0`
   - Dark Stamps / Headers: `#1c1917` (Deep charcoal ink)
   - Accent Primary: `#f59e0b` / `#fbbf24` (Amber gold)
   - Profit / Loss: `#16a34a` / `#bbf7d0` (Emerald) and `#dc2626` / `#fecdd3` (Rose)
2. **Borders & Shadows:**
   - 2px thick ink borders: `border-2 border-stone-900`
   - Hard offset drop shadows: `shadow-hard` (`box-shadow: 3px 3px 0px #1c1917`) and `shadow-hard-sm` (`box-shadow: 2px 2px 0px #1c1917`)
   - Tactile button presses: `btn-hard` (`active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`)
3. **Typography & Icons:**
   - Monospaced technical typography: `font-mono uppercase font-black`
   - Technical notation: `[BRACKETS]`, `// SLASH DIVIDERS`, status dots (`w-2 h-2 rounded-full`)
   - **NO CHEAP EMOJIS:** Never use cartoon emojis (`🔥`, `⚡`, `🐸`, `🤖`, `🏆`). Always use clean Lucide SVG icons with `stroke-[2.5]`.
4. **Shared Terminal UI:** page headers, card frames, metric tiles, segmented tabs and status banners use `components/common/TerminalPrimitives.tsx`; page-specific styling belongs in the owning feature.

---

## 4. Responsive Layout (Mobile ↔ Desktop)

- **Breakpoints (Tailwind):** `md: 768px` = tablet width/unclamp, `lg: 1024px` = desktop shell, `xl/2xl` = density steps. Mobile keeps `max-w-lg` centered column; from `md:` the shell unclamps (`App.tsx <main>`); `2xl` caps at `1600px`.
- **Navigation:** shared `NAV_ITEMS` in `navItems.ts`. `BottomNav` renders `<lg` only; `Sidebar` renders `≥lg` only. Never duplicate the tab list.
- **Shell width is controlled only in `App.tsx` + `Header.tsx` inner** (`max-w-lg md:max-w-none 2xl:max-w-[1600px] mx-auto`). Views must NOT set their own `max-w-* mx-auto` on their root (they add padding `px-4 md:px-6` only).
- **Lists → grids:** Markets/Portfolio switch to `md:grid-cols-2 xl:grid-cols-3`; Home uses its existing `lg:grid-cols-3` cockpit; Portfolio keeps its existing summary-plus-grid layout.
- **Modals:** always `components/common/Modal.tsx` (`variant="sheet"` default → bottom sheet on mobile, centered from `sm:`; `variant="centered"` for forms). Sizes scale wider at `lg:`. No hand-rolled `fixed inset-0` overlays.
- **Desktop affordances:** hover lift/feedback (`lg:hover:-translate-y-0.5`), `:focus-visible` ink ring (index.css), text selection enabled `≥lg`, keys `1–4` tab switch, `Esc` closes topmost dialog only.
- **Motion:** transform/opacity only, 150–300ms, `prefers-reduced-motion` kills all keyframe animations (index.css).

---

## 5. Coding Standards

- **Strict TypeScript:** No `any`. Explicit interfaces for all data structures and component props.
- **Functional Paradigm:** Pure functional components and React Hooks.
- **Defensive API Calls:** Every external fetch (`bitcoin-data.com`, `alternative.me`, `binance.com`) must have a `try/catch` fallback to cached or mathematical default values so the UI never breaks.
- **Performance Budget:**
  - Heavy libraries (like chart engines) must remain lazy-loaded with `React.lazy()` and `Suspense`.
  - WebSocket ticker updates must be batched (never update Zustand on every single raw WebSocket packet).
  - Background tabs must suspend WebSocket connections to preserve device battery.
- **Mobile First:** Ensure all touch targets are $\ge 44\text{px}$, notch safe-area paddings (`pt-safe`, `pb-safe`) are respected, and overscroll handles smoothly — then verify the same screen at `md:`/`lg:`/`xl:` (multi-column, no dead bottom-nav padding).
