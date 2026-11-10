# Kaynak dosyalarından kuyruk.json üretir (bir kez çalıştırılır)
import json, importlib.util, pathlib, difflib, sys
k = pathlib.Path(__file__).parent
liste = []
for f in sorted(k.glob('kaynak*.py')):
    sp = importlib.util.spec_from_file_location(f.stem, f); m = importlib.util.module_from_spec(sp); sp.loader.exec_module(m)
    liste += m.S
mevcut = [q['metin'] for q in json.load(open(k.parent/'sorular.json', encoding='utf-8'))['sorular']]
if len(sys.argv) > 1: mevcut += [h[1] for h in json.load(open(sys.argv[1], encoding='utf-8'))]
out, atla = [], 0
for i, (kat, metin, d, y1, y2, y3, coz) in enumerate(liste, 1):
    assert kat in ('iy','tc','mt','ta') and len({d,y1,y2,y3}) == 4, metin
    benzer = max((difflib.SequenceMatcher(None, metin.lower(), m.lower()).ratio() for m in mevcut), default=0)
    if benzer > 0.85: atla += 1; print('benzer, atlandı:', metin); continue
    out.append({"uid": f"k{i:03d}", "kat": kat, "metin": metin, "dogru": d, "yanlislar": [y1, y2, y3], "cozum": coz, "levha": None})
json.dump(out, open(k/'kuyruk.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
from collections import Counter
print(len(out), 'soru kuyrukta', dict(Counter(q['kat'] for q in out)), 'atlanan', atla)
