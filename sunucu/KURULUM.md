# Abonelik doğrulama sunucusu — kurulum (bir kez yapılır, ücretsiz)

Bu klasördeki `worker.js`, uygulamadaki Premium satın almalarını Google Play üzerinden doğrular ve onaylar.
Cloudflare Workers'ın ücretsiz planı (günde 100.000 istek) bu iş için fazlasıyla yeterli; kredi kartı gerekmez.

## 1. Google tarafı: servis hesabı
1. https://console.cloud.google.com → yeni proje: `ehliyetbende`.
2. "API'ler ve Hizmetler → Kitaplık" → **Google Play Android Developer API** → Etkinleştir.
3. "IAM ve Yönetici → Hizmet hesapları" → **Hizmet hesabı oluştur** (ad: `play-dogrulama`). Rol vermeye gerek yok.
4. Oluşan hesaba tıkla → **Anahtarlar → Anahtar ekle → JSON**. İnen JSON dosyasını kimseyle paylaşma.
5. Play Console → **Kullanıcılar ve izinler → Yeni kullanıcı davet et** → hizmet hesabının e-postasını (…@….iam.gserviceaccount.com) yaz →
   Uygulama: EHLİYET BENDE → izinler: **"Finansal verileri görüntüle"** ve **"Siparişleri ve abonelikleri yönet"** → Davet et.

## 2. Cloudflare tarafı: sunucuyu yayınla
1. https://dash.cloudflare.com → ücretsiz hesap aç.
2. **Workers & Pages → Create → Create Worker** → ad: `ehliyetbende-odeme` → Deploy.
3. **Edit code** → içeriği sil, `worker.js` dosyasının tamamını yapıştır → Deploy.
4. Worker → **Settings → Variables and Secrets → Add** → Tür: *Secret*, Ad: `GOOGLE_SERVICE_ACCOUNT`, Değer: JSON dosyasının **tüm içeriği** → Save.
5. Worker adresini kopyala (ör. `https://ehliyetbende-odeme.KULLANICI.workers.dev`).

## 3. Uygulamaya bağla
`yol-hakki.html` içinde şu satırı bul ve adresi yaz:
```js
const DOGRULAMA_URL = 'https://ehliyetbende-odeme.KULLANICI.workers.dev';
```

## Test
Play Console → Ayarlar → **Lisans testi** listesine kendi Gmail adresini ekle. Bu hesapla yapılan satın almalar gerçek ücret kesmez,
aylık abonelik 5 dakikada bir yenilenir; doğrulamanın çalıştığını böyle görebilirsin.
