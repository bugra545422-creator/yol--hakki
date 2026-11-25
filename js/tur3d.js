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
    { id: 'son', ad: 'Sınav merkezi' },
  ];
  const N = DUR.length;

  /* ---------- Sayfa iskeleti ---------- */
  const yukseklikHesap = () => innerHeight * 1.0;
  const tur = document.createElement('section');
  tur.className = 'tur'; tur.id = 'tur'; tur.setAttribute('aria-label', 'Sürücü kursu kampüs turu');
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
    k.innerHTML = '<span class="ust-yazi">Kampüs turu</span><h2>Sürücü kursumuza hoş geldin</h2><p>Aşağı kaydır, araçların ve eğitmenlerin yanından geçerek kampüste yürü.</p>';
    sahneEl.appendChild(k);
  }
  document.documentElement.classList.add('tur-acik');
  if (kahIcinde) sahneEl.classList.add('kah-icinde');

  const kart = document.createElement('aside'); kart.className = 'tur-kart'; kart.setAttribute('aria-live', 'polite'); sahneEl.appendChild(kart);
  const ipucu = document.createElement('div'); ipucu.className = 'tur-ipucu';
  ipucu.innerHTML = '<span>Aşağı kaydır, kampüste yürü</span><i aria-hidden="true"></i>'; sahneEl.appendChild(ipucu);
  const ray = document.createElement('nav'); ray.className = 'tur-ray'; ray.setAttribute('aria-label', 'Tur durakları');
  DUR.forEach((d, i) => { const b = document.createElement('button'); b.type = 'button'; b.innerHTML = `<span>${d.ad}</span>`; b.setAttribute('aria-label', d.ad + ' durağına git'); b.onclick = () => durakaGit(i); ray.appendChild(b); });
  sahneEl.appendChild(ray);
  const atla = document.createElement('button'); atla.type = 'button'; atla.className = 'tur-atla'; atla.textContent = 'Turu geç ↓';
  atla.onclick = () => scrollTo({ top: tur.offsetTop + tur.offsetHeight - 60, behavior: 'smooth' }); sahneEl.appendChild(atla);
  const son = document.createElement('div'); son.className = 'tur-son';
  const dug = kah.querySelector('.dugmeler');
  son.innerHTML = '<span class="ust-yazi">Sınav merkezi</span><h2>Turu bitirdin. Sıra sende!</h2><p>E-Sınav denemeleri, 3D pistler ve sürüş simülasyonu ücretsiz.</p>';
  if (dug) { const c = dug.cloneNode(true); c.querySelectorAll('[id]').forEach(e => e.id = e.id + '-2'); c.querySelectorAll('[fill^="url(#"]').forEach(e => e.setAttribute('fill', e.getAttribute('fill').replace(')', '-2)'))); son.appendChild(c); }
  sahneEl.appendChild(son);
  const yukleniyor = document.createElement('div'); yukleniyor.className = 'tur-yuk'; yukleniyor.innerHTML = '<i></i><span>Kampüs hazırlanıyor…</span>'; sahneEl.appendChild(yukleniyor);

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
    R.outputEncoding = T.sRGBEncoding; R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
    R.shadowMap.enabled = !zayif; R.shadowMap.type = T.PCFSoftShadowMap;
    const DPR = Math.min(devicePixelRatio || 1, zayif ? 1 : (mobil ? 1.5 : 1.75));
    R.setPixelRatio(DPR);

    const S = new T.Scene();
    const GOK = 0xDDE8F2;
    S.fog = new T.Fog(GOK, 38, 150);
    S.environment = MODEL.ortam(R);
    // Gökyüzü
    const gok = new T.Mesh(new T.SphereGeometry(400, 32, 16), new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 p; void main(){ p=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'varying vec3 p; void main(){ float y=max(p.y,0.); vec3 ufuk=vec3(.87,.91,.95); vec3 ust=vec3(.42,.66,.90); vec3 c=mix(ufuk,ust,pow(y,.55)); gl_FragColor=vec4(c,1.); }'
    }));
    S.add(gok);
    S.add(new T.HemisphereLight(0xEAF2FF, 0x5A6B4A, 0.55));
    const gun = new T.DirectionalLight(0xFFF4E2, 1.35);
    gun.castShadow = !zayif; gun.shadow.mapSize.set(mobil ? 1024 : 2048, mobil ? 1024 : 2048);
    const sc = gun.shadow.camera; sc.left = -22; sc.right = 22; sc.top = 22; sc.bottom = -22; sc.near = 1; sc.far = 80;
    gun.shadow.bias = -0.0004; gun.shadow.radius = 4;
    S.add(gun, gun.target);

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
    const cimD = doku(256, 256, (x, w, h) => {
      x.fillStyle = '#7BA05B'; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 3000; i++) { x.fillStyle = Math.random() < .5 ? 'rgba(96,138,70,.6)' : 'rgba(150,186,110,.45)'; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    });
    cimD.wrapS = cimD.wrapT = T.RepeatWrapping; cimD.repeat.set(80, 80);
    const cim = new T.Mesh(new T.PlaneGeometry(600, 600).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({ map: cimD, roughness: 1 }));
    cim.position.y = -0.02; cim.receiveShadow = true; S.add(cim);

    /* --- Araçları kur ve yerleşimi hesapla --- */
    const istasyon = [];
    let imlec = -9;                     // giriş kapısı z=0; ilk durak kapının arkasında
    const YOL = 10;                     // kampüs alanının yarı genişliği
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
    const binaOn = imlec - 6;            // sınav merkezi ön cephesi
    const sonZ = binaOn - 40;

    // Asfalt alan
    const asf = new T.Mesh(new T.PlaneGeometry(YOL * 2, 40 - sonZ).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({ map: asfaltD, roughness: 0.92 }));
    asfaltD.repeat.set(YOL / 2, (40 - sonZ) / 4);
    asf.position.set(0, 0, (40 + sonZ) / 2); asf.receiveShadow = true; S.add(asf);
    // Kaldırım kenarı (kırmızı-beyaz pist bordürü)
    const bordurD = doku(128, 16, (x, w, h) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#F4F4F2' : '#D2262E'; x.fillRect(i * 16, 0, 16, h); } });
    bordurD.wrapS = T.RepeatWrapping; bordurD.repeat.set((40 - sonZ) / 8, 1);
    for (const s of [-1, 1]) {
      const b = new T.Mesh(new T.BoxGeometry(0.35, 0.18, 40 - sonZ), new T.MeshStandardMaterial({ map: bordurD, roughness: 0.7 }));
      b.position.set(s * YOL, 0.09, (40 + sonZ) / 2); b.receiveShadow = true; S.add(b);
    }
    // Yol çizgileri: orta kesik çizgi ve park alanı çizgileri
    const cizgiM = new T.MeshStandardMaterial({ color: 0xF2F2EC, roughness: 0.7 });
    const sariM = new T.MeshStandardMaterial({ color: 0xF2C21B, roughness: 0.7 });
    const kesik = new T.InstancedMesh(new T.PlaneGeometry(0.16, 2.4).rotateX(-Math.PI / 2), cizgiM, Math.ceil((40 - binaOn) / 5));
    const o3 = new T.Object3D(); let ki = 0;
    for (let z = 30; z > binaOn + 2; z -= 5) { o3.position.set(0, 0.012, z); o3.updateMatrix(); kesik.setMatrixAt(ki++, o3.matrix); }
    kesik.count = ki; kesik.receiveShadow = true; S.add(kesik);
    istasyon.forEach(s => {
      if (!s) return; const pw = s.W + 1.4, pl = s.L + 1.6;
      const parca = (w, l, x, z) => { const m = new T.Mesh(new T.PlaneGeometry(w, l).rotateX(-Math.PI / 2), sariM); m.position.set(x, 0.013, z); m.receiveShadow = true; S.add(m); };
      parca(pw, 0.14, s.x, s.z + pl / 2); parca(pw, 0.14, s.x, s.z - pl / 2);
      parca(0.14, pl, s.x - pw / 2, s.z); parca(0.14, pl, s.x + pw / 2, s.z);
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
      const ay = new T.Mesh(new T.BoxGeometry(0.9, 5.6, 0.9), mat(0xE9ECEF, 0.7)); ay.position.set(s * 6.6, 2.8, 0); kapi.add(ay);
      const ser = new T.Mesh(new T.BoxGeometry(0.94, 0.5, 0.94), mat(0xF2C21B, 0.6)); ser.position.set(s * 6.6, 1.0, 0); kapi.add(ser);
    }
    const kiris = new T.Mesh(new T.BoxGeometry(14.2, 1.3, 0.6), [mat(0x14204A), mat(0x14204A), mat(0x14204A), mat(0x14204A), new T.MeshStandardMaterial({ map: kapiD, roughness: 0.6 }), mat(0x14204A)]);
    kiris.position.set(0, 5.6, 0); kapi.add(kiris);
    // bariyer kolu (kalkık)
    const kol = new T.Mesh(new T.BoxGeometry(0.12, 0.12, 4.6), new T.MeshStandardMaterial({ map: bordurD.clone(), roughness: 0.6 }));
    kol.geometry.translate(0, 0, -2.3); kol.position.set(5.9, 1.15, 0.6); kol.rotation.x = 1.15; kapi.add(kol);
    golgeAc(kapi); S.add(kapi);

    /* --- Sınav merkezi binası --- */
    const pencereD = doku(512, 256, (x, w, h) => {
      x.fillStyle = '#EEF0F2'; x.fillRect(0, 0, w, h);
      for (let r = 0; r < 2; r++) for (let c = 0; c < 8; c++) { x.fillStyle = '#5E7C98'; x.fillRect(16 + c * 62, 26 + r * 120, 46, 78); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(18 + c * 62, 28 + r * 120, 18, 74); }
    });
    const bina = new T.Group();
    const govde = new T.Mesh(new T.BoxGeometry(30, 9, 12), [mat(0xE3E6E9), mat(0xE3E6E9), mat(0xD6DADF), mat(0xE3E6E9), new T.MeshStandardMaterial({ map: pencereD, roughness: 0.6 }), mat(0xE3E6E9)]);
    govde.position.set(0, 4.5, binaOn - 6); bina.add(govde);
    const kapiCam = new T.Mesh(new T.BoxGeometry(5, 3.4, 0.3), new T.MeshStandardMaterial({ color: 0x2E4A66, roughness: 0.1, metalness: 0.6 }));
    kapiCam.position.set(0, 1.7, binaOn + 0.05); bina.add(kapiCam);
    const sacak = new T.Mesh(new T.BoxGeometry(8, 0.3, 2.4), mat(0x14204A, 0.6)); sacak.position.set(0, 3.7, binaOn + 1.1); bina.add(sacak);
    const binaYaziD = doku(1024, 160, (x, w, h) => { x.fillStyle = '#14204A'; x.fillRect(0, 0, w, h); x.fillStyle = '#F2C21B'; x.font = '800 92px Poppins, Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('SINAV MERKEZİ', w / 2, h / 2 + 4); });
    const binaYazi = new T.Mesh(new T.PlaneGeometry(12, 1.9), new T.MeshStandardMaterial({ map: binaYaziD, roughness: 0.6 }));
    binaYazi.position.set(0, 7.2, binaOn + 0.02); bina.add(binaYazi);
    for (const s of [-1, 1]) { const bay = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 6, 8), direkM); bay.position.set(s * 4.6, 3, binaOn + 3); bina.add(bay);
      const bez = new T.Mesh(new T.PlaneGeometry(1.4, 0.9), new T.MeshStandardMaterial({ color: 0xE30A17, side: T.DoubleSide, roughness: 0.8 })); bez.position.set(s * 4.6 + 0.72, 5.5, binaOn + 3); bina.add(bez); }
    golgeAc(bina); S.add(bina);

    /* --- Ağaçlar, direkler, dubalar (instanced) --- */
    let tohum = 7; const rnd = () => (tohum = (tohum * 16807) % 2147483647) / 2147483647;
    const agacSay = zayif ? 40 : 90;
    const govdeI = new T.InstancedMesh(new T.CylinderGeometry(0.14, 0.2, 1.8, 7), mat(0x6B4B33), agacSay);
    const tacI = new T.InstancedMesh(new T.IcosahedronGeometry(1.4, 1), mat(0x4E7F3E, 0.9), agacSay);
    for (let i = 0; i < agacSay; i++) {
      const s = rnd() < .5 ? -1 : 1, x = s * (YOL + 3 + rnd() * 26), z = 30 - rnd() * (30 - sonZ), k = 0.8 + rnd() * 0.9;
      o3.position.set(x, 0.9 * k, z); o3.scale.set(k, k, k); o3.rotation.set(0, rnd() * 6, 0); o3.updateMatrix(); govdeI.setMatrixAt(i, o3.matrix);
      o3.position.set(x, (1.8 + 1.1) * k, z); o3.scale.set(k, k * (1.1 + rnd() * 0.5), k); o3.updateMatrix(); tacI.setMatrixAt(i, o3.matrix);
    }
    govdeI.castShadow = tacI.castShadow = true; S.add(govdeI, tacI);
    const lambaSay = Math.ceil((30 - binaOn) / 14) * 2;
    const direkI = new T.InstancedMesh(new T.CylinderGeometry(0.07, 0.09, 6, 8), direkM, lambaSay);
    const basI = new T.InstancedMesh(new T.BoxGeometry(0.9, 0.16, 0.34), mat(0x2B2F35, 0.5, 0.5), lambaSay);
    ki = 0;
    for (let z = 26; z > binaOn + 4; z -= 14) for (const s of [-1, 1]) {
      o3.scale.set(1, 1, 1); o3.rotation.set(0, 0, 0); o3.position.set(s * (YOL + 0.8), 3, z); o3.updateMatrix(); direkI.setMatrixAt(ki, o3.matrix);
      o3.position.set(s * (YOL + 0.45), 6.0, z); o3.updateMatrix(); basI.setMatrixAt(ki, o3.matrix); ki++;
    }
    direkI.count = basI.count = ki; direkI.castShadow = true; S.add(direkI, basI);
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
    const egitmenler = [];
    const egitmenEkle = (x, z, ryon, metin) => {
      const e = MODEL.egitmen({ boy: 1.0 }); e.position.set(x, 0, z); e.rotation.y = ryon; golgeAc(e); S.add(e);
      const b = document.createElement('div'); b.className = 'tur-balon';
      b.innerHTML = `<span>${metin}</span><button type="button" aria-label="Eğitmeni dinle">🔊</button>`;
      b.querySelector('button').onclick = () => konus(metin);
      sahneEl.appendChild(b);
      egitmenler.push({ e, b, bas: e.userData.bas, metin });
    };
    egitmenEkle(2.6, -2.2, -Math.PI / 2 - 0.25, 'Hoş geldin! Ben eğitmenin. Aşağı kaydır, kampüsü birlikte gezelim.');
    DUR.forEach((d, i) => { const s = istasyon[i]; if (s && d.egitmen) egitmenEkle(d.yan * 1.55, s.onZ + 1.4, -Math.PI / 2 - d.yan * 0.35, d.egitmen); });
    egitmenEkle(-2.2, binaOn + 2.4, -Math.PI / 2 + 0.3, 'E-Sınava burada, uygulamada hazırlan. Başarılar!');

    function konus(m) {
      if (!('speechSynthesis' in window)) return;
      try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(m); u.lang = 'tr-TR'; const v = speechSynthesis.getVoices().find(v => /^tr/i.test(v.lang)); if (v) u.voice = v; speechSynthesis.speak(u); } catch (e) {}
    }

    /* --- Kamera yolu: her durakta hafifçe yavaşlar --- */
    const K = DUR.map((d, i) => i === 0 ? 14 : (i === N - 1 ? binaOn + 13 : istasyon[i].onZ + 6.5));
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
