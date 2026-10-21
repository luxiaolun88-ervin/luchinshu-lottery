#!/usr/bin/env python3
# 盧琴樹 公開抽獎驗證程式：
#   單一平台：python3 verify.py list.txt "seed" FB 5
#   合併抽：  python3 verify.py combined.txt "seed" ALL 10        (每行 FB:帳號 / IG:帳號)
#             python3 verify.py fb.txt "seed" ALL 10 ig.txt       (兩份原始名單)
import sys, re, hashlib, unicodedata
def key(s):
    s = unicodedata.normalize("NFC", s).strip().lstrip("@＠").strip()
    return s.lower()
def read(p):
    return open(p, encoding="utf-8-sig").read().splitlines()
def keyset(lines):
    return {key(l) for l in lines if key(l)}
path, seed, platform, n = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
if platform == "ALL":
    if len(sys.argv) > 5:  # 兩份檔案：FB 名單、IG 名單
        entries = {"FB:" + k for k in keyset(read(path))} | {"IG:" + k for k in keyset(read(sys.argv[5]))}
    else:  # 一份已加前綴的檔案
        entries = set()
        for l in read(path):
            l = unicodedata.normalize("NFC", l).strip()
            if not l: continue
            parts = []
            for part in re.split(r"\+(?=(?:FB|IG|fb|ig):)", l):  # FB:x 或人工合併的 FB:x+IG:y
                p, sep, rest = part.partition(":")
                if not sep or p.upper() not in ("FB", "IG"): sys.exit("格式錯誤（需 FB: 或 IG: 前綴）：" + l)
                if key(rest): parts.append(p.upper() + ":" + key(rest))
            if parts: entries.add("+".join(parts))
    keys = sorted(entries)
else:
    keys = sorted(keyset(read(path)))
print("list_hash", hashlib.sha256("\n".join(keys).encode()).hexdigest())
h = lambda k: hashlib.sha256(f"{seed}|{platform}|{k}".encode()).hexdigest()
for i, (s, k) in enumerate(sorted((h(k), k) for k in keys)[:n], 1):
    print(i, k, s)
