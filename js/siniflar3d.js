/* Ehliyet sınıfları: kartlarda kaydırdıkça 360° dönen 3D araçlar + kollarını bağlamış eğitmen.
   Tek WebGL bağlamı: her kart kendi 2D tuvaline çizilir. WebGL yoksa kartlardaki SVG çizimler kalır. */
(() => {
  const kartlar = [...document.querySelectorAll('.sinif[data-arac]')];
  if (!kartlar.length || !window.THREE || typeof MODEL === 'undefined') return;
  let R;
  try {
    R = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch (e) { return; }
  R.outputEncoding = THREE.sRGBEncoding; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.08;
  R.setClearColor(0x000000, 0); R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
  const az = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const zayif = /Android|iPhone|iPad/i.test(navigator.userAgent) && ((navigator.deviceMemory || 4) < 4);
  const sahne = new THREE.Scene(); sahne.environment = MODEL.ortam(R);
  sahne.add(new THREE.HemisphereLight(0xffffff, 0x3a3f46, 0.45));
  const gun = new THREE.DirectionalLight(0xffffff, 1.25); gun.position.set(5, 11, 7); gun.castShadow = !zayif;
  gun.shadow.mapSize.set(1024, 1024); gun.shadow.radius = 5; sahne.add(gun); sahne.add(gun.target);
  const zemin = new THREE.Mesh(new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.28 }));
  zemin.receiveShadow = true; sahne.add(zemin);
  const kam = new THREE.PerspectiveCamera(26, 2, 0.1, 200);

  const URET = {
    'B': () => MODEL.kupe({ renk: 0xC8203A }),
    'B-oto': () => MODEL.kupe({ renk: 0x1F4FA8, otomatik: true }),
    'BE': () => MODEL.kupeRomork({ renk: 0x7C8791 }),
    'A1': () => MODEL.motosiklet('a1'), 'A2': () => MODEL.motosiklet('a2'), 'A': () => MODEL.motosiklet('a'),
    'C': () => MODEL.kamyon(), 'CE': () => MODEL.cekici(), 'D': () => MODEL.midibus(),
  };
  const durum = new Map();   // kart → {tuval, ctx, arac, pivot, egitmen, boy, merkez}
  function hazirla(kart) {
    if (durum.has(kart)) return durum.get(kart);
    const k = kart.dataset.arac, kutu = kart.querySelector('.arac-k');
    const A = URET[k]();
    const pivot = new THREE.Group(); pivot.add(A.grup);
    const kutuB = new THREE.Box3().setFromObject(A.grup), m = kutuB.getCenter(new THREE.Vector3()), b = kutuB.getSize(new THREE.Vector3());
    A.grup.position.x -= m.x; A.grup.position.z -= m.z;
    const boy = Math.max(b.x, b.z);
    const eg = MODEL.egitmen({ boy: 1.0 });
    eg.rotation.y = -Math.PI / 2 - 0.3;
    eg.position.set(boy / 2 + 0.55, 0, 0.55);
    const tuval = document.createElement('canvas'); tuval.className = 'arac3d'; tuval.setAttribute('aria-hidden', 'true');
    kutu.appendChild(tuval);
    const d = { tuval, ctx: tuval.getContext('2d'), A, pivot, eg, boy, yuk: b.y, aci: null };
    durum.set(kart, d); kart.classList.add('uc-boyut');
    return d;
  }
  let W = 0, H = 0, DPR = Math.min(devicePixelRatio || 1, zayif ? 1.25 : 2);
  function boyutla() {
    const k = kartlar[0].querySelector('.arac-k'); const w = k.clientWidth, h = k.clientHeight;
    if (w === W && h === H) return; W = w; H = h;
    R.setPixelRatio(DPR); R.setSize(W, H, false); kam.aspect = W / H; kam.updateProjectionMatrix();
    durum.forEach(d => { d.tuval.width = Math.round(W * DPR); d.tuval.height = Math.round(H * DPR); d.aci = null; });
  }
  function ciz(kart, aci) {
    const d = hazirla(kart);
    if (d.tuval.width !== Math.round(W * DPR)) { d.tuval.width = Math.round(W * DPR); d.tuval.height = Math.round(H * DPR); }
    sahne.add(d.pivot, d.eg);
    d.pivot.rotation.y = aci;
    const u = d.boy, yk = Math.max(d.yuk, 1.85);
    const yarim = u / 2 + 1.05, mx = 0.5;                                   // dönen aracın süpürdüğü daire + eğitmen
    const tan = Math.tan(THREE.MathUtils.degToRad(kam.fov / 2));
    const uz = Math.max(yarim / (tan * kam.aspect), (yk * 0.62) / tan) * 0.98 + u * 0.18;
    kam.position.set(mx, yk * 0.45 + uz * 0.17, uz);
    kam.lookAt(mx, yk * 0.40, 0);
    gun.position.set(u * 0.6, 10 + u, u * 0.7); gun.target.position.set(0, 0, 0);
    const c = gun.shadow.camera; c.left = -u; c.right = u; c.top = u; c.bottom = -u; c.far = 60 + u * 2; c.updateProjectionMatrix();
    R.render(sahne, kam);
    sahne.remove(d.pivot, d.eg);
    d.ctx.clearRect(0, 0, d.tuval.width, d.tuval.height);
    d.ctx.drawImage(R.domElement, 0, 0, d.tuval.width, d.tuval.height);
    d.aci = aci;
  }
  // Görünürlük: yalnızca ekrandaki kartlar çizilir
  const gorunen = new Set();
  const io = new IntersectionObserver(es => es.forEach(e => { e.isIntersecting ? gorunen.add(e.target) : gorunen.delete(e.target); if (e.isIntersecting) planla(); }), { rootMargin: '200px 0px' });
  kartlar.forEach(k => io.observe(k));
  let bekliyor = false;
  function planla() { if (!bekliyor) { bekliyor = true; requestAnimationFrame(kare); } }
  function kare() {
    bekliyor = false; boyutla();
    const vh = innerHeight;
    gorunen.forEach(kart => {
      const r = kart.getBoundingClientRect();
      const t = ((r.top + r.height / 2) - vh / 2) / vh;           // -0.5..0.5 ekran boyunca
      const aci = az ? -0.55 : -0.55 + t * Math.PI * 2;           // ekrandan geçerken tam tur
      const d = durum.get(kart);
      if (!d || d.aci === null || Math.abs(d.aci - aci) > 0.004) ciz(kart, aci);
    });
  }
  addEventListener('scroll', planla, { passive: true });
  addEventListener('resize', () => { W = 0; planla(); });

  // Eğitmen balonu: yazılı + sesli "Merhaba, size nasıl yardımcı olabilirim?"
  const METIN = 'Merhaba, size nasıl yardımcı olabilirim?';
  let konustu = false;
  function konus() {
    if (!('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(METIN); u.lang = 'tr-TR'; u.rate = 1; u.pitch = 1;
      const ses = speechSynthesis.getVoices().find(v => /^tr/i.test(v.lang)); if (ses) u.voice = ses;
      speechSynthesis.speak(u);
    } catch (e) {}
  }
  kartlar.forEach(kart => {
    const kutu = kart.querySelector('.arac-k');
    const b = document.createElement('button'); b.type = 'button'; b.className = 'egitmen-balon';
    b.innerHTML = `<span>${METIN}</span><i aria-hidden="true">🔊</i>`; b.setAttribute('aria-label', 'Eğitmeni dinle: ' + METIN);
    b.onclick = e => { e.stopPropagation(); konus(); };
    kutu.appendChild(b);
  });
  const balonIo = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; e.target.classList.add('balon-acik');
    // Tarayıcılar sesi kullanıcı etkileşiminden sonra çalar: sayfada bir kez, ilk görünen kartta
    if (!konustu && navigator.userActivation?.hasBeenActive) { konustu = true; setTimeout(konus, 500); }
  }), { threshold: 0.6 });
  kartlar.forEach(k => balonIo.observe(k));
  planla();
})();
