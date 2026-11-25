/* Kampüs turu: sayfayı kaydırdıkça 3D sürücü kursu kampüsünde ileri yürünür.
   Araçların ve eğitmenlerin yanından geçilir; her durakta sınıf bilgisi çıkar.
   WebGL yoksa ya da "hareketi azalt" açıksa hiçbir şey değişmez (klasik sayfa kalır). */
(() => {
  const kah = document.querySelector('.kahraman');
  if (!kah) return;
  const az = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let glVar = false;
  try { const c = document.createElement('canvas'); glVar = !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) {}
  if (az || !glVar || /[?&]klasik\b/.test(location.search)) return;

  const mobil = matchMedia('(max-width: 760px)').matches;
  const zayif = (navigator.deviceMemory || 4) < 4 || (navigator.hardwareConcurrency || 4) < 4;

  /* ---------- Duraklar ---------- */
  const DUR = [
    { id: 'giris', ad: 'Giriş' },
    { id: 'B', ad: 'Otomobil', yan: -1, harf: 'B', baslik: 'Otomobil', yas: '18 yaş',
      metin: 'Otomobil ve kamyonet: azami yüklü ağırlığı 3.500 kg\'ı, oturma yeri sürücü dahil 9\'u geçmeyen araçlar.',
      not: 'Manuel ya da otomatik vitesle sınav. Uygulamada park, rampa ve geri manevrayı 3D pistte çalış.',
      uret: () => [MODEL.kupe({ renk: 0xC8203A })] },
    { id: 'A', ad: 'Motosiklet', yan: 1, harf: 'A1 · A2 · A', baslik: 'Motosiklet', yas: '16 / 18 / 20+ yaş',
      metin: 'A1 hafif (125 cm³), A2 orta (35 kW\'a kadar), A ise güç sınırı olmayan tüm motosikletler.',
      not: 'Motosiklet pistinde slalom, dar alanda dönüş ve denge parkuru.',
      uret: () => [MODEL.motosiklet('a1'), MODEL.motosiklet('a2'), MODEL.motosiklet('a')] },
    { id: 'BE', ad: 'Römork', yan: -1, harf: 'BE', baslik: 'Otomobil + römork', yas: '18 yaş',
      metin: 'B sınıfı araç ile azami yüklü ağırlığı 750 kg\'ı geçen römorkun birlikte kullanılması.',
      not: 'B sınıfı sürücü belgesi gerekir. Römorkla geri manevra pistte adım adım.',
      uret: () => [MODEL.kupeRomork({ renk: 0x7C8791 })] },
    { id: 'C', ad: 'Kamyon', yan: 1, harf: 'C', baslik: 'Kamyon', yas: '21 yaş',
      metin: 'Azami yüklü ağırlığı 3.500 kg\'ın üzerindeki kamyon ve çekiciler.',
      not: 'Ağır vasıta pistinde araç bilgisi, eğimde kalkış ve geri manevra sınavı.',
      egitmen: 'Ağır vasıtada aynalar ve geri manevra her şeydir. Pistte adım adım gösteriyorum.',
      uret: () => [MODEL.kamyon()] },
    { id: 'CE', ad: 'Tır', yan: -1, harf: 'CE', baslik: 'Tır (çekici + dorse)', yas: '21 yaş',
      metin: 'C sınıfı araçla azami yüklü ağırlığı 750 kg\'ı geçen römork ya da yarı römork.',
      not: 'C sınıfı sürücü belgesi gerekir. Dorseyle kırma ve geri manevrayı simülatörde dene.',
      uret: () => [MODEL.cekici()] },
    { id: 'D', ad: 'Otobüs', yan: 1, harf: 'D', baslik: 'Otobüs', yas: '24 yaş',
      metin: 'Sürücü dahil 9\'dan fazla oturma yeri olan otobüsler.',
      not: 'Ağır vasıta pistinde araç bilgisi ve manevra sınavı.',
      egitmen: 'Otobüste önce yolcu güvenliği gelir. Kapılar kapanmadan hareket yok!',
      uret: () => [MODEL.midibus()] },
    { id: 'son', ad: 'Danışma' },
  ];
  const N = DUR.length;

  /* ---------- Sayfa iskeleti ---------- */
  const yukseklikHesap = () => innerHeight * 1.0;
  const tur = document.createElement('section');
  tur.className = 'tur'; tur.id = 'tur'; tur.setAttribute('aria-label', 'Sürücü kursu salon turu');
  tur.style.height = `calc(${N} * 100svh)`;
  const sahneEl = document.createElement('div'); sahneEl.className = 'tur-sahne'; tur.appendChild(sahneEl);
  const tuval = document.createElement('canvas'); tuval.className = 'tur-tuval'; tuval.setAttribute('aria-hidden', 'true'); sahneEl.appendChild(tuval);

  // Kahraman (başlık + indirme düğmeleri) ekrana sığıyorsa giriş kapısının önüne yerleşir
  let kahIcinde = false;
  if (!mobil && innerHeight >= 560) {
    kah.parentNode.insertBefore(tur, kah);
    kah.classList.add('tur-giris'); sahneEl.appendChild(kah);
    const yuk = kah.querySelector('.giris-a')?.getBoundingClientRect().height || 9999;
    if (yuk <= innerHeight - 96) kahIcinde = true;
    else { kah.classList.remove('tur-giris'); tur.parentNode.insertBefore(kah, tur); }
  }
  if (!kahIcinde) {
    kah.after(tur);
    const k = document.createElement('div'); k.className = 'tur-hos';
    k.innerHTML = '<span class="ust-yazi">Kurs turu</span><h2>Sürücü kursumuza hoş geldin</h2><p>Aşağı kaydır, araçların ve eğitmenlerin yanından geçerek salonda yürü.</p>';
    sahneEl.appendChild(k);
  }
  document.documentElement.classList.add('tur-acik');
  if (kahIcinde) sahneEl.classList.add('kah-icinde');

  const kart = document.createElement('aside'); kart.className = 'tur-kart'; kart.setAttribute('aria-live', 'polite'); sahneEl.appendChild(kart);
  const ipucu = document.createElement('div'); ipucu.className = 'tur-ipucu';
  ipucu.innerHTML = '<span>Aşağı kaydır, içeride yürü</span><i aria-hidden="true"></i>'; sahneEl.appendChild(ipucu);
  const ray = document.createElement('nav'); ray.className = 'tur-ray'; ray.setAttribute('aria-label', 'Tur durakları');
  DUR.forEach((d, i) => { const b = document.createElement('button'); b.type = 'button'; b.innerHTML = `<span>${d.ad}</span>`; b.setAttribute('aria-label', d.ad + ' durağına git'); b.onclick = () => durakaGit(i); ray.appendChild(b); });
  sahneEl.appendChild(ray);
  const atla = document.createElement('button'); atla.type = 'button'; atla.className = 'tur-atla'; atla.textContent = 'Turu geç ↓';
  atla.onclick = () => scrollTo({ top: tur.offsetTop + tur.offsetHeight - 60, behavior: 'smooth' }); sahneEl.appendChild(atla);
  const son = document.createElement('div'); son.className = 'tur-son';
  const ikon = d => `<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  son.innerHTML = `<div class="ts-ust"><span class="ust-yazi">Danışma</span><button type="button" class="ts-ses" aria-label="Sekreteri dinle">🔊</button></div>
    <h2>Hoş geldiniz! Nereden başlamak istersiniz?</h2>
    <div class="tur-secim">
      <a class="ts-btn" href="uygulama/?ac=sinav">${ikon('M9 11l3 3 8-8 M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9')}<span><b>E-Sınav</b><small>50 soru · 45 dakika deneme</small></span></a>
      <a class="ts-btn" href="uygulama/?ac=sim">${ikon('M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z M3.5 11h6 M14.5 11h6 M12 14.5V21')}<span><b>Simülatör</b><small>3D pist ve sürüş</small></span></a>
      <a class="ts-btn ts-play" href="https://play.google.com/store/apps/details?id=com.ehliyetbende.app" rel="noopener">${ikon('M12 3v12 M7 10l5 5 5-5 M5 21h14')}<span><b>İndir</b><small>Google Play · ücretsiz</small></span></a>
      <a class="ts-btn" href="uygulama/">${ikon('M5 12h14 M13 6l6 6-6 6')}<span><b>Devam et</b><small>Tarayıcıda, üyelik yok</small></span></a>
    </div>`;
  son.querySelector('.ts-ses').onclick = () => { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance('Hoş geldiniz! Nereden başlamak istersiniz? E-Sınav, simülatör, uygulamayı indirme ya da tarayıcıda devam etme seçeneklerinden birini seçebilirsiniz.'); u.lang = 'tr-TR'; const v = speechSynthesis.getVoices().find(v => /^tr/i.test(v.lang)); if (v) u.voice = v; speechSynthesis.speak(u); } catch (e) {} };
  sahneEl.appendChild(son);
  const yukleniyor = document.createElement('div'); yukleniyor.className = 'tur-yuk'; yukleniyor.innerHTML = '<i></i><span>Salon hazırlanıyor…</span>'; sahneEl.appendChild(yukleniyor);

  function durakaGit(i) {
    const top = tur.offsetTop + (i / (N - 1)) * (tur.offsetHeight - innerHeight);
    scrollTo({ top, behavior: 'smooth' });
  }

  /* ---------- three.js ve modeller ---------- */
  const yukle = s => new Promise((ok, no) => { const e = document.createElement('script'); e.src = s; e.onload = ok; e.onerror = no; document.head.appendChild(e); });
  const hazir = (window.THREE ? Promise.resolve() : yukle('js/three.min.js'))
    .then(() => (typeof MODEL !== 'undefined' ? null : yukle('js/modeller.js?v=3')));
  hazir.then(kur).catch(() => { yukleniyor.remove(); });

  function kur() {
    const T = THREE;
    let R;
    try { R = new T.WebGLRenderer({ canvas: tuval, antialias: !zayif, powerPreference: 'high-performance' }); }
    catch (e) { yukleniyor.remove(); return; }
    R.outputEncoding = T.sRGBEncoding; R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 0.95;
    R.shadowMap.enabled = !zayif; R.shadowMap.type = T.PCFSoftShadowMap;
    const DPR = Math.min(devicePixelRatio || 1, zayif ? 1 : (mobil ? 1.5 : 1.75));
    R.setPixelRatio(DPR);

    const S = new T.Scene();
    const HAVA = 0xCFD5DC;
    S.background = new T.Color(HAVA);
    S.fog = new T.Fog(HAVA, 30, 105);
    S.environment = MODEL.ortam(R);
    S.add(new T.HemisphereLight(0xFFFFFF, 0x8A919A, 0.6));
    const gun = new T.DirectionalLight(0xFFFFFF, 1.05);
    gun.castShadow = !zayif; gun.shadow.mapSize.set(mobil ? 1024 : 2048, mobil ? 1024 : 2048);
    const sc = gun.shadow.camera; sc.left = -22; sc.right = 22; sc.top = 22; sc.bottom = -22; sc.near = 1; sc.far = 80;
    gun.shadow.bias = -0.0004; gun.shadow.radius = 5;
    S.add(gun, gun.target);
    const dolgu = new T.DirectionalLight(0xDDE8FF, 0.35); dolgu.position.set(-10, 6, 20); S.add(dolgu);

    const kam = new T.PerspectiveCamera(55, 1, 0.1, 500);
    const mat = (c, r = 0.85, m = 0) => new T.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
    const doku = (w, h, ciz) => { const c = document.createElement('canvas'); c.width = w; c.height = h; ciz(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t; };
    const golgeAc = g => g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });

    /* --- Zemin --- */
    const asfaltD = doku(256, 256, (x, w, h) => {
      x.fillStyle = '#4A4F57'; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) { const g = 60 + Math.random() * 50 | 0; x.fillStyle = `rgba(${g},${g + 2},${g + 6},.55)`; x.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); }
    });
    asfaltD.wrapS = asfaltD.wrapT = T.RepeatWrapping;
    const karoD = doku(256, 256, (x, w, h) => {
      x.fillStyle = '#C3C9D0'; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) { x.fillStyle = Math.random() < .5 ? 'rgba(255,255,255,.35)' : 'rgba(160,168,178,.18)'; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      x.strokeStyle = '#A7AEB6'; x.lineWidth = 3; x.strokeRect(0, 0, w, h);
    });
    karoD.wrapS = karoD.wrapT = T.RepeatWrapping; karoD.repeat.set(14, 120);
    const karo = new T.Mesh(new T.PlaneGeometry(28, 240).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({ map: karoD, roughness: 0.28, metalness: 0.05, envMapIntensity: 0.9 }));
    karo.position.set(0, -0.01, -80); karo.receiveShadow = true; S.add(karo);

    /* --- Araçları kur ve yerleşimi hesapla --- */
    const istasyon = [];
    let imlec = -9;                     // giriş kapısı z=0; ilk durak kapının arkasında
    const YOL = 7.4;                    // salondaki eğitim pistinin yarı genişliği
    DUR.forEach((d, i) => {
      if (!d.uret) { istasyon.push(null); return; }
      const liste = d.uret();
      const grup = new T.Group();
      let L = 0, W = 0;
      if (liste.length === 1) {
        const A = liste[0]; const g = A.grup;
        const b = new T.Box3().setFromObject(g); L = b.max.x - b.min.x; W = b.max.z - b.min.z;
        g.rotation.y = -Math.PI / 2;                       // ön (+x) yürüyüşe dönük (+z)
        g.position.z = -(b.min.x + b.max.x) / 2;           // uzunluk merkezde
        grup.add(g);
      } else {                                             // motosikletler: yan yana, hafif açılı
        liste.forEach((A, k) => {
          const g = A.grup; const b = new T.Box3().setFromObject(g);
          g.rotation.y = -Math.PI / 2 + d.yan * 0.35; g.position.set(d.yan * k * 1.45, 0, -k * 0.6);
          L = Math.max(L, b.max.x - b.min.x + 1.2); grup.add(g);
        });
        W = 1.45 * (liste.length - 1) + 1.0;
      }
      golgeAc(grup);
      const zm = imlec - L / 2;
      const xm = d.yan * (1.75 + W / 2);
      grup.position.set(xm, 0, zm);
      S.add(grup);
      istasyon.push({ grup, L, W, z: zm, x: xm, onZ: zm + L / 2 });
      imlec = zm - L / 2 - 11;
    });
    const binaOn = imlec + 2;            // danışma masasının önü
    const sonZ = binaOn - 7;             // salonun arka duvarı

    // Asfalt alan
    const asf = new T.Mesh(new T.PlaneGeometry(YOL * 2, 22 - (binaOn + 3)).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({ map: asfaltD, roughness: 0.92 }));
    asfaltD.repeat.set(YOL / 2, (22 - (binaOn + 3)) / 4);
    asf.position.set(0, 0.002, (22 + binaOn + 3) / 2); asf.receiveShadow = true; S.add(asf);
    // Kaldırım kenarı (kırmızı-beyaz pist bordürü)
    const bordurD = doku(128, 16, (x, w, h) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#F4F4F2' : '#D2262E'; x.fillRect(i * 16, 0, 16, h); } });
    bordurD.wrapS = T.RepeatWrapping; bordurD.repeat.set((22 - (binaOn + 3)) / 8, 1);
    for (const s of [-1, 1]) {
      const b = new T.Mesh(new T.BoxGeometry(0.35, 0.18, 22 - (binaOn + 3)), new T.MeshStandardMaterial({ map: bordurD, roughness: 0.7 }));
      b.position.set(s * YOL, 0.09, (22 + binaOn + 3) / 2); b.receiveShadow = true; S.add(b);
    }
    // Yol çizgileri: orta kesik çizgi ve park alanı çizgileri
    const cizgiM = new T.MeshStandardMaterial({ color: 0xF2F2EC, roughness: 0.7 });
    const sariM = new T.MeshStandardMaterial({ color: 0xF2C21B, roughness: 0.7 });
    const kesik = new T.InstancedMesh(new T.PlaneGeometry(0.16, 2.4).rotateX(-Math.PI / 2), cizgiM, Math.ceil((40 - binaOn) / 5));
    let o4 = new T.Object3D(), kj = 0;
    for (let z = 20; z > binaOn + 5; z -= 5) { o4.position.set(0, 0.012, z); o4.updateMatrix(); kesik.setMatrixAt(kj++, o4.matrix); }
    kesik.count = kj; kesik.receiveShadow = true; S.add(kesik);
    const platM = new T.MeshStandardMaterial({ color: 0x2B2F36, roughness: 0.35, metalness: 0.2 });
    const ledM = new T.MeshStandardMaterial({ color: 0xF2C21B, emissive: 0xF2C21B, emissiveIntensity: 0.9, roughness: 0.4 });
    istasyon.forEach(s => {
      if (!s) return; const pw = s.W + 1.6, pl = s.L + 1.8;
      const p = new T.Mesh(new T.BoxGeometry(pw, 0.12, pl), platM); p.position.set(s.x, 0.06, s.z); p.receiveShadow = true; S.add(p);
      for (const [w, l, x, z] of [[pw + 0.04, 0.05, s.x, s.z + pl / 2], [pw + 0.04, 0.05, s.x, s.z - pl / 2], [0.05, pl, s.x - pw / 2, s.z], [0.05, pl, s.x + pw / 2, s.z]]) {
        const e = new T.Mesh(new T.BoxGeometry(w, 0.05, l), ledM); e.position.set(x, 0.1, z); S.add(e); }
      s.grup.position.y = 0.12;
    });

    /* --- Tabelalar --- */
    const tabelaDoku = (harf, ad) => doku(512, 320, (x, w, h) => {
      x.fillStyle = '#14204A'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#F2C21B'; x.fillRect(0, h - 18, w, 18);
      x.fillStyle = '#F2C21B'; x.beginPath(); x.arc(118, 140, 92, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#14204A'; x.font = `800 ${harf.length > 2 ? 54 : 96}px Poppins, Arial, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(harf.replace(/ · /g, '·'), 118, 146);
      x.fillStyle = '#FFFFFF'; x.textAlign = 'left'; x.font = '700 44px Poppins, Arial, sans-serif';
      ad.split(' ').reduce((s, k) => { if ((s.at(-1) + ' ' + k).length > 11 && s.at(-1)) s.push(k); else s[s.length - 1] = (s.at(-1) ? s.at(-1) + ' ' : '') + k; return s; }, ['']).forEach((t, j, a) => x.fillText(t, 236, 140 + (j - (a.length - 1) / 2) * 52));
    });
    const direkM = mat(0x8E959D, 0.4, 0.8);
    DUR.forEach((d, i) => {
      const s = istasyon[i]; if (!s) return;
      const g = new T.Group();
      const dir = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 2.6, 10), direkM); dir.position.y = 1.3; g.add(dir);
      const pano = new T.Mesh(new T.BoxGeometry(1.7, 1.06, 0.06), [mat(0x14204A), mat(0x14204A), mat(0x14204A), mat(0x14204A), new T.MeshStandardMaterial({ map: tabelaDoku(d.harf, d.baslik), roughness: 0.6 }), mat(0x14204A)]);
      pano.position.y = 2.5; g.add(pano);
      g.position.set(d.yan * (Math.abs(s.x) + s.W / 2 + 1.6), 0, s.onZ + 0.6);
      g.rotation.y = -d.yan * 0.35;
      golgeAc(g); S.add(g);
    });

    /* --- Giriş kapısı --- */
    const kapiD = doku(1024, 120, (x, w, h) => {
      x.fillStyle = '#14204A'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#F2C21B'; x.fillRect(0, h - 10, w, 10);
      x.fillStyle = '#FFFFFF'; x.font = '800 52px Poppins, Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText('EHLİYET BENDE · SÜRÜCÜ KURSU', w / 2, h / 2 - 3);
    });
    const logo = new Image(); logo.src = 'gorsel/logo-yatay-acik.png?v=1';
    logo.onload = () => { const c = kapiD.image, x = c.getContext('2d'); x.fillStyle = '#14204A'; x.fillRect(0, 0, c.width, c.height - 10); const hh = 84, ww = logo.width * hh / logo.height; x.drawImage(logo, (c.width - ww) / 2 - 140, 16, ww, hh); x.fillStyle = '#FFFFFF'; x.font = '700 40px Poppins, Arial, sans-serif'; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText('SÜRÜCÜ KURSU', (c.width + ww) / 2 - 110, 58); kapiD.needsUpdate = true; ciz(); };
    const kapi = new T.Group();
    for (const s of [-1, 1]) {
      const ay = new T.Mesh(new T.BoxGeometry(0.9, 5.2, 0.9), mat(0x14204A, 0.5)); ay.position.set(s * 6.6, 2.6, 0); kapi.add(ay);
      const ser = new T.Mesh(new T.BoxGeometry(0.94, 0.5, 0.94), mat(0xF2C21B, 0.6)); ser.position.set(s * 6.6, 0.25, 0); kapi.add(ser);
    }
    const kiris = new T.Mesh(new T.BoxGeometry(14.2, 1.3, 0.6), [mat(0x14204A), mat(0x14204A), mat(0x14204A), mat(0x14204A), new T.MeshStandardMaterial({ map: kapiD, roughness: 0.6 }), mat(0x14204A)]);
    kiris.position.set(0, 5.4, 0); kapi.add(kiris);
    golgeAc(kapi); S.add(kapi);

    /* --- Danışma: arka duvar, masa, sekreter --- */
    const duvarM = mat(0xD8DCE1, 0.9);
    const arka = new T.Mesh(new T.PlaneGeometry(28, 9), duvarM); arka.position.set(0, 4.5, sonZ); arka.receiveShadow = true; S.add(arka);
    const logoPanoD = doku(1024, 320, (x, w, h) => { x.fillStyle = '#14204A'; x.fillRect(0, 0, w, h); x.fillStyle = '#F2C21B'; x.fillRect(0, h - 14, w, 14); });
    const logoPano = new T.Mesh(new T.PlaneGeometry(9, 2.8), new T.MeshStandardMaterial({ map: logoPanoD, roughness: 0.5 }));
    logoPano.position.set(0, 5.1, sonZ + 0.03); S.add(logoPano);
    const logo2 = new Image(); logo2.src = 'gorsel/logo-yatay-acik.png?v=1';
    logo2.onload = () => { const c = logoPanoD.image, x = c.getContext('2d'); const hh = 170, ww = logo2.width * hh / logo2.height; x.drawImage(logo2, (c.width - ww) / 2, 50, ww, hh); x.fillStyle = '#C9D2DC'; x.font = '600 40px Poppins, Arial, sans-serif'; x.textAlign = 'center'; x.fillText('DANIŞMA', c.width / 2, 268); logoPanoD.needsUpdate = true; ciz(); };
    const masa = new T.Group();
    const masaGovde = new T.Mesh(new T.BoxGeometry(4.4, 1.08, 0.9), [mat(0xF4F5F6, 0.5), mat(0xF4F5F6, 0.5), mat(0x2B2F36, 0.4), mat(0xF4F5F6, 0.5), new T.MeshStandardMaterial({ map: doku(512, 128, (x, w, h) => { x.fillStyle = '#F4F5F6'; x.fillRect(0, 0, w, h); x.fillStyle = '#14204A'; x.fillRect(0, h - 34, w, 34); x.fillStyle = '#F2C21B'; x.fillRect(0, h - 40, w, 6); x.fillStyle = '#14204A'; x.font = '800 42px Poppins, Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('DANIŞMA', w / 2, 44); }), roughness: 0.5 }), mat(0xF4F5F6, 0.5)]);
    masaGovde.position.set(0, 0.54, 0); masa.add(masaGovde);
    const ust = new T.Mesh(new T.BoxGeometry(4.6, 0.06, 1.15), mat(0x6E4E37, 0.45)); ust.position.set(0, 1.11, -0.08); masa.add(ust);
    const ekran = new T.Mesh(new T.BoxGeometry(0.62, 0.38, 0.03), mat(0x111418, 0.3, 0.4)); ekran.position.set(1.1, 1.38, -0.25); ekran.rotation.y = 0.5; masa.add(ekran);
    const ayak = new T.Mesh(new T.BoxGeometry(0.06, 0.16, 0.06), mat(0x111418, 0.3, 0.4)); ayak.position.set(1.1, 1.2, -0.25); masa.add(ayak);
    masa.position.set(0, 0, binaOn - 0.45); golgeAc(masa); S.add(masa);
    // Saksılar
    for (const s of [-1, 1]) {
      const sak = new T.Mesh(new T.CylinderGeometry(0.32, 0.26, 0.6, 18), mat(0x2B2F36, 0.5)); sak.position.set(s * 3.2, 0.3, binaOn - 0.4); S.add(sak);
      const yap = new T.Mesh(new T.IcosahedronGeometry(0.55, 1), mat(0x3F7A3A, 0.9)); yap.position.set(s * 3.2, 1.05, binaOn - 0.4); yap.scale.set(1, 1.35, 1); S.add(yap);
      golgeAc(sak); golgeAc(yap);
    }
    // Sekreter: masanın arkasında, yürüyene bakar
    const V3 = (x, y, z) => new T.Vector3(x, y, z);
    const ek = { kalca: V3(0, 0.98, 0), kalcaL: V3(0, 0.97, -0.10), kalcaR: V3(0, 0.97, 0.10),
      omuzL: V3(-0.01, 1.42, -0.18), omuzR: V3(-0.01, 1.42, 0.18), boyun: V3(0, 1.51, 0), bas: V3(0.01, 1.66, 0),
      dizL: V3(0.03, 0.52, -0.10), dizR: V3(0.03, 0.52, 0.10), ayakL: V3(-0.01, 0.09, -0.11), ayakR: V3(-0.01, 0.09, 0.11),
      dirsekL: V3(0.14, 1.16, -0.22), dirsekR: V3(0.14, 1.16, 0.22), elL: V3(0.40, 1.15, -0.13), elR: V3(0.40, 1.15, 0.13) };
    const sek = MODEL.insan(ek, { ceket: 0x14204A, pantolon: 0x1D2330, ten: 0xE3B08E, sac: 0x3B2418 });
    const sacM = new T.MeshStandardMaterial({ color: 0x3B2418, roughness: 0.8 });
    const uzunSac = new T.Mesh(new T.SphereGeometry(0.118, 22, 16), sacM); uzunSac.scale.set(0.95, 1.85, 1.12); uzunSac.position.set(-0.045, -0.11, 0); sek.userData.bas.add(uzunSac);
    const yaka = new T.Mesh(new T.BoxGeometry(0.03, 0.12, 0.12), mat(0xFFFFFF, 0.6)); yaka.position.set(0.13, 1.40, 0); sek.add(yaka);
    const kartS = new T.Mesh(new T.PlaneGeometry(0.11, 0.06), new T.MeshStandardMaterial({ map: doku(256, 140, (x, w, h) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.fillStyle = '#14204A'; x.fillRect(0, 0, w, 34); x.fillStyle = '#fff'; x.font = '700 24px Arial'; x.textAlign = 'center'; x.fillText('EHLİYET BENDE', w / 2, 25); x.fillStyle = '#14204A'; x.font = '700 34px Arial'; x.fillText('DANIŞMA', w / 2, 100); }), roughness: 0.6 }));
    kartS.position.set(0.15, 1.30, -0.09); kartS.rotation.y = Math.PI / 2; sek.add(kartS);
    MODEL.dogrusal(sek); golgeAc(sek);
    sek.position.set(0, 0, binaOn - 1.35); sek.rotation.y = -Math.PI / 2; S.add(sek);
    /* --- Ağaçlar, direkler, dubalar (instanced) --- */
    let tohum = 7; const rnd = () => (tohum = (tohum * 16807) % 2147483647) / 2147483647;
    const SALON = 13, TAVAN = 8.4, bas0 = 22, uzun = bas0 - sonZ;
    // Yan duvarlar: alt panel + üstte gün ışığı alan pencere bandı
    for (const s of [-1, 1]) {
      const d = new T.Mesh(new T.PlaneGeometry(uzun, TAVAN), duvarM); d.rotation.y = -s * Math.PI / 2; d.position.set(s * SALON, TAVAN / 2, (bas0 + sonZ) / 2); d.receiveShadow = true; S.add(d);
      const cam = new T.Mesh(new T.PlaneGeometry(uzun, 2.2), new T.MeshBasicMaterial({ color: 0xA9C6E2, fog: true })); cam.rotation.y = -s * Math.PI / 2; cam.position.set(s * (SALON - 0.02), 6.2, (bas0 + sonZ) / 2); S.add(cam);
      const supurgelik = new T.Mesh(new T.BoxGeometry(0.06, 0.18, uzun), mat(0x14204A, 0.5)); supurgelik.position.set(s * (SALON - 0.03), 0.09, (bas0 + sonZ) / 2); S.add(supurgelik);
    }
    const tavan = new T.Mesh(new T.PlaneGeometry(SALON * 2, uzun), mat(0xE2E5E9, 0.95)); tavan.rotation.x = Math.PI / 2; tavan.position.set(0, TAVAN, (bas0 + sonZ) / 2); S.add(tavan);
    // Tavan ışık panelleri
    const panSay = Math.ceil(uzun / 6) * 4;
    const panI = new T.InstancedMesh(new T.BoxGeometry(3.2, 0.06, 0.9), new T.MeshBasicMaterial({ color: 0xFFFFFF }), panSay);
    const o3 = new T.Object3D(); let ki = 0;
    for (let z = bas0 - 3; z > sonZ + 2; z -= 6) for (const x of [-8.5, -3, 3, 8.5]) { o3.position.set(x, TAVAN - 0.04, z); o3.updateMatrix(); panI.setMatrixAt(ki++, o3.matrix); }
    panI.count = ki; S.add(panI);
    // Kolonlar
    const kolSay = Math.ceil(uzun / 12) * 2;
    const kolI = new T.InstancedMesh(new T.BoxGeometry(0.8, TAVAN, 0.8), mat(0xE4E7EA, 0.7), kolSay);
    ki = 0;
    for (let z = bas0 - 6; z > sonZ + 3; z -= 12) for (const s of [-1, 1]) { o3.position.set(s * (SALON - 0.4), TAVAN / 2, z); o3.updateMatrix(); kolI.setMatrixAt(ki++, o3.matrix); }
    kolI.count = ki; kolI.castShadow = kolI.receiveShadow = true; S.add(kolI);
    // Duvar afişleri
    const AFIS = [['E-SINAV', '50 soru · 45 dakika'], ['3D PİST', 'Adım adım anlatım'], ['SİMÜLATÖR', 'Direksiyon seti desteği'], ['50 KM', 'Trafikli sınav güzergahı'], ['ÜCRETSİZ', 'Premium herkese açık'], ['DÜELLO', 'Arkadaşınla yarış']];
    AFIS.forEach((a, k) => {
      const t = doku(512, 340, (x, w, h) => { x.fillStyle = k % 2 ? '#14204A' : '#E0262E'; x.fillRect(0, 0, w, h); x.fillStyle = '#F2C21B'; x.fillRect(0, h - 16, w, 16); x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = '800 86px Poppins, Arial, sans-serif'; x.fillText(a[0], w / 2, 160); x.font = '600 34px Poppins, Arial, sans-serif'; x.fillStyle = '#E6ECF3'; x.fillText(a[1], w / 2, 230); });
      const s = k % 2 ? 1 : -1, z = bas0 - 12 - k * ((bas0 - sonZ - 24) / AFIS.length);
      const m = new T.Mesh(new T.PlaneGeometry(4.2, 2.8), new T.MeshStandardMaterial({ map: t, roughness: 0.6 })); m.rotation.y = -s * Math.PI / 2; m.position.set(s * (SALON - 0.05), 3.1, z); S.add(m);
    });
    // Dubalar: motosiklet durağının karşısında slalom, diğerlerinde sıra
    const dubaM = [mat(0xF26B1D, 0.6), mat(0xF4F4F2, 0.5)];
    const dubaSay = 40;
    const dubaI = new T.InstancedMesh(new T.ConeGeometry(0.2, 0.62, 14), dubaM[0], dubaSay);
    const bantI = new T.InstancedMesh(new T.CylinderGeometry(0.122, 0.145, 0.1, 14), dubaM[1], dubaSay);
    ki = 0;
    istasyon.forEach((s, i) => {
      if (!s) return; const k = DUR[i].yan;
      const adet = i === 2 ? 7 : 4;
      for (let j = 0; j < adet && ki < dubaSay; j++) {
        const x = i === 2 ? -k * (5.5 + (j % 2) * 1.2) : -k * 7.6, z = s.onZ - j * (i === 2 ? 2.2 : 1.6);
        o3.rotation.set(0, 0, 0); o3.scale.set(1, 1, 1); o3.position.set(x, 0.31, z); o3.updateMatrix(); dubaI.setMatrixAt(ki, o3.matrix);
        o3.position.set(x, 0.36, z); o3.updateMatrix(); bantI.setMatrixAt(ki, o3.matrix); ki++;
      }
    });
    dubaI.count = bantI.count = ki; dubaI.castShadow = true; S.add(dubaI, bantI);
    // Trafik ışığı ve DUR levhası
    const isik = new T.Group();
    { const d = new T.Mesh(new T.CylinderGeometry(0.08, 0.08, 3.4, 10), mat(0x2B2F35, 0.5, 0.5)); d.position.y = 1.7; isik.add(d);
      const k = new T.Mesh(new T.BoxGeometry(0.42, 1.2, 0.34), mat(0x1A1C1F, 0.5)); k.position.y = 3.6; isik.add(k);
      [0xFF3B3B, 0xFFC21B, 0x22D36F].forEach((c, j) => { const l = new T.Mesh(new T.CircleGeometry(0.12, 18), new T.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: j === 2 ? 1.6 : 0.08 })); l.position.set(0, 3.98 - j * 0.38, 0.175); isik.add(l); }); }
    const s1 = istasyon[3]; isik.position.set(-DUR[3].yan * 8.2, 0, s1 ? s1.onZ + 3 : -40); golgeAc(isik); S.add(isik);
    const durD = doku(256, 256, (x, w, h) => { x.fillStyle = '#C8102E'; x.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; x.lineTo(w / 2 + Math.cos(a) * 124, h / 2 + Math.sin(a) * 124); } x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 8; x.stroke(); x.fillStyle = '#fff'; x.font = '800 86px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('DUR', w / 2, h / 2 + 4); });
    const durL = new T.Group();
    { const d = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 2.4, 8), direkM); d.position.y = 1.2; durL.add(d);
      const p = new T.Mesh(new T.CircleGeometry(0.42, 8), new T.MeshStandardMaterial({ map: durD, transparent: true, roughness: 0.6 })); p.position.set(0, 2.45, 0.04); durL.add(p); }
    const s2 = istasyon[5]; durL.position.set(-DUR[5].yan * 7.8, 0, s2 ? s2.onZ + 2 : -60); golgeAc(durL); S.add(durL);

    /* --- Eğitmenler --- */
    const egitmenler = [{ e: sek, b: null, bas: sek.userData.bas }];
    const egitmenEkle = (x, z, ryon, metin) => {
      const e = MODEL.egitmen({ boy: 1.0 }); e.position.set(x, 0, z); e.rotation.y = ryon; golgeAc(e); S.add(e);
      const b = document.createElement('div'); b.className = 'tur-balon';
      b.innerHTML = `<span>${metin}</span><button type="button" aria-label="Eğitmeni dinle">🔊</button>`;
      b.querySelector('button').onclick = () => konus(metin);
      sahneEl.appendChild(b);
      egitmenler.push({ e, b, bas: e.userData.bas, metin });
    };
    egitmenEkle(2.6, -2.2, -Math.PI / 2 - 0.25, 'Hoş geldin! Ben eğitmenin. Aşağı kaydır, kursumuzu birlikte gezelim.');
    DUR.forEach((d, i) => { const s = istasyon[i]; if (s && d.egitmen) egitmenEkle(d.yan * 1.55, s.onZ + 1.4, -Math.PI / 2 - d.yan * 0.35, d.egitmen); });

    function konus(m) {
      if (!('speechSynthesis' in window)) return;
      try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(m); u.lang = 'tr-TR'; const v = speechSynthesis.getVoices().find(v => /^tr/i.test(v.lang)); if (v) u.voice = v; speechSynthesis.speak(u); } catch (e) {}
    }

    /* --- Kamera yolu: her durakta hafifçe yavaşlar --- */
    const K = DUR.map((d, i) => i === 0 ? 14 : (i === N - 1 ? binaOn + 5.4 : istasyon[i].onZ + 6.5));
    const yumusak = t => { const a = Math.min(1, Math.max(0, (t - 0.16) / 0.68)); return a * a * (3 - 2 * a); };
    const zAt = p => { const f = p * (N - 1), i = Math.min(N - 2, Math.floor(f)); return K[i] + (K[i + 1] - K[i]) * yumusak(f - i); };

    /* --- Ölçü --- */
    function boyut() {
      const w = sahneEl.clientWidth, h = sahneEl.clientHeight;
      R.setSize(w, h, false); kam.aspect = w / h;
      const yatay = THREE.MathUtils.degToRad(mobil ? 78 : 74);
      kam.fov = Math.min(80, Math.max(48, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(yatay / 2) / kam.aspect))));
      kam.updateProjectionMatrix(); kirli = true;
    }
    addEventListener('resize', () => { boyut(); planla(); });

    /* --- Döngü --- */
    let hedef = 0, pc = 0, kirli = true, gorunur = true, son_t = performance.now(), yurume = 0, oncekiZ = K[0];
    const v = new T.Vector3(), bak = new T.Vector3();
    function ilerleme() {
      const r = tur.getBoundingClientRect(); const top = r.height - innerHeight;
      return top > 0 ? Math.min(1, Math.max(0, -r.top / top)) : 0;
    }
    function ciz() { kirli = true; planla(); }
    let bekliyor = false;
    function planla() { if (!bekliyor && gorunur) { bekliyor = true; requestAnimationFrame(kare); } }
    function kare(t) {
      if (!sahneEl.isConnected) return;
      bekliyor = false;
      const dt = Math.min(0.05, (t - son_t) / 1000 || 0.016); son_t = t;
      hedef = ilerleme();
      const fark = hedef - pc;
      pc += fark * Math.min(1, dt * 5.5);
      if (Math.abs(fark) < 0.00005) pc = hedef;
      const z = zAt(pc);
      yurume += Math.abs(z - oncekiZ); oncekiZ = z;
      // bakış: duraktaki araca doğru dönüş
      const dar = kam.aspect < 1;
      // bakış: duraktaki aracın ortasına doğru yumuşakça döner
      bak.set(0, 1.45, z - 10); let topW = 0; const hedefN = new T.Vector3();
      DUR.forEach((d, i) => { const st = istasyon[i]; if (!st) return; const u = z - K[i];
        const w = (dar ? 0.85 : 0.62) * Math.exp(-(u * u) / 26);
        if (w > topW) { topW = w; hedefN.set(st.x, Math.min(1.3, 0.55 + st.W * 0.12), st.z + st.L * 0.1); } });
      if (topW > 0.001) bak.lerp(hedefN, topW);
      const sonY = Math.max(0, 1 - Math.abs(z - K[N - 1]) / 9); if (sonY > 0) bak.lerp(hedefN.set(0, dar ? 1.15 : 0.95, binaOn - 1.35), sonY);
      kam.position.set(0, 1.66 + Math.sin(yurume * 2.1) * 0.022, z);
      kam.lookAt(bak);
      // gölge kamerayla gelir
      gun.position.set(kam.position.x + 14, 26, z + 10); gun.target.position.set(0, 0, z - 12);
      // eğitmen başları yürüyene döner
      egitmenler.forEach(o => {
        const e = o.e; v.set(kam.position.x - e.position.x, 0, kam.position.z - e.position.z);
        const ac = Math.atan2(-v.z, v.x) - e.rotation.y;
        const a = ((ac + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
        if (o.bas) o.bas.rotation.y = Math.max(-0.9, Math.min(0.9, a));
      });
      R.render(S, kam);
      arayuz(z);
      if (Math.abs(hedef - pc) > 0.00005) planla();
    }

    /* --- Arayüz katmanları --- */
    let aktif = -1;
    function arayuz(z) {
      const f = pc * (N - 1);
      const yakin = Math.round(f), uzak = Math.abs(f - yakin);
      const gor = Math.max(0, 1 - uzak / 0.34);
      // giriş
      const g = Math.max(0, 1 - pc * (N - 1) / 0.45);
      const giris = kahIcinde ? kah : sahneEl.querySelector('.tur-hos');
      if (giris) { giris.style.opacity = g.toFixed(3); giris.style.transform = `translateY(${(-40 * (1 - g)).toFixed(1)}px)`; giris.style.visibility = g < 0.02 ? 'hidden' : ''; }
      ipucu.style.opacity = Math.max(0, 1 - pc * 30).toFixed(2);
      // durak kartı
      const d = DUR[yakin];
      if (d && d.metin) {
        if (aktif !== yakin) {
          aktif = yakin;
          kart.innerHTML = `<div class="tk-ust"><span class="harf">${d.harf}</span><div><h3>${d.baslik}</h3><span class="yas">En küçük yaş: ${d.yas}</span></div></div><p>${d.metin}</p><p class="tk-not">${d.not}</p><a class="tk-link" href="uygulama/">Bu sınıfın pistini çalış →</a>`;
          kart.classList.toggle('sag', d.yan < 0);
        }
        kart.style.opacity = gor.toFixed(3); kart.style.visibility = gor < 0.02 ? 'hidden' : '';
        kart.style.transform = `translateY(${(24 * (1 - gor)).toFixed(1)}px)`;
      } else { kart.style.opacity = 0; kart.style.visibility = 'hidden'; aktif = -1; }
      // son ekran
      const s = Math.max(0, (f - (N - 1.35)) / 0.3);
      son.style.opacity = Math.min(1, s).toFixed(3); son.style.visibility = s < 0.02 ? 'hidden' : '';
      // ray
      [...ray.children].forEach((b, i) => b.classList.toggle('on', i === yakin));
      // eğitmen balonları
      const w = sahneEl.clientWidth, h = sahneEl.clientHeight;
      egitmenler.forEach(o => {
        if (!o.b) return;
        const mesafe = kam.position.z - o.e.position.z;
        v.set(o.e.position.x, 2.05, o.e.position.z).project(kam);
        const gorun = mesafe > 2.2 && mesafe < 15 && v.z < 1 && Math.abs(v.x) < 0.95 && Math.abs(v.y) < 0.95;
        const a = gorun ? Math.min(1, (mesafe - 2.2) / 2, (15 - mesafe) / 3) : 0;
        o.b.style.opacity = a.toFixed(3); o.b.style.visibility = a < 0.02 ? 'hidden' : '';
        if (a > 0) o.b.style.transform = `translate(${((v.x + 1) / 2 * w).toFixed(1)}px, ${((1 - v.y) / 2 * h).toFixed(1)}px) translate(-50%, -100%)`;
      });
      // başlık çubuğunun gölgesi
      document.documentElement.classList.toggle('tur-icinde', pc > 0.002 && pc < 0.999);
    }

    // Görünürlük
    new IntersectionObserver(es => { gorunur = es[0].isIntersecting; if (gorunur) { kirli = true; planla(); } }, { rootMargin: '100px 0px' }).observe(tur);
    addEventListener('scroll', planla, { passive: true });

    boyut();
    pc = hedef = ilerleme();
    sahneEl.classList.add('hazir');
    setTimeout(() => yukleniyor.remove(), 900);
    planla();
  }
})();
