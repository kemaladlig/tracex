# TraceX - Kripto Takip & Portföy Terminali

TraceX; React 19, TypeScript, Vite 8, Tailwind CSS v4, Zustand ve TradingView Lightweight Charts mimarisi üzerine kurulu, mobil öncelikli (Mobile-First), sıfır arka uçlu (zero-backend) profesyonel bir Kripto Takip, Teknik Analiz ve Portföy yönetim uygulamasıdır.

Uygulama harici bir sunucuya ihtiyaç duymadan doğrudan **Binance Public WebSocket/REST API'leri**, **Bitcoin On-Chain MVRV**, **Coinlore Global Verileri**, **DefiLlama Stablecoin Arzı** ve **Alternative.me Duygu Endeksi** üzerinden gerçek zamanlı çalışır. Kullanıcı verileri tarayıcının yerel kasasında (`localStorage`) saklanır. Capacitor ile doğrudan yerel Android (APK) veya iOS uygulamasına paketlenebilir.

---

## Öne Çıkan Özellikler

### 1. Piyasalar & Takip Listesi
- **Tamponlanmış Canlı WebSocket:** Takip listesindeki tüm kripto paralar tek bir Binance WebSocket akışı üzerinden anlık güncellenir; paketler yaklaşık 1 saniyelik gruplar halinde React durumuna aktarılır.
- **Mikro Sparkline Eğrileri:** Her coin satırında günün yönünü gösteren kompakt 28x12px vektörel trend eğrisi.
- **Kategori Filtreleme:** `TÜMÜ`, `LAYER 1`, `MEME`, `YAPAY ZEKA`, `DEFI` segmentlerine göre tek tıkla listeleme.
- **Hızlı Sıralama:** `Varsayılan`, `En Çok Artan`, `En Çok Düşen`, `Hacim`, `A-Z` sıralama çipleri.
- **400+ Binance USDT Paritesi:** Arama kutusu ile tüm spot pariteler anında aranıp listeye eklenebilir.
- **Hızlı Cüzdana Ekleme:** Takip listesindeki coinin yanındaki `[+]` butonuyla tek hamlede portföye alış ekleme.

### 2. Canlı Makro & Zincir Üstü Analiz Terminali
- **Piyasa Kapısı:** Trend, pazar genişliği, volatilite ve likidite verilerini `PİYASA AÇIK / TEMKİNLİ / YÜKSEK RİSK / TEYİT BEKLE` durumunda birleştirir.
- **Pazar Genişliği:** En yüksek hacimli 20 USDT paritenin 20G ve 50G günlük ortalamalarının üzerinde olma oranını izler.
- **Volatilite Rejimi:** Binance günlük mumlarından hesaplanan BTC ATR14 yüzdesiyle sakin, normal, aktif ve yüksek risk bantlarını gösterir.
- **Stablecoin Likiditesi:** DefiLlama global USD-pegged stablecoin arzını toplam değer, 7 günlük ve 30 günlük değişimle izler.
- **Korku & Açgözlülük Çoklu Zaman Karşılaştırması:** `Şu An (Bugün)`, `Dün`, `Geçen Hafta`, `Geçen Ay` metrikleri ve 14 günlük interaktif SVG trend çizgisi.
- **Pazar Hakimiyeti (BTC Dominance):** BTC, ETH ve altcoin pazar payı dağılımı ile global piyasa değeri.
- **Bitcoin MVRV Döngü Isıtıcısı:** Coin Metrics Community API'den günlük çekilen MVRV skoru ve renkli döngü cetveli.
- **Türev Akışı:** Long/Short, fonlama, taker hacmi ve open interest verileriyle kaldıraç baskısını izler.
- **Bitcoin Günlük RSI 14 & Hareketli Ortalamalar:** Binance günlük mumlarından hesaplanan RSI, SMA20, EMA50 ve SMA200 yapısı.

### 3. İnteraktif Grafik Terminali (TradingView Lightweight Charts)
- **Lazy Loading:** Ağır grafik motoru ana paketten ayrılarak dinamik yüklenir; ilk açılış dosya boyutu 313 KB'a (93 KB gzip) düşürülmüştür.
- **Açılıp Kapanabilir Göstergeler:**
  - `[VOL]`: Yarı saydam hacim barları histogramı.
  - `[EMA]`: EMA 20 (altın sarısı) ve SMA 50 (mavi) hareketli ortalama trend çizgileri.
  - `[MALİYET]`: Eğer cüzdanınızda o coin varsa grafiğin tam üzerine kesikli siyah alış maliyeti seviye çizgisi.
- **Mum ve Çizgi Modu:** 1dk, 15dk, 1s, 4s, 1g, 1h periyotları ve canlı OHLC imleç takibi.

### 4. Cüzdan & Portföy Yönetimi
- **DCA (Ağırlıklı Ortalama Maliyet) Birleştirme:** Aynı coin için tekrarlanan alımlarda ortalama maliyeti otomatik hesaplayıp tek kalemde birleştirir.
- **Kısmi veya Tam Satış:** İstenen miktarda satış yapabilme, kâr/zararı anında realize etme (`Realized PnL`).
- **Lider & En Zayıf Varlık Rozetleri:** Portföyün en çok kazandıran ve en çok gerileyen varlıklarını tek bakışta özetler.
- **Varlık Dağılım Cetveli:** Portföydeki varlıkların yüzdesel ağırlığını gösteren renkli segment barı.
- **Gizlilik Modu:** Tek tıkla tüm bakiyeleri ve k/z tutarlarını `••••••` şeklinde maskeleme.
- **Cüzdan Değerleri:** Portföy bakiyeleri, maliyetler ve K/Z değerleri TRY gösterilir; kripto birim fiyatları ve teknik seviyeler USD olarak gösterilir.

### 5. Analiz Terminali
- **Özet Öncelikli:** Analiz ekranı varsayılan olarak kısa pazar özeti, hızlı sinyaller ve piyasa kapısını gösterir.
- **İsteğe Bağlı Detay:** Döngü, türev, teknik ve karar açıklamaları yalnızca `Detayları göster` düğmesine basıldığında açılır.
- **USD Normalizasyonu:** USDT, TRY, EUR ve kripto pariteleri ortak USD değerine çevrilerek toplam varlık, K/Z ve gerçekleşen kâr hesapları tutarlı tutulur.
- **Cüzdan Para Birimi:** Cüzdan bakiye/değerleri TRY, kripto birim fiyatları USD olarak gösterilir. BTC global fiyatı da her zaman USD olarak kalır.

### 6. Mobil & UX Mimarisi
- **Craft Paper & Thick Ink Tasarım Sistemi:** 2px kalın mürekkep sınırları, sert gölgeler (`shadow-hard`) ve sıcak kağıt zemin (`#f4f0e6`).
- **Pull-to-Refresh:** Mobilde ekranı yukarıdan aşağıya çekerek anında taze veri çekme.
- **İskelet Ekranlar (Skeleton Loaders):** Veri yüklenirken dönen spinner yerine gerçek kart boyutlarında yumuşak yanıp sönen taslak bloklar.
- **Çevrimdışı Direnç Barı:** Ağ bağlantısı koptuğunda üst barda beliren `[AĞ ÇEVRİMDIŞI]` bilgilendirmesi.
- **Güvenli Alanlı Mobil İkon:** Android ve iOS maskeleriyle kırpılmayan özel güvenli alanlı teknik "TX" pusula ikonu.

---

## Teknoloji Mimarisi

- **Çatı:** React 19, TypeScript, Vite 8
- **Stil & Tokenlar:** Tailwind CSS v4, Custom Craft Paper Tokens (`index.css`)
- **Durum & Depolama:** Zustand + LocalStorage Persistence (`tracex-storage-v3`)
- **Grafik Motoru:** Lightweight Charts (TradingView)
- **İkon Seti:** Lucide React

---

## Kurulum ve Çalıştırma

### Gereksinimler
- Node.js (v20.19+ or v22.12+)
- npm, pnpm veya bun

### Geliştirme Sunucusu

```bash
# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev
```

Tarayıcınızda `http://localhost:5173/` adresini açın.

### Üretim Derlemesi (Production Build)

```bash
# Üretim Derlemesi + TypeScript kontrolü
npm run build

# Deterministik asistan ve valuation testleri
npm test

# Lint kontrolü
npm run lint
```

---

## Android Paketleme (Capacitor)

Uygulama sıfır arka uçlu statik bir SPA olduğu için doğrudan Capacitor ile mobil APK/AAB formatına dönüştürülebilir:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init TraceX com.tracex.app --web-dir dist
npm run build
npx cap add android
npx cap open android
```

---

## Lisans

MIT
