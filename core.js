// ===== 核心演算法（可被 node 測試擷取）=====
function normKey(s){return String(s).normalize('NFC').trim().replace(/^[@＠]+/,'').trim().toLowerCase();}
function cpCmp(a,b){const A=Array.from(a),B=Array.from(b);for(let i=0;i<Math.min(A.length,B.length);i++){const d=A[i].codePointAt(0)-B[i].codePointAt(0);if(d)return d;}return A.length-B.length;}
function cleanList(lines){const seen=new Map();let raw=0,empty=0,dup=0;
 for(const l of lines){const disp=String(l).normalize('NFC').trim().replace(/^[@＠]+/,'').trim();if(!disp){empty++;continue;}raw++;const k=disp.toLowerCase();if(seen.has(k)){dup++;continue;}seen.set(k,disp);}
 const keys=[...seen.keys()].sort(cpCmp);return{raw,empty,dup,keys,display:Object.fromEntries(seen)};}
function hex(buf){return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');}
async function sha256Hex(str){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(str)));}
async function listHash(keys){return sha256Hex(keys.join('\n'));}
async function drawWinners(keys,seed,platform,n){const scored=[];for(const k of keys)scored.push({key:k,score:await sha256Hex(seed+'|'+platform+'|'+k)});
 scored.sort((a,b)=>a.score<b.score?-1:a.score>b.score?1:cpCmp(a.key,b.key));return scored.slice(0,n).map((x,i)=>({rank:i+1,...x}));}
function parseCSV(text){text=text.replace(/^\uFEFF/,'');const rows=[];let row=[],f='',q=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(q){if(c=='"'){if(text[i+1]=='"'){f+='"';i++;}else q=false;}else f+=c;}
  else if(c=='"')q=true;else if(c==','){row.push(f);f='';}else if(c=='\n'||c=='\r'){if(c=='\r'&&text[i+1]=='\n')i++;row.push(f);rows.push(row);row=[];f='';}else f+=c;}
 if(f!==''||row.length){row.push(f);rows.push(row);}return rows.filter(r=>r.some(x=>x.trim()!==''));}
function maskName(s){const a=Array.from(s);if(a.length<=1)return '*';if(a.length==2)return a[0]+'*';return a[0]+'*'.repeat(Math.min(a.length-2,6))+a[a.length-1];}
// 合併抽：各平台內各自去重，再加上「FB:」「IG:」前綴；同名帳號跨平台各算一筆
// merges：[[fbKey,igKey],...] 經人工確認為同一人 → 合為單一項目「FB:x+IG:y」（每個帳號最多合併一次）
function combineLists(fbKeys,igKeys,merges=[]){const F=new Set(fbKeys),I=new Set(igKeys),used=new Set(),e=[];
 for(const[f,i]of merges){if(!F.has(f)||!I.has(i)||used.has('FB:'+f)||used.has('IG:'+i))continue;used.add('FB:'+f);used.add('IG:'+i);e.push('FB:'+f+'+IG:'+i);}
 for(const k of F)if(!used.has('FB:'+k))e.push('FB:'+k);for(const k of I)if(!used.has('IG:'+k))e.push('IG:'+k);return e.sort(cpCmp);}
function splitEntry(e){return e.split(/\+(?=(?:FB|IG):)/).map(x=>({platform:x.slice(0,2),key:x.slice(3)}));}
// 疑似同一人：去除空白、底線、點、連字號、數字後比較；含中日韓文字者須完全相同，其餘相同或 Levenshtein 相似度 ≥ 0.8
function stripName(k){return k.replace(/[\s_.\-\d０-９]/g,'');}
function lev(a,b){a=Array.from(a);b=Array.from(b);let p=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const c=[i];for(let j=1;j<=b.length;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c;}return p[b.length];}
function simRatio(a,b){const m=Math.max(Array.from(a).length,Array.from(b).length);return m?1-lev(a,b)/m:1;}
const CJK=/[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uac00-\ud7af]/;
function findSimilarPairs(fbKeys,igKeys){const out=[];for(const f of fbKeys){const sf=stripName(f);if(!sf)continue;for(const i of igKeys){const si=stripName(i);if(!si)continue;
 let r;if(CJK.test(sf)||CJK.test(si))r=sf===si?1:0;else r=sf===si?1:simRatio(sf,si);if(r>=0.8)out.push({fb:f,ig:i,ratio:Math.round(r*100)/100,exact:f===i});}}
 return out.sort((a,b)=>b.ratio-a.ratio||cpCmp(a.fb,b.fb)||cpCmp(a.ig,b.ig));}
// 遞補：ranking 為完整分數排序；removals 依序 [{key,reason}]；回傳最終得獎者與遞補紀錄（不改變抽獎數學）
function applyReplacements(ranking,n,removals=[]){const gone=new Set(),log=[];const top=()=>ranking.filter(r=>!gone.has(r.key)).slice(0,n);let cur=top();
 for(const rm of removals){if(gone.has(rm.key)||!cur.some(w=>w.key===rm.key))continue;const was=ranking.find(r=>r.key===rm.key);gone.add(rm.key);const nx=top();const inn=nx.find(w=>!cur.some(c=>c.key===w.key));
  log.push({removed_key:rm.key,removed_rank:was.rank,reason:rm.reason,replaced_by_key:inn?inn.key:null,replaced_by_rank:inn?inn.rank:null});cur=nx;}
 return{winners:cur,replacements:log};}
if(typeof module!=='undefined')module.exports={normKey,cleanList,listHash,drawWinners,parseCSV,maskName,sha256Hex,combineLists,splitEntry,cpCmp,stripName,lev,simRatio,findSimilarPairs,applyReplacements};
