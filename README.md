# ⚡ TraceX - Kripto Takip & Portföy Mobil Web Uygulaması

React, TypeScript, Vite, Tailwind CSS, Zustand ve TradingView Lightweight Charts kullanılarak geliştirilmiş modern, mobil öncelikli (Mobile-First) SPA Kripto Takip ve Portföy yönetim uygulaması.

Uygulama arka uç (backend) sunucusuna ihtiyaç duymadan tamamen **Binance Public WebSocket ve REST API** üzerinden gerçek zamanlı çalışır; kullanıcı verileri tarayıcının `localStorage` alanında saklanır. Capacitor ile doğrudan Android / iOS uygulamasına dönüştürülmeye hazırdır.

---

## ✨ Özellikler

- **Canlı WebSocket Akışı:** Binance Public Combined Stream (`wss://stream.binance.com:9443/stream?streams=...`) ile takip listenizdeki ve portföyünüzdeki tüm coinlerin fiyatları tek bağlantı üzerinden anlık güncellenir.
- **Fiyat Flash Efekti:** Fiyat her yükseldiğinde yeşil, düştüğünde kırmızı yanıp sönen zarif mikro animasyonlar.
- **Tüm Binance Kripto Pariteleri (400+ USDT Çifti):** Arama kutusuna yazdığınız anda tüm Binance spot coinleri anlık listelenir ve filtrelenir.
- **İnteraktif Lightweight Charts:** 
  - Mum Grafiği (Candlestick) ve Çizgi/Alan Grafiği (Area) arasında tek tıkla geçiş.
  - 1dk, 15dk, 1s, 4s, 1g, 1h zaman aralıkları.
  - Parmağınızla/fareyle gezinirken anlık Açılış (O), Yüksek (H), Düşük (L), Kapanış (C) göstergesi.
  - `ResizeObserver` ile mobil ekran döndürme ve boyutlandırmaya tam uyumluluk.
- **Cüzdan & Canlı Kâr/Zarar (PnL):**
  - Anlık Toplam Portföy Değeri ve Net PnL ($ ve %) hesabı.
  - **Varlık Dağılım Çubuğu:** Portföyünüzdeki coinlerin yüzdesel dağılımını gösteren renkli segment çubuğu.
  - **Sıralama Filtresi:** Varlıkları Değere Göre, Kâr/Zarara Göre veya İsme Göre anında sıralama.
  - **Otomatik Fiyat Doldurma:** Yeni işlem eklerken Binance'teki o anki piyasa fiyatını tek tıkla alış fiyatına çekebilme.
- **Mobil Native Tasarım:** Çentik (Notch) ve safe-area uyumluluğu, alt gezinti çubuğu (Bottom Navigation) ve karanlık (dark) tema.

---

## 🛠️ Teknoloji Yığını

- **Çatı & Dil:** React 19, TypeScript, Vite 8
- **Stilleme:** Tailwind CSS v4
- **Durum Yönetimi:** Zustand + LocalStorage Persistence Middleware
- **Grafikler:** Lightweight Charts (TradingView)
- **İkonlar:** Lucide React

---

## 🚀 Başlangıç

### Gereksinimler
- Node.js (v18+)
- npm veya bun / pnpm

### Kurulum

```bash
# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev
```

Tarayıcınızda `http://localhost:5173/` adresine gidin.

### Derleme (Production Build)

```bash
npm run build
```

---

## 📱 Android'e Dönüştürme (Capacitor)

Uygulama Capacitor için optimize edilmiştir. Android APK/AAB üretmek için:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init TraceX com.tracex.app --web-dir dist
npm run build
npx cap add android
npx cap open android
```

---

## 📄 Lisans

MIT
