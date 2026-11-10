"""Her gün kuyruktaki sorulardan bir kısmını sorular.json'a ekler.
Uygulama sorular.json'u internet bağlantısı olduğunda kendiliğinden çeker (30 dakikada bir kontrol)."""
import json, datetime, pathlib, os
kok = pathlib.Path(__file__).resolve().parents[2]
banka_y, kuyruk_y = kok/'sorular.json', kok/'kuyruk'/'kuyruk.json'
GUNLUK = int(os.environ.get('GUNLUK_SORU', '8'))
ORAN = ['tc','iy','tc','mt','iy','tc','ta','mt']   # e-sınav dağılımına yakın sıra (23/12/9/6)
banka = json.load(open(banka_y, encoding='utf-8'))
kuyruk = json.load(open(kuyruk_y, encoding='utf-8'))
var = {q['uid'] for q in banka['sorular']}
kuyruk = [q for q in kuyruk if q['uid'] not in var]
secilen = []
for i in range(GUNLUK * 3):
    if len(secilen) >= GUNLUK or not kuyruk: break
    kat = ORAN[i % len(ORAN)]
    q = next((x for x in kuyruk if x['kat'] == kat), None) or (kuyruk[0] if i >= GUNLUK else None)
    if q: secilen.append(q); kuyruk.remove(q)
if not secilen:
    print('Kuyruk boş; eklenecek soru yok.'); raise SystemExit(0)
banka['sorular'] += secilen
bugun = datetime.date.today().isoformat()
banka['surum'] = f"{bugun}-{len(banka['sorular'])}"
banka['guncelleme'] = bugun
json.dump(banka, open(banka_y, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(kuyruk, open(kuyruk_y, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f"{len(secilen)} soru eklendi; bankada {len(banka['sorular'])}, kuyrukta {len(kuyruk)} soru kaldı.")
