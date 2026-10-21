// ===== 盧琴樹 授權版：留言篩選純函式（瀏覽器與 node 測試共用）=====
// 依賴 core.js 的 normKey / cpCmp / listHash / sha256Hex
(function(G){
const S2T={'轧':'軋','扎':'軋','夏':'夏','威':'威','夷':'夷','莓':'莓','糖':'糖','牛':'牛','果':'果','豆':'豆','仁':'仁','乐':'樂','树':'樹','琴':'琴','卢':'盧'};
const DEFAULT_ALIASES=['草莓夏威夷果牛軋糖'];
// 關鍵字正規化：NFKC（全形→半形）、小寫、簡→繁基本字、可選去除空白與標點符號
function normText(s,opt={}){let t=String(s||'').normalize('NFKC').toLowerCase();
 if(opt.s2t!==false)t=Array.from(t).map(c=>S2T[c]||c).join('');
 if(opt.ignorePunct!==false)t=t.replace(/[\s\p{P}\p{S}]/gu,'');
 return t;}
function hasKeyword(msg,aliases,opt){const m=normText(msg,opt);return aliases.map(a=>normText(a,opt)).filter(Boolean).some(a=>m.includes(a));}
// Graph 時間格式 2026-10-20T12:00:00+0000 → ms
function parseTime(s){if(!s)return NaN;return Date.parse(String(s).replace(/([+-]\d\d)(\d\d)$/,'$1:$2'));}
// 台北時間 "YYYY-MM-DDTHH:mm" → 該分鐘最後一毫秒（含 23:59:59.999）
function taipeiDeadlineMs(local){const m=/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)/.exec(local);if(!m)return NaN;
 return Date.UTC(+m[1],m[2]-1,+m[3],+m[4],+m[5])-8*3600e3+59999;}
// comments：統一格式 [{id,uid,name,message,created_time,platform}]；uid 為比對鍵來源（FB from.id / IG username）
function filterComments(comments,{aliases,deadlineMs,selfIds=[],opt={}}){
 const self=new Set(selfIds.map(x=>normKey(x)));const sorted=[...comments].sort((a,b)=>parseTime(a.created_time)-parseTime(b.created_time)||(a.id<b.id?-1:1));
 const valid=new Map(),excluded=[];const counts={total:comments.length,valid:0,no_account:0,page_self:0,late:0,no_keyword:0,duplicate:0};
 for(const c of sorted){let reason=null;const k=c.uid?normKey(c.uid):'';
  if(!k)reason='no_account';else if(self.has(k))reason='page_self';else if(!(parseTime(c.created_time)<=deadlineMs))reason='late';
  else if(!hasKeyword(c.message,aliases,opt))reason='no_keyword';else if(valid.has(k))reason='duplicate';
  if(reason){counts[reason]++;excluded.push({...c,key:k,reason,first_comment_id:reason==='duplicate'?valid.get(k).id:undefined});}
  else valid.set(k,{...c,key:k});}
 const entries=[...valid.values()].sort((a,b)=>cpCmp(a.key,b.key));counts.valid=entries.length;
 return{entries,excluded,counts};}
const REASON={no_account:'無帳號資訊（API 未回傳 from）',page_self:'粉專／官方帳號本身',late:'超過截止時間',no_keyword:'未含指定關鍵字',duplicate:'同帳號重複留言（保留最早一則）'};
const api={normText,hasKeyword,parseTime,taipeiDeadlineMs,filterComments,REASON,DEFAULT_ALIASES};
Object.assign(G,api);if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
