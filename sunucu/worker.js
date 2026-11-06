/**
 * EHLİYET BENDE · Google Play abonelik doğrulama sunucusu (Cloudflare Worker)
 *
 * Uygulama satın alma yaptıktan sonra purchaseToken'ı buraya gönderir.
 * Bu sunucu Google Play Developer API ile:
 *   1) Aboneliğin gerçekten ödendiğini ve hâlâ aktif olduğunu kontrol eder,
 *   2) Onaylanmamışsa onaylar (acknowledge) — onaylanmayan satın almalar 3 gün sonra Google tarafından iade edilir,
 *   3) Uygulamaya { aktif, bitis, urun } döner.
 *
 * Gerekli gizli değişken (Cloudflare panelinde "Secret" olarak):
 *   GOOGLE_SERVICE_ACCOUNT = servis hesabı JSON dosyasının tüm içeriği
 */
const PAKET = 'com.ehliyetbende.app';
const URUNLER = ['premium_aylik', 'premium_yillik'];
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/' + PAKET;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const yanit = (veri, durum = 200) =>
  new Response(JSON.stringify(veri), { status: durum, headers: { 'Content-Type': 'application/json', ...CORS } });

const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlMetin = (s) => b64url(new TextEncoder().encode(s));

let tokenOnbellek = null;
async function erisimTokeni(env) {
  if (tokenOnbellek && tokenOnbellek.bitis > Date.now() + 60000) return tokenOnbellek.deger;
  const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT);
  const simdi = Math.floor(Date.now() / 1000);
  const baslik = b64urlMetin(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const govde = b64urlMetin(JSON.stringify({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token', iat: simdi, exp: simdi + 3600,
  }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const anahtar = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const imza = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', anahtar, new TextEncoder().encode(baslik + '.' + govde));
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + baslik + '.' + govde + '.' + b64url(imza),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('Google erişim tokeni alınamadı');
  tokenOnbellek = { deger: j.access_token, bitis: Date.now() + j.expires_in * 1000 };
  return j.access_token;
}

export default {
  async fetch(istek, env) {
    if (istek.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (istek.method !== 'POST') return yanit({ hata: 'Yalnızca POST' }, 405);
    let urun, token;
    try { ({ urun, token } = await istek.json()); } catch (e) { return yanit({ hata: 'Geçersiz istek' }, 400); }
    if (!URUNLER.includes(urun) || typeof token !== 'string' || token.length < 20 || token.length > 2000)
      return yanit({ hata: 'Geçersiz ürün veya token' }, 400);
    try {
      const at = await erisimTokeni(env);
      const r = await fetch(`${API}/purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`, { headers: { Authorization: 'Bearer ' + at } });
      if (r.status === 404 || r.status === 400) return yanit({ aktif: false, sebep: 'bulunamadi' });
      if (!r.ok) return yanit({ hata: 'Google yanıtı: ' + r.status }, 502);
      const a = await r.json();
      const kalem = (a.lineItems || []).find((l) => URUNLER.includes(l.productId));
      if (!kalem) return yanit({ aktif: false, sebep: 'urun_yok' });
      const bitis = Date.parse(kalem.expiryTime);
      const aktif = ['SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD'].includes(a.subscriptionState) && bitis > Date.now();
      // Onaylanmamışsa onayla (3 gün içinde onaylanmazsa Google iade eder)
      if (aktif && a.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING') {
        await fetch(`${API}/purchases/subscriptions/${kalem.productId}/tokens/${encodeURIComponent(token)}:acknowledge`, {
          method: 'POST', headers: { Authorization: 'Bearer ' + at, 'Content-Type': 'application/json' }, body: '{}',
        });
      }
      return yanit({ aktif, bitis, urun: kalem.productId, durum: a.subscriptionState, otomatikYenileme: !!kalem.autoRenewingPlan?.autoRenewEnabled });
    } catch (e) {
      return yanit({ hata: 'Doğrulama yapılamadı' }, 500);
    }
  },
};
