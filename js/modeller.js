/* ================== Gerçekçi araç modelleri (site + simülasyon ortak) ==================
   Eksenler: +X ileri, +Y yukarı, +Z sağ. Ölçüler metre; orijin aracın ortası, zemin seviyesi.
   Markasız, Ehliyet Bende'ye özel tasarımlar. Lambalar (far, sinyal, fren, geri) ayrı mesh'tir; açıp kapatılabilir. */
const MODEL = (() => {
  const T = THREE;
  const malzemeOnbellek = new Map();
  const M_ = (anahtar, yap) => { if(!malzemeOnbellek.has(anahtar)) malzemeOnbellek.set(anahtar, yap()); return malzemeOnbellek.get(anahtar); };
  const boyaMat = renk => new T.MeshPhysicalMaterial({ color:renk, metalness:0.4, roughness:0.32, clearcoat:1, clearcoatRoughness:0.05, envMapIntensity:0.9 });
  const siyahParlak = () => M_('siyahParlak', ()=>new T.MeshPhysicalMaterial({ color:0x0B0D10, metalness:0.2, roughness:0.18, clearcoat:1, clearcoatRoughness:0.05 }));
  const siyahMat = () => M_('siyahMat', ()=>new T.MeshStandardMaterial({ color:0x15181B, metalness:0.1, roughness:0.75 }));
  const plastik = () => M_('plastik', ()=>new T.MeshStandardMaterial({ color:0x1E2226, metalness:0.05, roughness:0.6 }));
  const krom = () => M_('krom', ()=>new T.MeshStandardMaterial({ color:0xE8ECEF, metalness:1, roughness:0.12 }));
  const camMat = () => M_('cam', ()=>new T.MeshPhysicalMaterial({ color:0x05080C, metalness:0.2, roughness:0.03, transmission:0, transparent:true, opacity:0.94, clearcoat:1, clearcoatRoughness:0.02 }));
  const lastikMat = () => M_('lastik', ()=>new T.MeshStandardMaterial({ color:0x121416, metalness:0, roughness:0.88 }));
  const jantMat = () => M_('jant', ()=>new T.MeshStandardMaterial({ color:0x9AA3AB, metalness:0.95, roughness:0.22 }));
  const jantKoyu = () => M_('jantKoyu', ()=>new T.MeshStandardMaterial({ color:0x2B3036, metalness:0.9, roughness:0.3 }));
  const aynaCam = () => M_('aynaCam', ()=>new T.MeshStandardMaterial({color:0x9DB4C8, metalness:1, roughness:0.05}));
  const lambaMat = (renk, guc=0) => new T.MeshStandardMaterial({ color:renk, emissive:renk, emissiveIntensity:guc, metalness:0.1, roughness:0.2, transparent:true, opacity:0.95 });

  // İndekssiz geometride konuma göre yumuşak normaller (açı eşiğiyle: keskin kenarlar korunur)
  function yumusat(g, esik=0.8){
    g.computeVertexNormals(); const p=g.attributes.position, n=g.attributes.normal, harita=new Map();
    const key=i=>Math.round(p.getX(i)*1e4)+'_'+Math.round(p.getY(i)*1e4)+'_'+Math.round(p.getZ(i)*1e4);
    for(let i=0;i<p.count;i++){ const k=key(i); (harita.get(k)||harita.set(k,[]).get(k)).push(i); }
    const yeni=new Float32Array(n.count*3);
    for(const liste of harita.values()) for(const i of liste){ let x=0,y=0,z=0; const ax=n.getX(i), ay=n.getY(i), az=n.getZ(i);
      for(const j of liste){ const bx=n.getX(j), by=n.getY(j), bz=n.getZ(j); if(ax*bx+ay*by+az*bz>=esik-1e-6 || true && (ax*bx+ay*by+az*bz)>Math.cos(1.0)){ x+=bx; y+=by; z+=bz; } }
      const L=Math.hypot(x,y,z)||1; yeni[i*3]=x/L; yeni[i*3+1]=y/L; yeni[i*3+2]=z/L; }
    g.setAttribute('normal', new T.BufferAttribute(yeni,3));
  }
  // Renkleri sRGB'den doğrusala çevir (sRGB çıkışlı sahnelerde doğru ton)
  function dogrusal(kok){ kok.traverse(o=>{ if(!o.material) return; (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{ if(m.userData.lin) return; m.userData.lin=true; m.color && m.color.convertSRGBToLinear(); m.emissive && m.emissive.convertSRGBToLinear(); }); }); }
  const kutu = (g, w, h, d, mat, x, y, z) => { const m = new T.Mesh(new T.BoxGeometry(w,h,d), mat); m.position.set(x,y,z); g.add(m); return m; };
  const yaziDoku = (metin, w, h, arka='#F4F5F2', on='#14181B', yaz='700') => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    x.fillStyle = arka; x.fillRect(0,0,w,h); x.fillStyle = '#1D5BA8'; x.fillRect(0,0,h*0.42,h);
    x.fillStyle = '#fff'; x.font = `700 ${h*0.28}px Arial`; x.textAlign='center'; x.textBaseline='middle'; x.fillText('TR', h*0.21, h*0.72);
    x.fillStyle = on; x.font = `${yaz} ${h*0.58}px Arial`; x.textAlign='center'; x.fillText(metin, (w+h*0.42)/2, h*0.54);
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t; };
  const petekDoku = () => M_('petek', () => { const c=document.createElement('canvas'); c.width=c.height=128; const x=c.getContext('2d'); x.fillStyle='#07090B'; x.fillRect(0,0,128,128);
    x.strokeStyle='#2C3238'; x.lineWidth=3; const r=11;
    for(let yy=0; yy<8; yy++) for(let xx=0; xx<8; xx++){ const cx=xx*r*1.75+(yy%2?r*0.87:0), cy=yy*r*1.5; x.beginPath(); for(let k=0;k<6;k++){ const a=Math.PI/6+k*Math.PI/3; x.lineTo(cx+r*Math.cos(a), cy+r*Math.sin(a)); } x.closePath(); x.stroke(); }
    const t=new T.CanvasTexture(c); t.wrapS=t.wrapT=T.RepeatWrapping; t.repeat.set(5,1.4); return t; });
  const rozetDoku = () => M_('rozet', () => { const c=document.createElement('canvas'); c.width=c.height=128; const x=c.getContext('2d');
    const g=x.createRadialGradient(54,48,6,64,64,64); g.addColorStop(0,'#FFFFFF'); g.addColorStop(0.7,'#B9C0C7'); g.addColorStop(1,'#6E767E'); x.fillStyle=g; x.beginPath(); x.arc(64,64,62,0,7); x.fill();
    x.fillStyle='#14181B'; x.beginPath(); x.arc(64,64,50,0,7); x.fill(); x.fillStyle='#F2C21B'; x.font='800 46px Arial'; x.textAlign='center'; x.textBaseline='middle'; x.fillText('EB',64,67);
    const t=new T.CanvasTexture(c); t.encoding=T.sRGBEncoding; return t; });

  /* ---------- Tekerlek: lastik (lathe), çok kollu jant, fren diski ve kaliper ---------- */
  function teker(r=0.36, gen=0.245, jantR=0.245, kaliperRenk=0xC41E3A, kol=10){
    const g = new T.Group();
    // lastik profili (yarıçap, eksen) → Y ekseni etrafında döndür, sonra Z eksenine çevir
    const p=[]; const ic=jantR+0.005, w=gen/2, k=0.05;
    p.push(new T.Vector2(ic, -w*0.92)); p.push(new T.Vector2(r-k, -w));
    for(let i=0;i<=6;i++){ const a=-Math.PI/2+i*Math.PI/12; p.push(new T.Vector2(r-k+Math.cos(a)*k, -w+k+Math.sin(a)*k)); }
    for(let i=0;i<=6;i++){ const a=i*Math.PI/12; p.push(new T.Vector2(r-k+Math.cos(a)*k, w-k+Math.sin(a)*k)); }
    p.push(new T.Vector2(ic, w*0.92));
    const las = new T.Mesh(new T.LatheGeometry(p, 40).rotateX(Math.PI/2), lastikMat()); g.add(las);
    // jant namlusu + dudak
    const namlu = new T.Mesh(new T.CylinderGeometry(jantR, jantR, gen*0.86, 36, 1, true).rotateX(Math.PI/2), jantKoyu()); g.add(namlu);
    const dudak = new T.Mesh(new T.TorusGeometry(jantR-0.008, 0.012, 8, 48), krom()); dudak.position.z = gen*0.43; g.add(dudak);
    // fren diski ve kaliper (jantın arkasında)
    const disk = new T.Mesh(new T.CylinderGeometry(jantR*0.78, jantR*0.78, 0.025, 32).rotateX(Math.PI/2), M_('disk',()=>new T.MeshStandardMaterial({color:0x7B8188, metalness:0.9, roughness:0.45}))); disk.position.z = 0.02; g.add(disk);
    const kal = new T.Mesh(new T.BoxGeometry(0.11, 0.17, 0.07), M_('kal'+kaliperRenk, ()=>new T.MeshStandardMaterial({color:kaliperRenk, metalness:0.3, roughness:0.35}))); kal.position.set(-jantR*0.62, jantR*0.18, 0.05); kal.rotation.z = 0.35; g.add(kal);
    // kollar (çift kol, hafif içbükey)
    const kollar = new T.Group(); kollar.position.z = gen*0.40; g.add(kollar);
    for(let i=0;i<kol;i++){ const a = i*Math.PI*2/kol;
      for(const s of [-1,1]){ const kk = new T.Mesh(new T.BoxGeometry(jantR*0.78, 0.028, 0.03), jantMat());
        kk.position.set(Math.cos(a+s*0.07)*jantR*0.5, Math.sin(a+s*0.07)*jantR*0.5, -0.012); kk.rotation.z = a+s*0.07; kk.rotation.y = 0.12; kollar.add(kk); } }
    const gobek = new T.Mesh(new T.CylinderGeometry(jantR*0.26, jantR*0.3, 0.05, 24).rotateX(Math.PI/2), jantMat()); kollar.add(gobek);
    const kapak = new T.Mesh(new T.CircleGeometry(jantR*0.17, 24), new T.MeshStandardMaterial({map:rozetDoku(), metalness:0.6, roughness:0.3})); kapak.position.z = 0.027; kollar.add(kapak);
    for(let i=0;i<5;i++){ const a=i*Math.PI*2/5+0.3; const b=new T.Mesh(new T.CylinderGeometry(0.009,0.009,0.02,8).rotateX(Math.PI/2), krom()); b.position.set(Math.cos(a)*jantR*0.21, Math.sin(a)*jantR*0.21, 0.02); kollar.add(b); }
    g.userData.don = [las, kollar];   // dönen parçalar (disk ve kaliper sabit)
    return g;
  }

  /* ---------- İki kapılı kupe (B sınıfı) ---------- */
  function kupe(o={}){
    const renk = o.renk ?? 0xA80F1E, otomatik = !!o.otomatik;
    const grup = new T.Group(); grup.name = 'kupe';
    const govde = new T.Group(); grup.add(govde);
    const BOYA = boyaMat(renk);
    const L=4.15, GEN=1.80, onAks=1.30, arkaAks=-1.26, R=0.37, izYari=0.775;
    // Alt gövde yan profili (x, y) — çamurluk kemerleri dahil
    const s = new T.Shape();
    s.moveTo(-1.98, 0.28);
    s.quadraticCurveTo(-2.08, 0.30, -2.07, 0.44);
    s.lineTo(-2.06, 0.70); s.quadraticCurveTo(-2.06, 0.84, -1.96, 0.88);
    s.lineTo(-1.30, 0.92); s.lineTo(0.70, 0.94);
    s.quadraticCurveTo(1.30, 0.90, 1.78, 0.80);
    s.quadraticCurveTo(2.02, 0.74, 2.07, 0.62);
    s.quadraticCurveTo(2.12, 0.50, 2.09, 0.38);
    s.quadraticCurveTo(2.06, 0.28, 1.88, 0.27);
    s.lineTo(1.76, 0.27);
    s.absarc(onAks, R, 0.45, 0.02, Math.PI-0.02, false);
    s.lineTo(0.84, 0.24); s.lineTo(-0.80, 0.24); s.lineTo(-0.81, 0.27);
    s.absarc(arkaAks, R, 0.45, 0.02, Math.PI-0.02, false);
    s.lineTo(-1.72, 0.27); s.lineTo(-1.98, 0.28);
    const bev = 0.12, derin = GEN - 2*bev;
    const altG = new T.ExtrudeGeometry(s, { depth:derin, bevelEnabled:true, bevelThickness:bev, bevelSize:0.025, bevelSegments:8, curveSegments:32 });
    altG.translate(0, 0, -derin/2);
    // Plan görünüşünde burun/kuyruk daralması, omuz hattı ve alt kıvrım
    const sm = (a,b,v) => { const t=Math.max(0,Math.min(1,(v-a)/(b-a))); return t*t*(3-2*t); };
    const bicim = (g, ust) => { const p=g.attributes.position;
      for(let i=0;i<p.count;i++){ const x=p.getX(i), y=p.getY(i), z=p.getZ(i);
        let f = 1 - 0.13*Math.pow(sm(1.45,2.14,x),1.4) - 0.09*Math.pow(sm(-1.55,-2.10,x),1.4);
        if(ust) f *= 1 - 0.20*sm(0.95,1.40,y);
        else { f *= 1 - 0.045*sm(0.74,0.95,y); f *= 1 - 0.035*sm(0.42,0.24,y);
          f *= 1 + 0.025*Math.exp(-Math.pow((x-arkaAks)/0.55,2))*sm(0.45,0.8,y)*(1-sm(0.85,0.95,y)); }   // arka çamurluk omzu
        p.setZ(i, z*f); }
      p.needsUpdate=true; yumusat(g, 0.85); };
    bicim(altG, false);
    const alt = new T.Mesh(altG, BOYA); govde.add(alt);
    // Cam kabin: kısa, eğimli fastback tavan
    const k = new T.Shape();
    k.moveTo(-1.90, 0.89); k.quadraticCurveTo(-1.40, 1.15, -0.90, 1.31);
    k.quadraticCurveTo(-0.35, 1.39, 0.20, 1.35); k.quadraticCurveTo(0.50, 1.20, 0.86, 0.94);
    k.lineTo(-1.90, 0.89);
    const kbev = 0.10, kder = 1.62 - 2*kbev;
    const kabG = new T.ExtrudeGeometry(k, { depth:kder, bevelEnabled:true, bevelThickness:kbev, bevelSize:0.02, bevelSegments:6, curveSegments:28 });
    kabG.translate(0, 0, -kder/2); bicim(kabG, true);
    const kabin = new T.Mesh(kabG, camMat()); govde.add(kabin);
    // Tavan (gövde renginde kabuk) ve C direği: camın üzerine biraz büyütülmüş kopya, sadece tavan bölgesi
    const tvG = kabG.clone();
    const tavan = new T.Mesh(tvG, BOYA); tavan.scale.set(1.004, 1.006, 1.012); govde.add(tavan);
    { const p=tvG.attributes.position, n=tvG.attributes.normal, P=[], N=[];
      for(let i=0;i<p.count;i+=3){
        const ort=(p.getY(i)+p.getY(i+1)+p.getY(i+2))/3, ox=(p.getX(i)+p.getX(i+1)+p.getX(i+2))/3, oz=Math.abs((p.getZ(i)+p.getZ(i+1)+p.getZ(i+2))/3);
        const camUst = 1.20 + 0.10*sm(-0.9,0.1,ox) - 0.30*sm(-1.2,-1.9,ox);
        const onCam = ox>0.18, arkaCam = ox<-1.15 && oz<0.50;
        const al = (ort>camUst && !onCam && !arkaCam) || (ox<-1.15 && ox>-1.75 && ort>0.95 && !arkaCam);
        if(al) for(let j=0;j<3;j++){ P.push(p.getX(i+j),p.getY(i+j),p.getZ(i+j)); N.push(n.getX(i+j),n.getY(i+j),n.getZ(i+j)); } }
      tvG.setAttribute('position', new T.Float32BufferAttribute(P,3)); tvG.setAttribute('normal', new T.Float32BufferAttribute(N,3)); tvG.deleteAttribute('uv'); }
    for(const z of [-1,1]){
      const krm = new T.Mesh(new T.BoxGeometry(2.30, 0.016, 0.012), krom()); krm.position.set(-0.50, 0.945, z*0.775); govde.add(krm); // cam alt çıtası
    }
    // Ayrıntıları yüzeye yapıştırmak için ışın izleme
    const isin = new T.Raycaster();
    const yuzey = (x0, yon, y, z) => { isin.set(new T.Vector3(x0, y, z), new T.Vector3(yon,0,0)); const h = isin.intersectObject(alt, false)[0]; return h ? h.point.x : x0+yon*2; };
    // Kapı çizgileri ve kolları
    const cizgiMat = M_('cizgi', ()=>new T.MeshBasicMaterial({color:0x090A0C}));
    for(const z of [-1,1]){ const zz = z*(GEN/2+0.002);
      for(const [x1,x2] of [[0.86,0.86],[-0.62,-0.62]]){ const c=new T.Mesh(new T.BoxGeometry(0.008, 0.62, 0.004), cizgiMat); c.position.set(x1, 0.62, zz*0.985); c.rotation.z = x1>0?0.22:-0.05; govde.add(c); }
      const kol = new T.Mesh(new T.BoxGeometry(0.20, 0.035, 0.012), krom()); kol.position.set(-0.42, 0.82, z*(GEN/2*0.955+0.004)); govde.add(kol);
      // yan karakter çizgisi (ışık yakalayan ince kabartma)
      const kc = new T.Mesh(new T.BoxGeometry(3.2, 0.012, 0.01), BOYA); kc.position.set(0.05, 0.70, z*(GEN/2*0.975+0.002)); kc.rotation.z = -0.03; govde.add(kc);
      // marşpiyel
      kutu(govde, 1.62, 0.07, 0.04, plastik(), 0.02, 0.28, z*(GEN/2*0.965-0.01));
    }
    // Yan aynalar (gövde renginde kapak + siyah taban + ayna camı)
    const aynalar = [];
    for(const z of [-1,1]){
      const ay = new T.Group(); ay.position.set(0.70, 1.00, z*0.86); govde.add(ay);
      const kap = new T.Mesh(new T.SphereGeometry(0.10, 24, 16).scale(0.75, 0.55, 1.15), BOYA); kap.position.set(-0.01, 0.02, z*0.10); ay.add(kap);
      kutu(ay, 0.10, 0.04, 0.10, siyahMat(), 0.02, -0.05, z*0.03);
      const cam = new T.Mesh(new T.PlaneGeometry(0.18, 0.09), aynaCam());
      cam.position.set(-0.085, 0.02, z*0.10); cam.rotation.y = -Math.PI/2; ay.add(cam);
      const syn = new T.Mesh(new T.BoxGeometry(0.06, 0.012, 0.12), lambaMat(0xFFA21A)); syn.position.set(0.0, -0.025, z*0.12); ay.add(syn);
      aynalar.push({grup:ay, cam, z}); ay.userData.sinyal = syn;
    }
    // ---- Ön ----
    const on = new T.Group(); govde.add(on);
    // ızgara (petek dokulu, alt geniş) + üst ince yarık + krom çerçeve
    const xOn = yuzey(3, -1, 0.45, 0), xOnU = yuzey(3,-1,0.62,0);
    const izg = new T.Mesh(new T.BoxGeometry(0.06, 0.19, 1.02), new T.MeshStandardMaterial({ map:petekDoku(), metalness:0.3, roughness:0.5 })); izg.position.set(xOn-0.012, 0.45, 0); on.add(izg);
    const izgC = new T.Mesh(new T.BoxGeometry(0.03, 0.215, 1.15), krom()); izgC.position.set(xOn-0.025, 0.45, 0); izgC.scale.set(1,1,1); on.add(izgC);
    kutu(on, 0.05, 0.04, 0.86, siyahParlak(), xOnU-0.015, 0.62, 0);
    const roz = new T.Mesh(new T.CircleGeometry(0.065, 32), new T.MeshStandardMaterial({ map:rozetDoku(), metalness:0.7, roughness:0.25 })); roz.position.set(xOnU+0.012, 0.62, 0); roz.rotation.y = Math.PI/2; on.add(roz);
    // spoiler dudağı ve yan hava kanalları
    kutu(on, 0.18, 0.035, 1.45, siyahMat(), yuzey(3,-1,0.30,0)-0.06, 0.285, 0);
    for(const z of [-1,1]){ const hk = kutu(on, 0.05, 0.15, 0.09, siyahParlak(), yuzey(3,-1,0.42,z*0.64)-0.005, 0.42, z*0.64); hk.rotation.y = z*0.45; }
    // farlar: koyu muhafaza + projektör + ince LED kaş (gündüz farı) + sinyal şeridi
    const lambalar = { far:[], gunduz:[], sinyalSol:[], sinyalSag:[], fren:[], geri:[], arka:[] };
    for(const z of [-1,1]){
      const fg = new T.Group(); fg.position.set(yuzey(3,-1,0.70,z*0.58)-0.012, 0.70, z*0.58); fg.rotation.y = z*0.50; fg.rotation.z = -0.42; on.add(fg);
      kutu(fg, 0.07, 0.11, 0.46, siyahParlak(), 0, 0, 0);
      const pro = new T.Mesh(new T.CylinderGeometry(0.034, 0.034, 0.03, 24).rotateZ(Math.PI/2), lambaMat(0xFFFFFF, 0.15)); pro.position.set(0.03, -0.008, -z*0.07); fg.add(pro); lambalar.far.push(pro);
      const pro2 = pro.clone(); pro2.material = pro.material; pro2.position.z = -z*0.14; fg.add(pro2); lambalar.far.push(pro2);
      const kas = new T.Mesh(new T.BoxGeometry(0.02, 0.018, 0.44), lambaMat(0xEAF4FF, 1.4)); kas.position.set(0.037, 0.040, 0); fg.add(kas); lambalar.gunduz.push(kas);
      const kas2 = new T.Mesh(new T.BoxGeometry(0.02, 0.05, 0.014), lambaMat(0xEAF4FF, 1.4)); kas2.position.set(0.037, 0.012, z*0.22); fg.add(kas2); lambalar.gunduz.push(kas2);
      const syn = new T.Mesh(new T.BoxGeometry(0.02, 0.014, 0.34), lambaMat(0xFFA21A)); syn.position.set(0.037, -0.044, -z*0.03); fg.add(syn);
      (z<0?lambalar.sinyalSol:lambalar.sinyalSag).push(syn, aynalar.find(a=>a.z===z).grup.userData.sinyal);
    }
    // ---- Arka ----
    const ark = new T.Group(); govde.add(ark);
    const xAr = yuzey(-3, 1, 0.80, 0);
    const bar = new T.Mesh(new T.BoxGeometry(0.03, 0.03, 1.20), lambaMat(0xD0101E, 0.5)); bar.position.set(xAr-0.005, 0.80, 0); ark.add(bar); lambalar.arka.push(bar);
    for(const z of [-1,1]){
      const ag = new T.Group(); ag.position.set(yuzey(-3,1,0.76,z*0.64)+0.01, 0.76, z*0.64); ag.rotation.y = -z*0.45; ark.add(ag);
      kutu(ag, 0.05, 0.13, 0.34, siyahParlak(), 0, 0, 0);
      const st = new T.Mesh(new T.BoxGeometry(0.02, 0.06, 0.30), lambaMat(0xD0101E, 0.5)); st.position.set(-0.03, 0.02, 0); ag.add(st); lambalar.arka.push(st); lambalar.fren.push(st);
      const sg = new T.Mesh(new T.BoxGeometry(0.02, 0.02, 0.14), lambaMat(0xFFA21A)); sg.position.set(-0.03, -0.035, z*0.07); ag.add(sg); (z<0?lambalar.sinyalSol:lambalar.sinyalSag).push(sg);
      const gr = new T.Mesh(new T.BoxGeometry(0.02, 0.02, 0.10), lambaMat(0xFFFFFF)); gr.position.set(-0.03, -0.035, -z*0.09); ag.add(gr); lambalar.geri.push(gr);
    }
    const frenUst = new T.Mesh(new T.BoxGeometry(0.03, 0.02, 0.36), lambaMat(0xD0101E)); frenUst.position.set(-1.30, 1.27, 0); ark.add(frenUst); lambalar.fren.push(frenUst);
    { const rz = kutu(ark, 0.30, 0.025, 1.12, BOYA, -1.92, 0.905, 0); rz.rotation.z = 0.12; }                       // bagaj üstü rüzgarlık
    const plk = new T.Mesh(new T.PlaneGeometry(0.52, 0.11), new T.MeshStandardMaterial({ map:yaziDoku('EHLİYET BENDE', 512, 108), roughness:0.6 })); plk.position.set(yuzey(-3,1,0.58,0)-0.004, 0.58, 0); plk.rotation.y = -Math.PI/2; ark.add(plk);
    kutu(ark, 0.22, 0.10, 1.40, siyahMat(), yuzey(-3,1,0.33,0)+0.08, 0.33, 0);                                                  // difüzör
    for(const z of [-0.42, 0.42]){ const eg = new T.Mesh(new T.CylinderGeometry(0.045, 0.045, 0.14, 20).rotateZ(Math.PI/2), krom()); const ex=yuzey(-3,1,0.32,z); eg.position.set(ex+0.02, 0.30, z); ark.add(eg);
      const ic = new T.Mesh(new T.CircleGeometry(0.036, 20), siyahMat()); ic.position.set(ex-0.051, 0.30, z); ic.rotation.y = -Math.PI/2; ark.add(ic); }
    // ---- İç mekân (sürücü görünümü için temel; ayrıntılı gösterge ayrı eklenecek) ----
    const ic = new T.Group(); govde.add(ic);
    kutu(ic, 0.55, 0.20, 1.50, M_('pano', ()=>new T.MeshStandardMaterial({color:0x1A1D21, roughness:0.8})), 0.62, 0.92, 0);
    for(const z of [-0.38, 0.38]){ kutu(ic, 0.55, 0.12, 0.52, M_('koltuk', ()=>new T.MeshStandardMaterial({color:0x2A2E33, roughness:0.9})), -0.20, 0.52, z); const sr=kutu(ic, 0.12, 0.62, 0.50, M_('koltuk'), -0.50, 0.84, z); sr.rotation.z = 0.18; }
    const dikiz = new T.Group(); dikiz.position.set(0.55, 1.30, 0); ic.add(dikiz);
    kutu(dikiz, 0.04, 0.07, 0.24, siyahMat(), 0, 0, 0);
    const dCam = new T.Mesh(new T.PlaneGeometry(0.22, 0.055), aynaCam()); dCam.position.set(-0.021, 0, 0); dCam.rotation.y = -Math.PI/2; dikiz.add(dCam);
    aynalar.push({grup:dikiz, cam:dCam, z:0, dikiz:true});
    // ---- Tekerlekler ----
    const tekerler = [], onTeker = [];
    for(const [x, onMu] of [[onAks,true],[arkaAks,false]]) for(const z of [-1,1]){
      const tutucu = new T.Group(); tutucu.position.set(x, R, z*izYari); grup.add(tutucu);
      const t = teker(R, 0.255, 0.275, otomatik?0xF2C21B:0xC41E3A, 10); if(z<0) t.rotation.y = Math.PI; tutucu.add(t);
      tekerler.push(t); if(onMu) onTeker.push(tutucu);
    }
    // iç çamurluk karanlığı (tekerlek arkası boş görünmesin)
    for(const x of [onAks, arkaAks]){ const c = new T.Mesh(new T.CylinderGeometry(0.44, 0.44, GEN-0.30, 24, 1, false, -Math.PI*0.03, Math.PI*1.06).rotateX(Math.PI/2), M_('icCamurluk', ()=>new T.MeshBasicMaterial({color:0x050607, side:T.BackSide}))); c.rotation.z = Math.PI/2+Math.PI*0.03; c.position.set(x, R, 0); govde.add(c); }
    grup.traverse(m=>{ if(m.isMesh){ m.castShadow = true; m.receiveShadow = false; } });
    const M = { grup, govde, tekerler, onTeker, lambalar, aynalar, boya:BOYA, uzunluk:L, genislik:GEN, dingil:onAks-arkaAks, arkaAks, tekerR:R, goz:new T.Vector3(-0.30, 1.16, -0.38) };
    M.lamba = (ad, acik, guc=3) => (lambalar[ad]||[]).forEach(m => { m.material.emissiveIntensity = acik ? guc : (ad==='arka'?0.8: ad==='gunduz'?2.2 : 0.02); });
    M.isikSifirla = () => { ['far','sinyalSol','sinyalSag','fren','geri'].forEach(a=>M.lamba(a,false)); M.lamba('gunduz',true,2.2); M.lamba('arka',true,0.8); };
    M.tekerDon = aci => tekerler.forEach(t=>{ const y = Math.abs(t.rotation.y)>1 ? 1 : -1; t.userData.don.forEach(p=>p.rotation.z = y*aci); });
    M.direksiyon = a => onTeker.forEach(t=>t.rotation.y = a);
    M.isikSifirla();
    dogrusal(grup);
    return M;
  }


  /* ================== Ortak yardımcılar (ağır vasıtalar, motosiklet, insan) ================== */
  const V = (x,y,z) => new T.Vector3(x,y,z);
  const mat = (anahtar, renk, ro=0.6, me=0.1) => M_(anahtar, ()=>new T.MeshStandardMaterial({ color:renk, roughness:ro, metalness:me }));
  // Köşeleri yuvarlatılmış kutu: XY düzleminde yuvarlak dikdörtgen, Z'de pahlı. Ortalanmış.
  function yKutu(w, h, d, r, b=0.03){
    const bs=b*0.9; w-=2*bs; h-=2*bs; const s = new T.Shape(), x0=-w/2, y0=-h/2; r=Math.max(0.002, Math.min(r-bs, w/2-0.001, h/2-0.001));
    s.moveTo(x0+r, y0); s.lineTo(x0+w-r, y0); s.quadraticCurveTo(x0+w, y0, x0+w, y0+r); s.lineTo(x0+w, y0+h-r); s.quadraticCurveTo(x0+w, y0+h, x0+w-r, y0+h);
    s.lineTo(x0+r, y0+h); s.quadraticCurveTo(x0, y0+h, x0, y0+h-r); s.lineTo(x0, y0+r); s.quadraticCurveTo(x0, y0, x0+r, y0);
    const g = new T.ExtrudeGeometry(s, { depth:d-2*b, bevelEnabled:true, bevelThickness:b, bevelSize:b*0.9, bevelSegments:4, curveSegments:10 });
    g.translate(0,0,-(d-2*b)/2); yumusat(g); return g;
  }
  const yk = (g, w,h,d,r,m, x,y,z, b) => { const o=new T.Mesh(yKutu(w,h,d,r,b), m); o.position.set(x,y,z); g.add(o); return o; };
  // İki nokta arasında kapsül/tüp (uzuv, boru, çatal)
  function uzuv(g, a, b, r, m, kapsul=true){
    const d = b.clone().sub(a), L = d.length();
    const geo = kapsul ? new T.CapsuleGeometry(r, Math.max(0.001, L), 6, 14) : new T.CylinderGeometry(r, r, L, 14);
    const o = new T.Mesh(geo, m); o.position.copy(a).add(b).multiplyScalar(0.5);
    o.quaternion.setFromUnitVectors(V(0,1,0), d.normalize()); g.add(o); return o;
  }
  function boru(g, noktalar, r, m, seg=24){ const e = new T.CatmullRomCurve3(noktalar); const o=new T.Mesh(new T.TubeGeometry(e, seg, r, 10, false), m); g.add(o); return o; }
  // İki kemikli ters kinematik: a→c arası, b dirseği 'kutup' yönüne bükülür
  function ik(a, c, l1, l2, kutup){
    const d = c.clone().sub(a); let L = Math.min(d.length(), l1+l2-1e-3); const dir = d.normalize();
    const x = (l1*l1 - l2*l2 + L*L)/(2*L), h = Math.sqrt(Math.max(0, l1*l1 - x*x));
    const p = kutup.clone().sub(dir.clone().multiplyScalar(kutup.dot(dir))).normalize();
    return a.clone().add(dir.clone().multiplyScalar(x)).add(p.multiplyScalar(h));
  }
  const ledDoku = (metin, w=512, h=64) => { const c=document.createElement('canvas'); c.width=w; c.height=h; const x=c.getContext('2d');
    x.fillStyle='#0A0B0C'; x.fillRect(0,0,w,h); x.fillStyle='#FFB21E'; x.font=`700 ${h*0.62}px Arial`; x.textAlign='center'; x.textBaseline='middle'; x.fillText(metin, w/2, h*0.54);
    x.fillStyle='rgba(0,0,0,.45)'; for(let i=0;i<w;i+=4) x.fillRect(i,0,1,h); for(let j=0;j<h;j+=4) x.fillRect(0,j,w,1);
    const t=new T.CanvasTexture(c); t.encoding=T.sRGBEncoding; return t; };
  const perdeDoku = (renk, yazi) => { const c=document.createElement('canvas'); c.width=1024; c.height=256; const x=c.getContext('2d');
    x.fillStyle=renk; x.fillRect(0,0,1024,256); x.fillStyle='rgba(0,0,0,.10)'; for(let i=0;i<1024;i+=46) x.fillRect(i,0,5,256);
    x.fillStyle='rgba(255,255,255,.06)'; for(let i=0;i<1024;i+=46) x.fillRect(i+6,0,3,256);
    if(yazi){ x.fillStyle='#14181B'; x.font='900 64px Arial'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(yazi, 512, 118);
      x.fillStyle='#F2C21B'; x.fillRect(312, 162, 400, 10); }
    const t=new T.CanvasTexture(c); t.encoding=T.sRGBEncoding; t.anisotropy=4; return t; };
  function lastik(r, gen, jantR, seg=40){
    const p=[]; const ic=jantR+0.005, w=gen/2, k=Math.min(0.06, gen*0.3);
    p.push(new T.Vector2(ic, -w*0.92)); p.push(new T.Vector2(r-k, -w));
    for(let i=0;i<=6;i++){ const a=-Math.PI/2+i*Math.PI/12; p.push(new T.Vector2(r-k+Math.cos(a)*k, -w+k+Math.sin(a)*k)); }
    for(let i=0;i<=6;i++){ const a=i*Math.PI/12; p.push(new T.Vector2(r-k+Math.cos(a)*k, w-k+Math.sin(a)*k)); }
    p.push(new T.Vector2(ic, w*0.92));
    return new T.Mesh(new T.LatheGeometry(p, seg).rotateX(Math.PI/2), lastikMat());
  }
  // Kamyon/otobüs tekerleği: çelik disk jant, havalandırma delikleri, bijon somunları. ciftli=true → arka ikiz teker
  function agirTeker(r=0.52, gen=0.30, ciftli=false, jantRenk=0xC9CED3){
    const g = new T.Group(), don = new T.Group(); g.add(don);
    const jantR = r*0.56, jm = mat('agirJant'+jantRenk, jantRenk, 0.35, 0.75);
    const tek = (z, dis) => { const t = new T.Group(); t.position.z = z; don.add(t);
      t.add(lastik(r, gen, jantR, 36));
      const namlu = new T.Mesh(new T.CylinderGeometry(jantR, jantR, gen*0.86, 32, 1, true).rotateX(Math.PI/2), jm); t.add(namlu);
      if(dis){ const disk = new T.Mesh(new T.CylinderGeometry(jantR*0.97, jantR*0.97, 0.02, 32).rotateX(Math.PI/2), jm); disk.position.z = gen*0.30; t.add(disk);
        for(let i=0;i<8;i++){ const a=i*Math.PI/4+0.39; const d = new T.Mesh(new T.CircleGeometry(jantR*0.13, 14), siyahMat()); d.position.set(Math.cos(a)*jantR*0.68, Math.sin(a)*jantR*0.68, gen*0.30+0.011); t.add(d); }
        const gb = new T.Mesh(new T.CylinderGeometry(jantR*0.36, jantR*0.42, 0.10, 24).rotateX(Math.PI/2), krom()); gb.position.z = gen*0.32; t.add(gb);
        for(let i=0;i<10;i++){ const a=i*Math.PI/5; const s = new T.Mesh(new T.CylinderGeometry(0.022, 0.022, 0.05, 6).rotateX(Math.PI/2), krom()); s.position.set(Math.cos(a)*jantR*0.48, Math.sin(a)*jantR*0.48, gen*0.33); t.add(s); }
        const ca = new T.Mesh(new T.CircleGeometry(jantR*0.2, 20), new T.MeshStandardMaterial({map:rozetDoku(), metalness:0.6, roughness:0.3})); ca.position.z = gen*0.32+0.052; t.add(ca);
      } };
    if(ciftli){ tek(gen*0.52, true); tek(-gen*0.52, false); } else tek(0, true);
    g.userData.don = [don]; return g;
  }
  // Ortak araç nesnesi: lamba / teker / direksiyon denetimi
  function aracBitir(grup, o){
    grup.traverse(m=>{ if(m.isMesh){ m.castShadow = true; m.receiveShadow = false; } });
    const lambalar = o.lambalar, tekerler = o.tekerler;
    const M = Object.assign({ grup, aynalar:[], boya:null }, o);
    const sabit = o.sabit || { arka:0.8, gunduz:2.2 };
    M.lamba = (ad, acik, guc=3) => (lambalar[ad]||[]).forEach(m => { if(m && m.material) m.material.emissiveIntensity = acik ? guc : (sabit[ad] ?? 0.02); });
    M.isikSifirla = () => { ['far','sinyalSol','sinyalSag','fren','geri'].forEach(a=>M.lamba(a,false)); M.lamba('gunduz',true,sabit.gunduz); M.lamba('arka',true,sabit.arka); };
    M.tekerDon = aci => tekerler.forEach(t=>{ const y = Math.abs(t.rotation.y)>1 ? 1 : -1; (t.userData.don||[t]).forEach(p=>p.rotation.z = y*aci); });
    M.direksiyon = a => (o.onTeker||[]).forEach(t=>t.rotation.y = a);
    M.isikSifirla(); dogrusal(grup); return M;
  }
  const bosLamba = () => ({ far:[], gunduz:[], sinyalSol:[], sinyalSag:[], fren:[], geri:[], arka:[] });
  const sinyal = (lb, z, ...m) => (z<0?lb.sinyalSol:lb.sinyalSag).push(...m);
  // Ayna: kol + gövde + ayna camı (cam, sürücü görünümünde render hedefi olarak kullanılır)
  function yanAyna(ebeveyn, konum, z, w, h, govdeMat, kolBas){
    const ay = new T.Group(); ay.position.copy(konum); ebeveyn.add(ay);
    if(kolBas) uzuv(ebeveyn, kolBas, konum.clone().add(V(0, 0, -z*0.02)), 0.018, siyahMat(), false);
    yk(ay, 0.10, h, w, 0.03, govdeMat, -0.03, 0, 0, 0.015);
    const cam = new T.Mesh(new T.PlaneGeometry(w*0.88, h*0.86), aynaCam());
    cam.position.set(-0.081, 0, 0); cam.rotation.y = -Math.PI/2; ay.add(cam);
    return { grup:ay, cam, z };
  }

  /* ================== İnsan figürü (sürücü / komisyon üyesi için temel) ================== */
  // Eklem noktalarından figür üretir. renkler: {ceket, pantolon, ten, kask?, sac?}
  function insan(e, r={}){
    const g = new T.Group();
    const ceket = mat('ceket'+(r.ceket??0x1D2733), r.ceket ?? 0x1D2733, 0.7), pant = mat('pant'+(r.pantolon??0x2B3442), r.pantolon ?? 0x2B3442, 0.8);
    const ten = mat('ten'+(r.ten??0xC99272), r.ten ?? 0xC99272, 0.55), bot = mat('bot', 0x121314, 0.5), eldiven = mat('eldiven', 0x18191B, 0.6);
    // gövde: kalça → omuz
    const govM = uzuv(g, e.kalca, e.boyun.clone().add(V(0,-0.10,0)), 0.15, ceket); govM.scale.set(1.18, 1, 0.82);
    uzuv(g, e.omuzL, e.omuzR, 0.075, ceket);
    uzuv(g, e.kalcaL, e.kalcaR, 0.11, pant);
    // kollar
    for(const [o, d, el] of [[e.omuzL,e.dirsekL,e.elL],[e.omuzR,e.dirsekR,e.elR]]){ uzuv(g, o, d, 0.055, ceket); uzuv(g, d, el, 0.045, ceket);
      const eli = new T.Mesh(new T.SphereGeometry(0.048, 14, 10), r.kask ? eldiven : ten); eli.position.copy(el); eli.scale.set(1.2,0.9,1); g.add(eli); }
    // bacaklar
    for(const [k, d, a] of [[e.kalcaL,e.dizL,e.ayakL],[e.kalcaR,e.dizR,e.ayakR]]){ uzuv(g, k, d, 0.075, pant); uzuv(g, d, a, 0.058, r.kask ? bot : pant);
      const b = yk(g, 0.26, 0.10, 0.11, 0.04, bot, a.x+0.06, a.y-0.03, a.z, 0.02); }
    // baş
    const bas = new T.Group(); bas.position.copy(e.bas); g.add(bas);
    uzuv(g, e.boyun.clone().add(V(0,-0.06,0)), e.bas.clone().add(V(0,-0.08,0)), 0.055, ten);
    if(r.kask){
      const km = new T.MeshPhysicalMaterial({ color:r.kask, metalness:0.3, roughness:0.25, clearcoat:1 });
      const k = new T.Mesh(new T.SphereGeometry(0.155, 28, 20), km); k.scale.set(1.12, 1, 0.92); bas.add(k);
      const vz = new T.Mesh(new T.SphereGeometry(0.158, 28, 12, Math.PI-0.9, 1.8, 1.05, 0.62), siyahParlak()); vz.scale.set(1.13, 1, 0.93); bas.add(vz);
      const cene = new T.Mesh(new T.SphereGeometry(0.150, 20, 10, Math.PI-0.8, 1.6, 1.75, 0.65), km); cene.scale.set(1.15,1,0.95); bas.add(cene);
    } else {
      const kafa = new T.Mesh(new T.SphereGeometry(0.105, 24, 18), ten); kafa.scale.set(1.05, 1.18, 0.95); bas.add(kafa);
      const sac = new T.Mesh(new T.SphereGeometry(0.11, 24, 12, 0, Math.PI*2, 0, 1.25), mat('sac'+(r.sac??0x2A1E17), r.sac ?? 0x2A1E17, 0.9)); sac.scale.set(1.08,1.15,1); sac.position.set(-0.012,0.012,0); sac.rotation.z = 0.35; bas.add(sac);
      for(const z of [-1,1]){ const go = new T.Mesh(new T.SphereGeometry(0.013, 8, 6), siyahMat()); go.position.set(0.098, 0.02, z*0.035); bas.add(go);
        const ku = new T.Mesh(new T.SphereGeometry(0.025, 8, 6), ten); ku.scale.set(0.5,1,0.6); ku.position.set(0, 0, z*0.104); bas.add(ku); }
      const bu = new T.Mesh(new T.ConeGeometry(0.018, 0.04, 8).rotateZ(-Math.PI/2), ten); bu.position.set(0.112, -0.012, 0); bas.add(bu);
    }
    g.userData.bas = bas; return g;
  }

  /* ================== Motosiklet (A1 / A2 / A) + sürücü ================== */
  const MOTO = {
    a1: { WB:1.30, R:0.29, gOn:0.09, gArka:0.11, Lf:0.72, rake:0.45, sw:0.52, sele:0.80, tank:0.24, renk:0x2E6E5A, stil:'yuvarlak', motor:0.9 },
    a2: { WB:1.42, R:0.31, gOn:0.12, gArka:0.16, Lf:0.77, rake:0.43, sw:0.56, sele:0.82, tank:0.30, renk:0xE87A12, stil:'koseli', motor:1.1 },
    a:  { WB:1.53, R:0.32, gOn:0.12, gArka:0.19, Lf:0.80, rake:0.42, sw:0.58, sele:0.84, tank:0.34, renk:0x1F4FA8, stil:'kaplama', motor:1.3 },
  };
  function motoTeker(r, gen, kol, disk2){
    const g = new T.Group(), don = new T.Group(); g.add(don);
    const jantR = r - Math.max(0.055, gen*0.62);
    don.add(lastik(r, gen, jantR, 40));
    const jm = kol>5 ? mat('motoJantAcik', 0xB8BEC4, 0.25, 0.9) : mat('motoJant', 0x1A1C1F, 0.35, 0.8);
    const namlu = new T.Mesh(new T.TorusGeometry(jantR, 0.018, 8, 40), jm); don.add(namlu);
    const kenar = new T.Mesh(new T.TorusGeometry(jantR-0.012, 0.004, 6, 40), krom()); kenar.position.z = gen*0.18; don.add(kenar);
    for(let i=0;i<kol;i++){ const a=i*Math.PI*2/kol; for(const s of [-1,1]){ const k = new T.Mesh(new T.BoxGeometry(jantR*0.86, kol>5?0.008:0.026, kol>5?0.008:0.02), jm); k.position.set(Math.cos(a+s*0.10)*jantR*0.5, Math.sin(a+s*0.10)*jantR*0.5, s*0.012); k.rotation.z = a+s*0.10; don.add(k); } }
    const gb = new T.Mesh(new T.CylinderGeometry(0.045, 0.045, gen*0.9, 18).rotateX(Math.PI/2), mat('motoGobek', 0x6E747B, 0.3, 0.9)); don.add(gb);
    const dm = M_('disk',()=>new T.MeshStandardMaterial({color:0x7B8188, metalness:0.9, roughness:0.45}));
    const diskAt = z => { const d = new T.Mesh(new T.RingGeometry(jantR*0.42, jantR*0.84, 36), dm); d.position.z = z; don.add(d); const d2=d.clone(); d2.rotation.y=Math.PI; d2.position.z=z-0.002; don.add(d2); };
    diskAt(gen*0.36); if(disk2) diskAt(-gen*0.36);
    g.userData.don = [don]; return g;
  }
  function motosiklet(sinif='a1', o={}){
    const P = Object.assign({}, MOTO[sinif] || MOTO.a1, o);
    const grup = new T.Group(); grup.name = 'moto-'+sinif;
    const BOYA = boyaMat(P.renk); const lb = bosLamba(); const aynalar = [];
    const fx = P.WB/2, rx = -P.WB/2, R = P.R;
    const hx = fx - P.Lf*Math.sin(P.rake), hy = R + P.Lf*Math.cos(P.rake);
    const px = rx + P.sw, py = R + 0.13;
    const sase = mat('sase'+sinif, sinif==='a2'?0xC9302C:0x23262A, 0.4, 0.6);
    const metal = mat('motorMetal', 0x8D949B, 0.35, 0.85), koyu = mat('motorKoyu', 0x1E2024, 0.5, 0.5);
    // ---- Arka teker + salıncak + amortisör ----
    const arka = motoTeker(R, P.gArka, sinif==='a1'?16:5, false); arka.position.set(rx, R, 0); grup.add(arka);
    for(const z of [-1,1]) uzuv(grup, V(px, py, z*0.10), V(rx, R, z*(P.gArka/2+0.03)), 0.028, sase, false);
    uzuv(grup, V(px+0.05, py+0.42, 0), V(px-0.20, py+0.02, 0), 0.03, mat('amortisor', 0xD8A21A, 0.4, 0.6), false);
    // ---- Ön takım: kafa grubu (eğik direksiyon ekseni) ----
    const kafa = new T.Group(); kafa.position.set(hx, hy, 0); kafa.rotation.z = P.rake; grup.add(kafa);
    const donen = new T.Group(); kafa.add(donen);
    const ust = mat('catalUst', sinif==='a1'?0xC8CDD2:0xD4A017, 0.25, 0.9);
    for(const z of [-1,1]){ uzuv(donen, V(0, 0.04, z*0.10), V(0, -P.Lf*0.55, z*0.10), 0.030, ust, false);
      uzuv(donen, V(0, -P.Lf*0.50, z*0.10), V(0, -P.Lf, z*0.10), 0.036, koyu, false); }
    kutu(donen, 0.08, 0.035, 0.26, metal, 0, 0.02, 0);
    const on = motoTeker(R, P.gOn, sinif==='a1'?16:5, true); on.position.set(0.0, -P.Lf, 0); on.rotation.z = -P.rake; donen.add(on);
    // çamurluk
    { const c = new T.Mesh(new T.CylinderGeometry(R+0.035, R+0.035, P.gOn+0.035, 24, 1, true, 2.36, 1.3).rotateX(Math.PI/2), M_('camurlukBoya'+sinif, ()=>{ const m=BOYA.clone(); m.side=T.DoubleSide; return m; })); c.position.set(0, -P.Lf, 0); c.rotation.z = -P.rake; donen.add(c); }
    // gidon (dünya eğimini telafi ederek)
    const gid = new T.Group(); gid.position.set(-0.04, 0.10, 0); gid.rotation.z = -P.rake; donen.add(gid);
    const gGen = sinif==='a'?0.34:0.38, gY = sinif==='a'? 0.02 : 0.07;
    uzuv(gid, V(-0.06, gY, -gGen), V(0, gY-0.02, 0), 0.014, sinif==='a'?koyu:krom(), false); uzuv(gid, V(-0.06, gY, gGen), V(0, gY-0.02, 0), 0.014, sinif==='a'?koyu:krom(), false);
    const elcikler = [];
    for(const z of [-1,1]){ uzuv(gid, V(-0.06, gY, z*gGen), V(-0.08, gY+0.005, z*(gGen+0.11)), 0.019, siyahMat(), true);
      const p = new T.Object3D(); p.position.set(-0.075, gY+0.005, z*(gGen+0.06)); gid.add(p); elcikler.push(p);
      uzuv(gid, V(-0.02, gY+0.01, z*(gGen-0.05)), V(-0.02, gY+0.03, z*(gGen-0.12)), 0.006, metal, false);       // fren/debriyaj kolu
      // ayna
      const ab = V(-0.03, gY+0.02, z*(gGen-0.04)), ak = V(-0.06, gY+0.24, z*(gGen+0.06));
      uzuv(gid, ab, ak, 0.008, siyahMat(), false);
      const ay = new T.Group(); ay.position.copy(ak); gid.add(ay);
      const kab = new T.Mesh(new T.SphereGeometry(0.06, 18, 12).scale(0.35, 0.62, 1), siyahParlak()); ay.add(kab);
      const cam = new T.Mesh(new T.CircleGeometry(0.052, 20).scale(1, 0.6, 1), aynaCam()); cam.position.x = -0.022; cam.rotation.y = -Math.PI/2; ay.add(cam);
      aynalar.push({ grup:ay, cam, z });
    }
    // gösterge
    { const gs = new T.Group(); gs.position.set(0.02, 0.15, 0); gs.rotation.z = -P.rake+0.6; gid.add(gs);
      kutu(gs, 0.04, 0.10, 0.15, koyu, 0, 0, 0);
      const ek = new T.Mesh(new T.PlaneGeometry(0.12, 0.075), lambaMat(0x8FD4FF, 0.6)); ek.position.x = -0.021; ek.rotation.y = -Math.PI/2; gs.add(ek); }
    // far
    const farG = new T.Group(); farG.position.set(0.10, -0.06, 0); farG.rotation.z = -P.rake; donen.add(farG);
    if(P.stil==='yuvarlak'){
      const kas = new T.Mesh(new T.CylinderGeometry(0.095, 0.08, 0.13, 32).rotateZ(Math.PI/2), krom()); farG.add(kas);
      const cam = new T.Mesh(new T.CircleGeometry(0.088, 32), lambaMat(0xFFFFFF, 0.15)); cam.position.x = 0.066; cam.rotation.y = Math.PI/2; farG.add(cam); lb.far.push(cam);
      const hal = new T.Mesh(new T.TorusGeometry(0.06, 0.006, 8, 32), lambaMat(0xEAF4FF, 2)); hal.position.x = 0.068; hal.rotation.y = Math.PI/2; farG.add(hal); lb.gunduz.push(hal);
    } else if(P.stil==='koseli'){
      const kas = yk(farG, 0.14, 0.20, 0.22, 0.05, BOYA, 0, 0, 0, 0.02);
      const cam = new T.Mesh(new T.PlaneGeometry(0.12, 0.07), lambaMat(0xFFFFFF, 0.15)); cam.position.set(0.075, -0.02, 0); cam.rotation.y = Math.PI/2; farG.add(cam); lb.far.push(cam);
      for(const z of [-1,1]){ const k = new T.Mesh(new T.BoxGeometry(0.01, 0.012, 0.08), lambaMat(0xEAF4FF, 2)); k.position.set(0.076, 0.035, z*0.05); k.rotation.x = z*0.4; farG.add(k); lb.gunduz.push(k); }
      const cm = new T.Mesh(new T.BoxGeometry(0.01, 0.16, 0.18), camMat()); cm.position.set(0.02, 0.15, 0); cm.rotation.z = 0.45; farG.add(cm);
    }
    // ön sinyaller
    for(const z of [-1,1]){ const s = new T.Mesh(new T.BoxGeometry(0.05, 0.022, 0.03), lambaMat(0xFFA21A)); s.position.set(0.06, -0.04, z*0.17); farG.add(s); uzuv(farG, V(0.02,-0.04,z*0.08), V(0.04,-0.04,z*0.16), 0.008, siyahMat(), false); sinyal(lb, z, s); }
    // ---- Şase boruları ----
    for(const z of [-1,1]){
      boru(grup, [V(hx-0.02, hy-0.02, z*0.04), V(hx-0.25, hy-0.14, z*0.12), V(px+0.10, py+0.30, z*0.13), V(px, py+0.02, z*0.11)], 0.024, sase);
      boru(grup, [V(px+0.12, py+0.36, z*0.10), V(rx+0.32, P.sele+0.02, z*0.08), V(rx+0.06, P.sele+0.10, z*0.05)], 0.014, sase);
    }
    // ---- Motor ----
    const ex = (hx+px)/2 + 0.02, ey = py + 0.05, s = P.motor;
    const mg = new T.Group(); mg.position.set(ex, ey, 0); grup.add(mg);
    yk(mg, 0.36*s, 0.22*s, 0.24, 0.06, metal, -0.02, -0.06*s, 0, 0.02);                    // karter
    if(sinif==='a1'){ const sl = new T.Group(); sl.position.set(0.07, 0.10, 0); sl.rotation.z = -0.35; mg.add(sl);
      for(let i=0;i<6;i++){ const f = new T.Mesh(new T.BoxGeometry(0.17-i*0.005, 0.012, 0.20), metal); f.position.y = i*0.026; sl.add(f); }
      kutu(sl, 0.12, 0.17, 0.15, koyu, 0, 0.07, 0);
    } else { for(let i=0;i<(sinif==='a'?4:2);i++){ /* sıra silindir */ }
      const bl = yk(mg, 0.20*s, 0.24*s, 0.30, 0.05, koyu, 0.06, 0.12*s, 0, 0.02); bl.rotation.z = -0.3;
      const kp = yk(mg, 0.18*s, 0.07, 0.31, 0.03, metal, 0.12, 0.25*s, 0, 0.015); kp.rotation.z = -0.3; }
    const dk = new T.Mesh(new T.CylinderGeometry(0.075*s, 0.075*s, 0.04, 24).rotateX(Math.PI/2), metal); dk.position.set(-0.04, -0.06*s, 0.13); mg.add(dk);
    // radyatör (A2/A)
    if(sinif!=='a1'){ const rd = yk(grup, 0.05, 0.26, 0.30, 0.02, koyu, hx-0.12, hy-0.32, 0, 0.01); rd.rotation.z = P.rake-0.15; }
    // egzoz
    const egzM = mat('egzoz', 0xB9BEC3, 0.22, 0.95);
    const kafaE = V(ex+0.14*s, ey+0.16*s, 0.04);
    if(sinif==='a1'){ boru(grup, [kafaE, V(ex+0.20, ey-0.10, 0.10), V(ex, ey-0.22, 0.14), V(px-0.05, py-0.06, 0.15), V(rx+0.30, py+0.02, 0.16)], 0.022, egzM);
      const su = uzuv(grup, V(rx+0.32, py+0.02, 0.16), V(rx+0.02, py+0.14, 0.16), 0.05, egzM, true); }
    else if(sinif==='a2'){ boru(grup, [kafaE, V(ex+0.22, ey-0.12, 0.06), V(ex+0.02, ey-0.24, 0.05), V(px-0.10, py-0.18, 0.08)], 0.024, egzM);
      const su = yk(grup, 0.26, 0.12, 0.14, 0.04, koyu, px-0.18, py-0.14, 0.10, 0.02); }
    else { boru(grup, [kafaE, V(ex+0.22, ey-0.12, 0.08), V(ex, ey-0.22, 0.12), V(px-0.10, py-0.02, 0.16), V(rx+0.36, py+0.14, 0.18)], 0.026, egzM);
      uzuv(grup, V(rx+0.40, py+0.15, 0.18), V(rx+0.02, py+0.26, 0.18), 0.065, mat('egzozKoyu', 0x2A2D31, 0.3, 0.8), true); }
    // ---- Depo (yan profil, genişlikte yumuşatılmış) ----
    const tx0 = hx - 0.04, tx1 = px + 0.08, ty0 = hy + 0.02;
    { const sh = new T.Shape(); sh.moveTo(tx0, ty0-0.03); sh.quadraticCurveTo(tx0-0.02, ty0+0.03, tx0-0.10, ty0+0.03);
      sh.quadraticCurveTo((tx0+tx1)/2, ty0+0.02, tx1+0.02, P.sele+0.04); sh.lineTo(tx1, P.sele-0.06);
      sh.quadraticCurveTo((tx0+tx1)/2, ty0-0.32, tx0-0.06, ty0-0.24); sh.lineTo(tx0, ty0-0.03);
      const bev = P.tank*0.32, g = new T.ExtrudeGeometry(sh, { depth:P.tank-2*bev, bevelEnabled:true, bevelThickness:bev, bevelSize:0.035, bevelSegments:8, curveSegments:16 });
      g.translate(0,0,-(P.tank-2*bev)/2); yumusat(g); const d = new T.Mesh(g, BOYA); grup.add(d);
      const kp = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 0.012, 20), metal); kp.position.set(tx0-0.16, ty0+0.03, 0); grup.add(kp);
      for(const z of [-1,1]){ const r = new T.Mesh(new T.CircleGeometry(0.03, 20), new T.MeshStandardMaterial({map:rozetDoku(), metalness:0.6, roughness:0.3})); r.position.set((tx0+tx1)/2+0.04, ty0-0.10, z*(P.tank/2+0.004)); if(z<0) r.rotation.y = Math.PI; grup.add(r); }
    }
    // ---- Kaplama (A): yan paneller + ön maske + cam ----
    if(P.stil==='kaplama'){
      for(const z of [-1,1]){ const sh = new T.Shape(); sh.moveTo(hx+0.12, hy-0.05); sh.lineTo(hx-0.30, hy-0.10); sh.lineTo(px+0.02, py+0.08); sh.lineTo(ex+0.05, ey-0.12*s); sh.lineTo(hx+0.02, hy-0.42); sh.lineTo(hx+0.12, hy-0.05);
        const g = new T.ExtrudeGeometry(sh, { depth:0.02, bevelEnabled:true, bevelThickness:0.02, bevelSize:0.02, bevelSegments:3 }); const p = new T.Mesh(g, BOYA); p.position.z = z*0.17 - 0.01; p.rotation.y = z*0.06; grup.add(p);
        const kp = new T.Mesh(new T.ExtrudeGeometry(sh, {depth:0.005, bevelEnabled:false}), siyahParlak()); kp.scale.set(0.98,0.98,1); kp.position.set((hx)*0.02, hy*0.02-0.03, z*0.205); grup.add(kp); }
      { const sh = new T.Shape(); sh.moveTo(hx+0.30, hy-0.12); sh.quadraticCurveTo(hx+0.24, hy+0.04, hx+0.10, hy+0.14); sh.lineTo(hx-0.10, hy+0.06); sh.lineTo(hx-0.04, hy-0.30); sh.quadraticCurveTo(hx+0.16, hy-0.26, hx+0.30, hy-0.12);
        const g = new T.ExtrudeGeometry(sh, { depth:0.26, bevelEnabled:true, bevelThickness:0.08, bevelSize:0.03, bevelSegments:6, curveSegments:12 }); g.translate(0,0,-0.13); yumusat(g); grup.add(new T.Mesh(g, BOYA)); }
      for(const z of [-1,1]){ const f = new T.Mesh(new T.BoxGeometry(0.02, 0.05, 0.11), lambaMat(0xFFFFFF, 0.15)); f.position.set(hx+0.265, hy-0.03, z*0.09); f.rotation.y = z*0.35; f.rotation.z = 0.80; grup.add(f); lb.far.push(f);
        const d = new T.Mesh(new T.BoxGeometry(0.02, 0.014, 0.14), lambaMat(0xEAF4FF, 2)); d.position.set(hx+0.215, hy+0.05, z*0.10); d.rotation.y = z*0.45; d.rotation.z = 0.80; grup.add(d); lb.gunduz.push(d); }
      const cm = new T.Mesh(new T.BoxGeometry(0.008, 0.30, 0.34), new T.MeshPhysicalMaterial({ color:0x5E6E7A, roughness:0.05, transparent:true, opacity:0.45 })); cm.position.set(hx+0.04, hy+0.26, 0); cm.rotation.z = 0.50; grup.add(cm);
    }
    // ---- Sele + kuyruk ----
    const sx0 = tx1+0.04, sx1 = rx+0.10;
    { const sh = new T.Shape(); sh.moveTo(sx0, P.sele-0.06); sh.quadraticCurveTo(sx0-0.02, P.sele+0.05, sx0-0.12, P.sele+0.05);
      sh.lineTo(sx1+0.18, P.sele+(sinif==='a1'?0.05:0.10)); sh.quadraticCurveTo(sx1, P.sele+0.12, sx1-0.02, P.sele+0.06); sh.lineTo(sx1+0.05, P.sele-0.02); sh.lineTo(sx0, P.sele-0.06);
      const g = new T.ExtrudeGeometry(sh, { depth:0.18, bevelEnabled:true, bevelThickness:0.05, bevelSize:0.03, bevelSegments:6, curveSegments:12 }); g.translate(0,0,-0.09); yumusat(g);
      grup.add(new T.Mesh(g, mat('sele', 0x17191B, 0.85, 0))); }
    const kuy = yk(grup, 0.42, 0.12, 0.20, 0.05, BOYA, rx+0.20, P.sele+0.0, 0, 0.03); kuy.rotation.z = 0.10;
    yk(grup, 0.28, 0.06, 0.15, 0.025, BOYA, sx0-0.05, P.sele-0.10, 0, 0.02);
    // arka lamba, plaka, sinyal
    const st = new T.Mesh(new T.BoxGeometry(0.02, 0.035, 0.12), lambaMat(0xD0101E, 0.8)); st.position.set(rx-0.02, P.sele+0.02, 0); st.rotation.z = 0.25; grup.add(st); lb.arka.push(st); lb.fren.push(st);
    const plT = V(rx+0.02, P.sele-0.10, 0), plK = V(rx-0.10, R+0.30, 0);
    uzuv(grup, plT, plK, 0.012, siyahMat(), false);
    const plk = new T.Mesh(new T.PlaneGeometry(0.20, 0.10), new T.MeshStandardMaterial({ map:yaziDoku('EB 54', 256, 128), roughness:0.6 })); plk.position.copy(plK).add(V(-0.01,-0.03,0)); plk.rotation.y = -Math.PI/2; plk.rotation.x = 0; grup.add(plk);
    for(const z of [-1,1]){ const s2 = new T.Mesh(new T.BoxGeometry(0.05, 0.022, 0.03), lambaMat(0xFFA21A)); s2.position.set(rx-0.06, R+0.40, z*0.13); grup.add(s2); uzuv(grup, V(rx-0.04, R+0.40, z*0.04), V(rx-0.05, R+0.40, z*0.12), 0.008, siyahMat(), false); sinyal(lb, z, s2); }
    // arka çamurluk
    { const c = new T.Mesh(new T.CylinderGeometry(R+0.035, R+0.035, P.gArka*0.85, 20, 1, true, 2.4, 1.3).rotateX(Math.PI/2), M_('arkaCamurluk', ()=>new T.MeshStandardMaterial({color:0x1E2226, roughness:0.6, side:T.DoubleSide}))); c.position.set(rx, R, 0); grup.add(c); }
    // marşpedal / basamaklar, yan sehpa
    const basamak = []; for(const z of [-1,1]){ const p = V(px+0.02, py-0.05, z*0.16); uzuv(grup, p.clone().setZ(z*0.10), p.clone().setZ(z*0.22), 0.016, koyu, false); basamak.push(p.clone().setZ(z*0.20)); }
    // ---- Sürücü ----
    grup.updateMatrixWorld(true);
    const elW = elcikler.map(p=>p.getWorldPosition(V()));
    const kalca = V(sx0-0.18, P.sele+0.12, 0);
    let omuz, egim = 0.15; for(; egim<1.25; egim+=0.02){ omuz = kalca.clone().add(V(Math.sin(egim)*0.50, Math.cos(egim)*0.50, 0)); if(omuz.distanceTo(V(elW[0].x, elW[0].y, 0)) < 0.50) break; }
    const ez = { omuzL:omuz.clone().setZ(-0.19), omuzR:omuz.clone().setZ(0.19), kalcaL:kalca.clone().setZ(-0.10), kalcaR:kalca.clone().setZ(0.10), kalca };
    ez.boyun = omuz.clone().add(V(0.02, 0.08, 0)); ez.bas = omuz.clone().add(V(0.09, 0.24, 0));
    ez.elL = elW[0]; ez.elR = elW[1];
    ez.dirsekL = ik(ez.omuzL, ez.elL, 0.30, 0.29, V(-0.3,-1,-0.6)); ez.dirsekR = ik(ez.omuzR, ez.elR, 0.30, 0.29, V(-0.3,-1,0.6));
    ez.ayakL = basamak[0].clone().add(V(-0.02,0.04,0)); ez.ayakR = basamak[1].clone().add(V(-0.02,0.04,0));
    ez.dizL = ik(ez.kalcaL, ez.ayakL, 0.44, 0.45, V(1,0.6,-0.25)); ez.dizR = ik(ez.kalcaR, ez.ayakR, 0.44, 0.45, V(1,0.6,0.25));
    let surucu = null;
    if(o.surucu !== false){ surucu = insan(ez, { ceket:o.ceket ?? 0x1E242C, pantolon:0x24303F, kask:o.kask ?? 0xF2F3F4 }); grup.add(surucu); }
    const M = aracBitir(grup, { tur:'moto', sinif, tekerler:[arka, on], onTeker:[donen], lambalar:lb, aynalar, boya:BOYA, surucu,
      uzunluk:P.WB+2*R+0.2, genislik:0.8, dingil:P.WB, arkaAks:rx, tekerR:R, goz: ez.bas.clone().add(V(0.06, 0.02, 0)) });
    M.direksiyon = a => { donen.rotation.y = a; };
    M.yatis = a => { grup.rotation.x = a; };
    return M;
  }

  /* ================== Avrupa tipi kabin (kamyon / çekici) ================== */
  function agirKabin(ust, o){
    const { onX, gen=2.48, renk=0xF2F2EF, yatakli=true } = o;
    const BOYA = boyaMat(renk), lb = o.lb, aynalar = o.aynalar;
    const boy = yatakli ? 2.25 : 1.75, y0 = 1.05, yH = 2.60;
    const kab = new T.Group(); ust.add(kab);
    const kx = onX - boy/2;
    yk(kab, boy, yH, gen, 0.16, BOYA, kx, y0+yH/2, 0, 0.06);
    // tavan rüzgarlığı
    { const sh = new T.Shape(); sh.moveTo(onX-0.25, 0); const rh = yatakli?0.48:0.22; sh.quadraticCurveTo(onX-0.6, rh*0.9, onX-1.1, rh); sh.lineTo(onX-boy+0.05, rh); sh.lineTo(onX-boy+0.05, 0); sh.lineTo(onX-0.25, 0);
      const g = new T.ExtrudeGeometry(sh, { depth:gen-0.30, bevelEnabled:true, bevelThickness:0.08, bevelSize:0.06, bevelSegments:4 }); g.translate(0, y0+yH-0.02, -(gen-0.30)/2); yumusat(g); kab.add(new T.Mesh(g, BOYA)); }
    // ön cam + güneşlik
    const cam = new T.Mesh(new T.BoxGeometry(0.03, 0.95, gen-0.22), camMat()); cam.position.set(onX+0.005, 2.62, 0); cam.rotation.z = 0.06; kab.add(cam);
    kutu(kab, 0.30, 0.06, gen-0.10, siyahParlak(), onX+0.08, 3.16, 0);
    // silecekler
    for(const z of [-0.45, 0.45]){ const s = kutu(kab, 0.012, 0.012, 0.85, siyahMat(), onX+0.03, 2.20, z); s.rotation.x = 0.25; }
    // ızgara (yatay çıtalar) + rozet
    const izg = new T.Group(); izg.position.set(onX+0.01, 1.65, 0); kab.add(izg);
    kutu(izg, 0.04, 0.80, 1.70, siyahParlak(), 0, 0, 0);
    for(let i=0;i<6;i++) kutu(izg, 0.05, 0.035, 1.66, i%2? krom(): mat('izgCita', 0x2A2E33, 0.4, 0.6), 0.01, -0.32+i*0.13, 0);
    const roz = new T.Mesh(new T.CircleGeometry(0.11, 32), new T.MeshStandardMaterial({ map:rozetDoku(), metalness:0.7, roughness:0.25 })); roz.position.set(0.04, 0.25, 0); roz.rotation.y = Math.PI/2; izg.add(roz);
    // tampon + farlar
    yk(kab, 0.40, 0.42, gen+0.02, 0.10, mat('tampon', 0x2A2E33, 0.55, 0.2), onX-0.12, 0.92, 0, 0.04);
    for(const z of [-1,1]){
      const fg = new T.Group(); fg.position.set(onX+0.085, 1.0, z*0.92); kab.add(fg);
      kutu(fg, 0.03, 0.20, 0.50, siyahParlak(), 0, 0, 0);
      for(const dz of [-0.11, 0.08]){ const p = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 0.03, 24).rotateZ(Math.PI/2), lambaMat(0xFFFFFF, 0.15)); p.position.set(0.01, 0.01, z*dz); fg.add(p); lb.far.push(p); }
      const d = new T.Mesh(new T.BoxGeometry(0.02, 0.02, 0.46), lambaMat(0xEAF4FF, 2)); d.position.set(0.02, 0.09, 0); fg.add(d); lb.gunduz.push(d);
      const s = new T.Mesh(new T.BoxGeometry(0.02, 0.04, 0.12), lambaMat(0xFFA21A)); s.position.set(0.02, -0.06, z*0.19); fg.add(s); sinyal(lb, z, s);
      const ys = new T.Mesh(new T.BoxGeometry(0.10, 0.04, 0.02), lambaMat(0xFFA21A)); ys.position.set(onX-0.55, 1.55, z*(gen/2+0.005)); kab.add(ys); sinyal(lb, z, ys);
    }
    // kapılar, camlar, kollar, basamaklar
    for(const z of [-1,1]){ const zz = z*(gen/2+0.002);
      const kc = new T.Mesh(new T.PlaneGeometry(1.15, 0.80), camMat()); kc.position.set(onX-0.70, 2.55, zz+z*0.003); if(z<0) kc.rotation.y = Math.PI; kab.add(kc);
      const cz = M_('kabinCizgi', ()=>new T.MeshBasicMaterial({color:0x101214}));
      for(const x of [onX-0.12, onX-1.32]) kutu(kab, 0.012, 1.95, 0.006, cz, x, 2.00, zz);
      kutu(kab, 1.20, 0.012, 0.006, cz, onX-0.72, 1.04, zz);
      kutu(kab, 0.20, 0.04, 0.03, krom(), onX-1.10, 2.02, zz);
      for(const [y, x] of [[0.48, onX-0.65],[0.82, onX-0.68]]){ kutu(kab, 0.62, 0.035, 0.28, mat('basamak', 0x6C7279, 0.4, 0.8), x, y, z*(gen/2-0.12)); }
      kutu(kab, 0.03, 0.75, 0.03, krom(), onX-0.16, 1.70, z*(gen/2+0.03));       // tutamak
      // büyük dikiz aynaları (ana + geniş açı)
      const a1 = yanAyna(kab, V(onX-0.05, 2.62, z*(gen/2+0.30)), z, 0.24, 0.40, siyahMat(), V(onX-0.10, 2.95, z*(gen/2+0.02)));
      uzuv(kab, V(onX-0.10, 2.35, z*(gen/2+0.02)), V(onX-0.06, 2.42, z*(gen/2+0.28)), 0.016, siyahMat(), false);
      const a2 = yanAyna(kab, V(onX-0.05, 2.25, z*(gen/2+0.30)), z, 0.20, 0.17, siyahMat(), null);
      aynalar.push(a1, a2);
    }
    // tavan lambaları
    for(let i=-2;i<=2;i++){ const l = new T.Mesh(new T.BoxGeometry(0.04, 0.03, 0.08), lambaMat(0xFFA21A, 0.4)); l.position.set(onX-0.12, 3.25, i*0.20); kab.add(l); }
    // iç mekân (sürücü görünümü): pano + direksiyon + koltuk
    const ic = new T.Group(); kab.add(ic);
    kutu(ic, 0.55, 0.45, gen-0.25, mat('pano', 0x1A1D21, 0.8), onX-0.40, 1.95, 0);
    const dr = new T.Mesh(new T.TorusGeometry(0.24, 0.025, 10, 32), siyahMat()); dr.position.set(onX-0.80, 2.15, -0.62); dr.rotation.order='ZYX'; dr.rotation.set(0, Math.PI/2, 0.55); ic.add(dr);
    for(const z of [-0.62, 0.62]){ kutu(ic, 0.55, 0.14, 0.55, M_('koltuk', ()=>new T.MeshStandardMaterial({color:0x2A2E33, roughness:0.9})), onX-1.25, 1.75, z); const sr = kutu(ic, 0.14, 0.80, 0.52, M_('koltuk'), onX-1.55, 2.20, z); sr.rotation.z = 0.12; }
    return { kab, BOYA, goz:V(onX-1.15, 2.62, -0.62) };
  }
  // Şasi kirişleri ve aksesuarlar
  function sasi(g, x0, x1, y=0.90, gen=0.86){ for(const z of [-1,1]) kutu(g, x0-x1, 0.24, 0.08, mat('sasi', 0x1B1D20, 0.6, 0.4), (x0+x1)/2, y, z*gen/2); }
  function arkaLambalar(g, x, y, gen, lb, plaka=true){
    for(const z of [-1,1]){ const k = new T.Group(); k.position.set(x, y, z*(gen/2-0.30)); g.add(k);
      kutu(k, 0.05, 0.16, 0.50, siyahParlak(), 0, 0, 0);
      const st = new T.Mesh(new T.BoxGeometry(0.02, 0.12, 0.14), lambaMat(0xD0101E, 0.6)); st.position.set(-0.03, 0, -z*0.15); k.add(st); lb.arka.push(st); lb.fren.push(st);
      const sg = new T.Mesh(new T.BoxGeometry(0.02, 0.12, 0.12), lambaMat(0xFFA21A)); sg.position.set(-0.03, 0, z*0.0); k.add(sg); sinyal(lb, z, sg);
      const gr = new T.Mesh(new T.BoxGeometry(0.02, 0.12, 0.10), lambaMat(0xFFFFFF)); gr.position.set(-0.03, 0, z*0.15); k.add(gr); lb.geri.push(gr); }
    if(plaka){ const p = new T.Mesh(new T.PlaneGeometry(0.52, 0.11), new T.MeshStandardMaterial({ map:yaziDoku('34 EB 054', 512, 108), roughness:0.6 })); p.position.set(x-0.03, y-0.02, 0); p.rotation.y = -Math.PI/2; g.add(p); }
  }
  function yanKoruma(g, x0, x1, y, gen){ for(const z of [-1,1]) for(const dy of [0, 0.22]) kutu(g, x0-x1, 0.05, 0.03, mat('koruma', 0x9AA1A8, 0.4, 0.8), (x0+x1)/2, y+dy, z*(gen/2-0.05)); }

  /* ================== Kamyon (C): kabin + perdeli kasa ================== */
  function kamyon(o={}){
    const grup = new T.Group(); grup.name='kamyon'; const lb = bosLamba(), aynalar = [];
    const onX = 4.45, onAks = 3.25, arkaAks = -1.75, R = 0.52, gen = 2.50;
    const K = agirKabin(grup, { onX, gen, renk:o.renk ?? 0xF2F2EF, yatakli:false, lb, aynalar });
    sasi(grup, onX-0.2, -4.6);
    // kasa
    const kx0 = onX-1.95, kx1 = -4.95, ky0 = 1.22, ky1 = 3.85, kL = kx0-kx1;
    kutu(grup, kL, 0.12, gen+0.04, mat('kasaTaban', 0x2A2E33, 0.6, 0.4), (kx0+kx1)/2, ky0, 0);
    const perde = new T.MeshStandardMaterial({ map:perdeDoku('#E9EAE6', 'EHLİYET BENDE'), roughness:0.85 });
    const pm = new T.Mesh(new T.BoxGeometry(kL, ky1-ky0, gen), [perde, perde, mat('kasaTavan', 0xDCDDD8, 0.8), mat('kasaTavan'), perde, perde]);
    pm.position.set((kx0+kx1)/2, (ky0+ky1)/2, 0); grup.add(pm);
    for(const x of [kx0, kx1]) for(const z of [-1,1]) kutu(grup, 0.08, ky1-ky0, 0.08, mat('kasaDirek', 0xB4B9BE, 0.4, 0.7), x, (ky0+ky1)/2, z*(gen/2));
    kutu(grup, 0.04, ky1-ky0-0.1, gen-0.1, mat('kasaKapi', 0xC9CCC9, 0.6, 0.3), kx1-0.02, (ky0+ky1)/2, 0);
    for(const z of [-0.35, 0.35]) kutu(grup, 0.03, ky1-ky0-0.3, 0.04, krom(), kx1-0.05, (ky0+ky1)/2, z);
    // yakıt deposu, akü kutusu, çamurluklar, koruma, arka tampon
    { const d = new T.Mesh(new T.CylinderGeometry(0.30, 0.30, 1.1, 24).rotateZ(Math.PI/2), mat('depo', 0xC4C9CE, 0.25, 0.9)); d.position.set(onAks-1.55, 0.72, -(gen/2-0.32)); grup.add(d); }
    kutu(grup, 0.70, 0.45, 0.50, siyahMat(), onAks-1.55, 0.75, gen/2-0.32);
    yanKoruma(grup, arkaAks+0.8, onAks-2.3, 0.55, gen);
    kutu(grup, 0.10, 0.12, gen-0.2, mat('koruma'), kx1+0.15, 0.55, 0);
    arkaLambalar(grup, kx1+0.10, 0.82, gen, lb);
    // teker
    const tekerler = [], onTeker = [];
    for(const z of [-1,1]){ const tt = new T.Group(); tt.position.set(onAks, R, z*(gen/2-0.24)); grup.add(tt); const t = agirTeker(R, 0.32, false); if(z<0) t.rotation.y = Math.PI; tt.add(t); tekerler.push(t); onTeker.push(tt);
      const t2 = agirTeker(R, 0.30, true); t2.position.set(arkaAks, R, z*(gen/2-0.40)); if(z<0) t2.rotation.y = Math.PI; grup.add(t2); tekerler.push(t2);
      const c = new T.Mesh(new T.CylinderGeometry(R+0.10, R+0.10, 0.70, 20, 1, true, 0, Math.PI).rotateX(Math.PI/2), mat('camurluk', 0x1E2125, 0.7)); c.material.side = T.DoubleSide; c.position.set(arkaAks, R, z*(gen/2-0.40)); grup.add(c); }
    return aracBitir(grup, { tur:'kamyon', arkaAks, tekerR:R, tekerler, onTeker, lambalar:lb, aynalar, boya:K.BOYA, uzunluk:onX-kx1, genislik:gen, dingil:onAks-arkaAks, goz:K.goz });
  }

  /* ================== Çekici + dorse (C+E) ================== */
  function cekici(o={}){
    const grup = new T.Group(); grup.name='cekici'; const lb = bosLamba(), aynalar = [];
    const onX = 3.05, onAks = 1.90, arkaAks = -1.75, R = 0.52, gen = 2.50;
    const K = agirKabin(grup, { onX, gen, renk:o.renk ?? 0x1C4E8C, yatakli:true, lb, aynalar });
    sasi(grup, onX-0.2, arkaAks-0.85);
    // yan etekler + yakıt deposu
    { const d = new T.Mesh(new T.CylinderGeometry(0.32, 0.32, 1.2, 24).rotateZ(Math.PI/2), mat('depo', 0xC4C9CE, 0.25, 0.9)); d.position.set(onAks-1.65, 0.72, -(gen/2-0.32)); grup.add(d); }
    yk(grup, 1.25, 0.60, 0.06, 0.05, K.BOYA, onAks-1.70, 0.78, gen/2-0.05, 0.02);
    // beşinci teker
    const bt = new T.Mesh(new T.CylinderGeometry(0.42, 0.42, 0.10, 28), mat('besinci', 0x2B2E32, 0.4, 0.7)); bt.position.set(arkaAks+0.25, 1.13, 0); grup.add(bt);
    // arka tampon + lambalar
    kutu(grup, 0.10, 0.15, gen-0.30, siyahMat(), arkaAks-0.85, 0.75, 0);
    const tekerler = [], onTeker = [];
    for(const z of [-1,1]){ const tt = new T.Group(); tt.position.set(onAks, R, z*(gen/2-0.24)); grup.add(tt); const t = agirTeker(R, 0.32, false); if(z<0) t.rotation.y = Math.PI; tt.add(t); tekerler.push(t); onTeker.push(tt);
      const t2 = agirTeker(R, 0.30, true); t2.position.set(arkaAks, R, z*(gen/2-0.40)); if(z<0) t2.rotation.y = Math.PI; grup.add(t2); tekerler.push(t2);
      const c = new T.Mesh(new T.CylinderGeometry(R+0.10, R+0.10, 0.70, 20, 1, true, 0, Math.PI).rotateX(Math.PI/2), mat('camurluk', 0x1E2125, 0.7)); c.material.side = T.DoubleSide; c.position.set(arkaAks, R, z*(gen/2-0.40)); grup.add(c); }
    // ---- Dorse: mafsal noktası beşinci tekerin merkezinde, Y ekseni etrafında döner ----
    const dorse = new T.Group(); dorse.position.set(arkaAks+0.25, 0, 0); grup.add(dorse);
    const dL = 13.6, dOn = 1.25, dx0 = dOn, dx1 = dOn-dL, dy0 = 1.28, dy1 = 4.0;
    const perde = new T.MeshStandardMaterial({ map:perdeDoku('#DFE1DD', 'EHLİYET BENDE'), roughness:0.85 });
    const pm = new T.Mesh(new T.BoxGeometry(dL, dy1-dy0, gen), [mat('dorseOn', 0xDCDDD8, 0.8), mat('dorseOn'), mat('dorseOn'), mat('dorseOn'), perde, perde]);
    pm.position.set((dx0+dx1)/2, (dy0+dy1)/2, 0); dorse.add(pm);
    kutu(dorse, dL, 0.18, gen+0.04, mat('kasaTaban', 0x2A2E33, 0.6, 0.4), (dx0+dx1)/2, dy0-0.04, 0);
    kutu(dorse, dL, 0.06, gen+0.04, mat('kasaDirek', 0xB4B9BE, 0.4, 0.7), (dx0+dx1)/2, dy1, 0);
    for(let x=dx0; x>dx1-0.01; x-=dL/6) for(const z of [-1,1]) kutu(dorse, 0.06, dy1-dy0, 0.05, mat('kasaDirek'), x, (dy0+dy1)/2, z*(gen/2+0.01));
    kutu(dorse, 0.04, dy1-dy0-0.1, gen-0.1, mat('kasaKapi', 0xC9CCC9, 0.6, 0.3), dx1-0.02, (dy0+dy1)/2, 0);
    for(const z of [-0.35, 0.35]) kutu(dorse, 0.03, dy1-dy0-0.3, 0.04, krom(), dx1-0.05, (dy0+dy1)/2, z);
    sasi(dorse, dx0-0.3, dx1+0.2, 1.05, 1.0);
    for(const z of [-1,1]) uzuv(dorse, V(-1.6, 1.15, z*0.75), V(-1.6, 0.18, z*0.75), 0.05, mat('ayak', 0x2B2E32, 0.5, 0.6), false);       // destek ayakları
    yanKoruma(dorse, -2.0, dx1+3.9, 0.62, gen);
    kutu(dorse, 0.10, 0.12, gen-0.2, mat('koruma', 0x9AA1A8, 0.4, 0.8), dx1+0.15, 0.55, 0);
    arkaLambalar(dorse, dx1+0.10, 0.85, gen, lb);
    const dorseTeker = [];
    for(const ax of [-8.9, -10.2, -11.5]) for(const z of [-1,1]){ const t = agirTeker(0.50, 0.38, false); t.position.set(ax+dOn-1.25, 0.50, z*(gen/2-0.30)); if(z<0) t.rotation.y = Math.PI; dorse.add(t); tekerler.push(t); dorseTeker.push(t); }
    for(let i=0;i<5;i++) for(const z of [-1,1]){ const l = new T.Mesh(new T.BoxGeometry(0.08, 0.04, 0.02), lambaMat(0xFFA21A, 0.5)); l.position.set(dx0-1.5-i*2.4, 1.10, z*(gen/2+0.03)); dorse.add(l); }
    const M = aracBitir(grup, { tur:'cekici', arkaAks, tekerR:R, tekerler, onTeker, lambalar:lb, aynalar, boya:K.BOYA, uzunluk:onX-(arkaAks+0.25+dx1), genislik:gen, dingil:onAks-arkaAks, goz:K.goz,
      dorse, dorseUzunluk:dL, mafsalX:arkaAks+0.25 });
    M.kirma = a => { dorse.rotation.y = a; };
    return M;
  }

  /* ================== Midibüs (D1) ================== */
  function midibus(o={}){
    const grup = new T.Group(); grup.name='midibus'; const lb = bosLamba(), aynalar = [];
    const L = 8.0, gen = 2.34, onX = L/2, arX = -L/2, y0 = 0.38, y1 = 3.0, onAks = 2.55, arkaAks = -1.75, R = 0.40;
    const BOYA = boyaMat(o.renk ?? 0xF4F4F1);
    { const b=0.08, bs=0.07, sh=new T.Shape(), x0=arX+bs, x1=onX-bs, ya=y0+bs, yb=y1-bs, rk=0.20, ar=R+0.09;
      sh.moveTo(x0+0.06, ya); sh.lineTo(arkaAks-ar, ya); sh.absarc(arkaAks, R, ar, Math.PI-Math.asin((ya-R)/ar), Math.asin((ya-R)/ar), true);
      sh.lineTo(onAks-ar, ya); sh.absarc(onAks, R, ar, Math.PI-Math.asin((ya-R)/ar), Math.asin((ya-R)/ar), true);
      sh.lineTo(x1-0.06, ya); sh.quadraticCurveTo(x1, ya, x1, ya+0.06); sh.lineTo(x1, yb-rk); sh.quadraticCurveTo(x1, yb, x1-rk, yb);
      sh.lineTo(x0+rk, yb); sh.quadraticCurveTo(x0, yb, x0, yb-rk); sh.lineTo(x0, ya+0.06); sh.quadraticCurveTo(x0, ya, x0+0.06, ya);
      const g = new T.ExtrudeGeometry(sh, { depth:gen-2*b, bevelEnabled:true, bevelThickness:b, bevelSize:bs, bevelSegments:4, curveSegments:24 }); g.translate(0,0,-(gen-2*b)/2); yumusat(g);
      grup.add(new T.Mesh(g, BOYA)); }
    // ön cam (geniş) + LED tabela
    const oc = new T.Mesh(new T.BoxGeometry(0.03, 1.38, gen-0.18), camMat()); oc.position.set(onX+0.01, 2.02, 0); oc.rotation.z = 0.05; grup.add(oc);
    const led = new T.Mesh(new T.PlaneGeometry(gen-0.40, 0.22), new T.MeshStandardMaterial({ map:ledDoku('EHLİYET BENDE'), emissive:0xffffff, emissiveMap:ledDoku('EHLİYET BENDE'), emissiveIntensity:0.9 })); led.position.set(onX+0.05, 2.82, 0); led.rotation.y = Math.PI/2; grup.add(led);
    for(const z of [-0.5, 0.5]){ const s = kutu(grup, 0.012, 0.012, 0.95, siyahMat(), onX+0.04, 1.36, z); s.rotation.x = 0.3; }
    // ön yüz: siyah alt panel, farlar, ızgara, rozet
    kutu(grup, 0.04, 0.55, gen-0.12, siyahParlak(), onX+0.012, 0.92, 0);
    for(let i=0;i<4;i++) kutu(grup, 0.05, 0.025, 1.10, mat('izgCita', 0x2A2E33, 0.4, 0.6), onX+0.03, 0.78+i*0.07, 0);
    { const r = new T.Mesh(new T.CircleGeometry(0.09, 32), new T.MeshStandardMaterial({ map:rozetDoku(), metalness:0.7, roughness:0.25 })); r.position.set(onX+0.04, 1.12, 0); r.rotation.y = Math.PI/2; grup.add(r); }
    for(const z of [-1,1]){ const fg = new T.Group(); fg.position.set(onX+0.04, 1.00, z*0.86); grup.add(fg);
      const p = new T.Mesh(new T.BoxGeometry(0.02, 0.14, 0.34), lambaMat(0xFFFFFF, 0.15)); fg.add(p); lb.far.push(p);
      const d = new T.Mesh(new T.BoxGeometry(0.02, 0.025, 0.40), lambaMat(0xEAF4FF, 2)); d.position.set(0.005, 0.10, 0); fg.add(d); lb.gunduz.push(d);
      const s = new T.Mesh(new T.BoxGeometry(0.02, 0.05, 0.10), lambaMat(0xFFA21A)); s.position.set(0.005, -0.03, -z*0.24); fg.add(s); sinyal(lb, z, s);
      const ys = new T.Mesh(new T.BoxGeometry(0.12, 0.04, 0.02), lambaMat(0xFFA21A)); ys.position.set(onAks+0.6, 0.85, z*(gen/2+0.005)); grup.add(ys); sinyal(lb, z, ys);
      // tavşan kulağı aynalar
      const kok = V(onX-0.05, 2.75, z*(gen/2-0.05)), uc = V(onX+0.35, 2.35, z*(gen/2+0.12));
      boru(grup, [kok, V(onX+0.25, 2.95, z*(gen/2+0.05)), uc], 0.022, siyahMat(), 16);
      aynalar.push(yanAyna(grup, uc.clone().add(V(0.02,-0.20,0)), z, 0.22, 0.34, siyahMat(), null)); }
    // yan bant (marka renkleri) + camlar
    for(const z of [-1,1]){ const zz = z*(gen/2+0.003);
      const bnt = new T.Mesh(new T.PlaneGeometry(L-0.6, 0.16), mat('bantSari', 0xF2C21B, 0.4, 0.1)); bnt.position.set(-0.1, 1.16, zz); if(z<0) bnt.rotation.y = Math.PI; grup.add(bnt);
      const bnt2 = new T.Mesh(new T.PlaneGeometry(L-0.6, 0.05), mat('bantKoyu', 0x14181B, 0.5, 0.1)); bnt2.position.set(-0.1, 1.02, zz); if(z<0) bnt2.rotation.y = Math.PI; grup.add(bnt2);
      const cx0 = z>0 ? onX-1.45 : onX-0.30, cx1 = arX+0.35;
      const cm = new T.Mesh(new T.PlaneGeometry(cx0-cx1, 1.05), camMat()); cm.position.set((cx0+cx1)/2, 2.12, zz+z*0.002); if(z<0) cm.rotation.y = Math.PI; grup.add(cm);
      for(let x=cx0-0.02; x>cx1; x-=1.18) kutu(grup, 0.08, 1.05, 0.01, siyahParlak(), x, 2.12, zz+z*0.004);
    }
    // sağ ön kapı (çift kanatlı, camlı)
    { const z = gen/2+0.006, dx0 = onX-0.30, dx1 = onX-1.40;
      kutu(grup, dx0-dx1, 2.30, 0.01, siyahParlak(), (dx0+dx1)/2, 1.52, z);
      for(const x of [dx0-0.28, dx1+0.28]){ const k = new T.Mesh(new T.PlaneGeometry(0.50, 2.10), camMat()); k.position.set(x, 1.55, z+0.004); grup.add(k); }
      kutu(grup, 0.02, 2.10, 0.012, krom(), (dx0+dx1)/2, 1.55, z+0.006); }
    // arka: arka cam, motor ızgarası, lambalar, tampon
    const ac = new T.Mesh(new T.PlaneGeometry(gen-0.30, 0.85), camMat()); ac.position.set(arX-0.012, 2.30, 0); ac.rotation.y = -Math.PI/2; grup.add(ac);
    for(let i=0;i<6;i++) kutu(grup, 0.03, 0.03, 1.2, siyahMat(), arX-0.01, 1.10+i*0.08, 0);
    for(const z of [-1,1]){ const k = new T.Group(); k.position.set(arX-0.02, 1.25, z*(gen/2-0.16)); grup.add(k);
      kutu(k, 0.04, 0.80, 0.18, siyahParlak(), 0, 0, 0);
      const st = new T.Mesh(new T.BoxGeometry(0.02, 0.24, 0.14), lambaMat(0xD0101E, 0.6)); st.position.set(-0.025, 0.22, 0); k.add(st); lb.arka.push(st); lb.fren.push(st);
      const sg = new T.Mesh(new T.BoxGeometry(0.02, 0.18, 0.14), lambaMat(0xFFA21A)); sg.position.set(-0.025, -0.02, 0); k.add(sg); sinyal(lb, z, sg);
      const gr = new T.Mesh(new T.BoxGeometry(0.02, 0.14, 0.14), lambaMat(0xFFFFFF)); gr.position.set(-0.025, -0.22, 0); k.add(gr); lb.geri.push(gr); }
    { const f = new T.Mesh(new T.BoxGeometry(0.03, 0.04, 0.60), lambaMat(0xD0101E)); f.position.set(arX-0.02, 2.88, 0); grup.add(f); lb.fren.push(f); }
    const pl = new T.Mesh(new T.PlaneGeometry(0.52, 0.11), new T.MeshStandardMaterial({ map:yaziDoku('34 EB 054', 512, 108), roughness:0.6 })); pl.position.set(arX-0.03, 0.80, 0); pl.rotation.y = -Math.PI/2; grup.add(pl);
    yk(grup, 0.18, 0.28, gen+0.02, 0.08, mat('tampon', 0x2A2E33, 0.55, 0.2), arX+0.02, 0.50, 0, 0.03);
    yk(grup, 0.18, 0.28, gen+0.02, 0.08, mat('tampon'), onX-0.02, 0.50, 0, 0.03);
    // tavan klima ünitesi
    yk(grup, 1.6, 0.22, 1.4, 0.10, BOYA, -0.6, y1+0.08, 0, 0.05);
    // iç: pano + direksiyon
    kutu(grup, 0.45, 0.35, gen-0.3, mat('pano', 0x1A1D21, 0.8), onX-0.35, 1.25, 0);
    // teker yuvaları (karanlık) + tekerler
    const tekerler = [], onTeker = [];
    for(const [x, onMu] of [[onAks,true],[arkaAks,false]]){
      const c = new T.Mesh(new T.CylinderGeometry(R+0.10, R+0.10, gen-0.04, 24, 1, false, -0.05, Math.PI+0.1).rotateX(Math.PI/2), M_('icCamurluk', ()=>new T.MeshBasicMaterial({color:0x050607, side:T.BackSide}))); c.rotation.z = Math.PI/2+0.05; c.position.set(x, R, 0); grup.add(c);
      for(const z of [-1,1]){ const tt = new T.Group(); tt.position.set(x, R, z*(gen/2-(onMu?0.18:0.30))); grup.add(tt); const t = agirTeker(R, 0.24, !onMu, 0xD5D8DB); if(z<0) t.rotation.y = Math.PI; tt.add(t); tekerler.push(t); if(onMu) onTeker.push(tt); }
    }
    return aracBitir(grup, { tur:'midibus', arkaAks, tekerR:R, tekerler, onTeker, lambalar:lb, aynalar, boya:BOYA, uzunluk:L, genislik:gen, dingil:onAks-arkaAks, goz:V(onX-0.85, 2.05, -0.60) });
  }


  /* ================== Römork (BE): tek dingilli kapalı yük römorku ================== */
  function romork(o={}){
    const grup = new T.Group(); grup.name='romork'; const lb = bosLamba();
    const L=2.6, gen=1.55, R=0.30, aks=-1.55, x0=-0.55, x1=x0-L, y0=0.55, y1=1.75;
    const BOYA = boyaMat(o.renk ?? 0xE9EAE6);
    yk(grup, L, y1-y0, gen, 0.10, BOYA, (x0+x1)/2, (y0+y1)/2, 0, 0.04);
    kutu(grup, L+0.04, 0.10, gen+0.06, mat('kasaTaban', 0x2A2E33, 0.6, 0.4), (x0+x1)/2, y0-0.02, 0);
    for(const z of [-1,1]){ const p = new T.Mesh(new T.PlaneGeometry(1.5, 0.30), new T.MeshStandardMaterial({ map:perdeDoku('#E9EAE6','EHLİYET BENDE'), roughness:0.8 })); p.position.set((x0+x1)/2, 1.20, z*(gen/2+0.003)); if(z<0) p.rotation.y=Math.PI; grup.add(p); }
    // çeki oku (V) + kaplin
    for(const z of [-1,1]) uzuv(grup, V(x0+0.02, 0.48, z*0.55), V(-0.02, 0.46, 0), 0.03, mat('sasi', 0x1B1D20, 0.6, 0.4), false);
    const kp = new T.Mesh(new T.SphereGeometry(0.06, 14, 10), siyahMat()); kp.position.set(0.02, 0.47, 0); grup.add(kp);
    const sk = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 0.35, 10), krom()); sk.position.set(-0.30, 0.32, 0); grup.add(sk);
    // çamurluklar + teker
    const tekerler=[];
    for(const z of [-1,1]){ const t = agirTeker(R, 0.19, false, 0xC9CED3); t.position.set(aks, R, z*(gen/2-0.08)); if(z<0) t.rotation.y=Math.PI; grup.add(t); tekerler.push(t);
      const c = new T.Mesh(new T.CylinderGeometry(R+0.06, R+0.06, 0.26, 18, 1, true, 0, Math.PI).rotateX(Math.PI/2), mat('camurluk', 0x1E2125, 0.7)); c.material.side=T.DoubleSide; c.position.set(aks, R, z*(gen/2+0.02)); grup.add(c); }
    arkaLambalar(grup, x1-0.01, 0.62, gen+0.3, lb);
    return aracBitir(grup, { tur:'romork', arkaAks:aks, tekerR:R, tekerler, onTeker:[], lambalar:lb, aynalar:[], boya:BOYA, uzunluk:L+0.6, genislik:gen, dingil:0, goz:V(0,1,0) });
  }
  // B + römork birlikte
  function kupeRomork(o={}){
    const A = kupe(o), Rm = romork(); const g = new T.Group(); g.add(A.grup);
    Rm.grup.position.x = -2.14; g.add(Rm.grup);
    const M = Object.assign({}, A, { grup:g, romork:Rm, uzunluk:A.uzunluk+3.1 });
    M.lamba = (ad,ac,gu)=>{ A.lamba(ad,ac,gu); Rm.lamba(ad,ac,gu); }; M.isikSifirla=()=>{ A.isikSifirla(); Rm.isikSifirla(); };
    return M;
  }

  /* ================== Kollarını bağlamış eğitmen (site + uygulama) ================== */
  function egitmen(o={}){
    const k = o.boy ?? 1.0, y = v => v*k;
    const e = { kalca:V(0,y(0.98),0), kalcaL:V(0,y(0.97),-0.10), kalcaR:V(0,y(0.97),0.10),
      omuzL:V(-0.01,y(1.44),-0.19), omuzR:V(-0.01,y(1.44),0.19), boyun:V(0,y(1.53),0), bas:V(0.01,y(1.68),0),
      dizL:V(0.03,y(0.52),-0.11), dizR:V(0.03,y(0.52),0.11), ayakL:V(-0.01,y(0.09),-0.12), ayakR:V(-0.01,y(0.09),0.12) };
    // kollar göğüs önünde çapraz: sol el sağ dirseğe, sağ el sol dirseğin altına
    e.dirsekL = V(0.10, y(1.18), -0.23); e.dirsekR = V(0.12, y(1.16), 0.23);
    e.elL = V(0.19, y(1.24), 0.17); e.elR = V(0.17, y(1.21), -0.17);
    const g = insan(e, { ceket:o.ceket ?? 0x1D5BA8, pantolon:o.pantolon ?? 0x2B3442, ten:o.ten ?? 0xD8A07C, sac:o.sac ?? 0x2C2622 });
    // yaka kartı
    const kart = new T.Mesh(new T.PlaneGeometry(0.11, 0.07), new T.MeshStandardMaterial({ map:ledDoku('EĞİTMEN', 256, 160), roughness:0.6 }));
    kart.position.set(0.135, y(1.33), -0.09); kart.rotation.y = Math.PI/2; g.add(kart);
    g.traverse(m=>{ if(m.isMesh) m.castShadow = true; }); dogrusal(g);
    return g;
  }

  /* ---------- Vitrin sahnesi için ortam yansıması (PMREM) ---------- */
  function ortam(renderer){
    const s = new T.Scene();
    const kure = new T.Mesh(new T.SphereGeometry(50, 32, 16), new T.ShaderMaterial({ side:T.BackSide, uniforms:{},
      vertexShader:'varying vec3 p; void main(){ p=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader:'varying vec3 p; void main(){ float y=p.y; vec3 ust=vec3(.70,.74,.80); vec3 ufuk=vec3(.42,.45,.50); vec3 alt=vec3(.08,.09,.10); vec3 c = y>0. ? mix(ufuk,ust,pow(y,.6)) : mix(ufuk,alt,pow(-y,.4)); gl_FragColor=vec4(c,1.); }' }));
    s.add(kure);
    const panel = (w,h,x,y,z,g=3) => { const m = new T.Mesh(new T.PlaneGeometry(w,h), new T.MeshBasicMaterial({color:new T.Color(g,g,g)})); m.position.set(x,y,z); m.lookAt(0,0,0); s.add(m); };
    panel(30,6,0,22,0,2.2); panel(14,10,28,10,8,1.6); panel(14,10,-26,8,-14,1.3); panel(40,3,0,4,-40,1.1);
    const pm = new T.PMREMGenerator(renderer); const env = pm.fromScene(s, 0.035).texture; pm.dispose(); return env;
  }

  return { kupe, kupeRomork, romork, egitmen, teker, motosiklet, kamyon, cekici, midibus, insan, ik, ortam, dogrusal, yumusat };
})();
