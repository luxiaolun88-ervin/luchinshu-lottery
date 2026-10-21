// ===== 設定（部署前修改）=====
const META_APP_ID = 'YOUR_META_APP_ID';     // Meta 開發者後台 → 應用程式設定 → 基本資料 → 應用程式編號
const META_LOGIN_CONFIG_ID = '';            // 若使用「Facebook Login for Business」並建立了「設定(Configuration)」，填入設定 ID；留空則用一般 scope 登入
const GRAPH_VERSION = 'v26.0';              // 2026-07-29 發布的最新版；Meta 新版發布後可更新
const SCOPES = ['pages_show_list','pages_read_engagement','pages_read_user_content','pages_manage_metadata','instagram_basic','instagram_manage_comments','business_management'];
const PERMS = {
 pages_show_list:'列出你管理的粉絲專頁，讓你選擇「盧琴樹」。',
 pages_read_engagement:'讀取粉專貼文內容與互動資料（貼文列表、縮圖、留言數）。',
 pages_read_user_content:'讀取粉絲在粉專貼文下的留言與留言者（抽獎名單的來源）。',
 pages_manage_metadata:'部分情況下讀取留言與粉專設定所需（Meta 文件列為留言相關依賴權限）；本頁不會修改任何設定。',
 instagram_basic:'讀取粉專連結的 IG 專業帳號基本資料與貼文列表。',
 instagram_manage_comments:'讀取 IG 貼文留言（Meta 將「讀取留言」也歸在此權限）；本頁不會回覆或刪除留言。',
 business_management:'粉專若歸屬於企業管理平台（Business 資產組合），需此權限才看得到該粉專。'};
const CAMPAIGN='盧琴樹 LUCHINSHU「猜猜我是誰」草莓夏威夷果牛軋糖';
const Q=new URLSearchParams(location.search);const MOCK=Q.get('mock')==='1';
const APP_ID=Q.get('appId')||META_APP_ID;const GRAPH='https://graph.facebook.com/'+GRAPH_VERSION;
const $=id=>document.getElementById(id);
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
const twFmt=new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
const tw=t=>twFmt.format(t==null?new Date():new Date(typeof t==='number'?t:parseTime(t)));
function dl(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\uFEFF'+text],{type}));a.download=name;a.click();}

// ===== 狀態（權杖只存在記憶體）=====
const ST={userToken:null,pages:[],page:null,ig:null,raw:{FB:null,IG:null},src:{FB:null,IG:null},filtered:{},snap:null,mode:'FB',draw:null,sel:{FB:null,IG:null}};

// ===== Graph API =====
class GraphErr extends Error{constructor(e){super(e.message);Object.assign(this,e);}}
function friendly(e){const c=e.code;
 if(c===190)return '登入權杖已過期或失效，請重新登入。';
 if(c===10||c===200||(c>=200&&c<300))return '權限不足：請重新登入並勾選所有要求的權限，或確認你是粉專管理者、且 App 中你有管理員／測試人員角色。（'+e.message+'）';
 if(c===4||c===17||c===32||c===613)return '呼叫次數過多，請稍候幾分鐘再試。';
 if(c===100)return '找不到此物件或欄位（貼文 ID 可能錯誤，或不屬於所選粉專）：'+e.message;
 return 'Facebook 回傳錯誤：'+(e.message||e);}
async function gget(pathOrUrl,params={},token){let url;
 if(/^https:\/\//.test(pathOrUrl)){const u=new URL(pathOrUrl);if(u.hostname!=='graph.facebook.com')throw new Error('拒絕非 graph.facebook.com 的分頁網址');url=u.toString();}
 else{const u=new URL(GRAPH+pathOrUrl);for(const[k,v]of Object.entries(params))u.searchParams.set(k,v);u.searchParams.set('access_token',token);url=u.toString();}
 let r;try{r=await fetch(url,{credentials:'omit'});}catch(e){throw new Error('網路連線失敗：'+e.message);}
 const j=await r.json().catch(()=>({}));if(j.error)throw new GraphErr(j.error);if(!r.ok)throw new Error('HTTP '+r.status);return j;}
async function gall(path,params,token,onPage){let j=await gget(path,params,token),out=[...(j.data||[])],n=1;onPage&&onPage(out.length,n);
 while(j.paging&&j.paging.next){j=await gget(j.paging.next);out.push(...(j.data||[]));n++;onPage&&onPage(out.length,n);}return out;}

// ===== 登入 =====
function loadSDK(){return new Promise((res,rej)=>{if(window.FB)return res();window.fbAsyncInit=()=>{FB.init({appId:APP_ID,version:GRAPH_VERSION,cookie:false,xfbml:false,status:false});res();};
 const s=document.createElement('script');s.src='https://connect.facebook.net/zh_TW/sdk.js';s.async=true;s.crossOrigin='anonymous';s.onerror=()=>rej(new Error('無法載入 Facebook SDK（網路或瀏覽器阻擋）'));document.head.appendChild(s);});}
async function login(){$('loginErr').textContent='';
 if(!MOCK&&(!APP_ID||APP_ID==='YOUR_META_APP_ID'))return $('loginErr').textContent='尚未設定 App ID：請修改 auth.js 的 META_APP_ID，或在網址加上 ?appId=…';
 if(!MOCK&&location.protocol!=='https:')return $('loginErr').textContent='Facebook 登入需要以 https 從 App 允許的網域開啟本頁。';
 try{await loadSDK();
  const resp=await new Promise(r=>FB.login(r,META_LOGIN_CONFIG_ID?{config_id:META_LOGIN_CONFIG_ID}:{scope:SCOPES.join(','),auth_type:'rerequest',return_scopes:true}));
  if(!resp.authResponse)return $('loginErr').textContent='登入已取消或未授權。';
  ST.userToken=resp.authResponse.accessToken;
  const me=await gget('/me',{fields:'id,name'},ST.userToken);$('who').textContent='已登入：'+me.name;
  const perms=await gget('/me/permissions',{},ST.userToken).catch(()=>({data:[]}));const declined=(perms.data||[]).filter(p=>p.status!=='granted').map(p=>p.permission);
  if(declined.length)$('loginErr').textContent='以下權限未授予，部分功能可能無法使用：'+declined.join('、')+'（可再按一次登入重新授權）';
  ST.pages=await gall('/me/accounts',{fields:'id,name,access_token,picture{url},instagram_business_account{id,username,profile_picture_url}',limit:100},ST.userToken);
  if(!ST.pages.length)return $('loginErr').textContent+=' 這個帳號沒有管理任何粉專，或登入時未勾選粉專。';
  $('pageSel').innerHTML=ST.pages.map((p,i)=>`<option value="${i}">${esc(p.name)}（${p.id}）</option>`).join('');$('pageSel').disabled=false;
  const def=ST.pages.findIndex(p=>/盧琴樹|luchinshu/i.test(p.name));$('pageSel').value=def>=0?def:0;$('logoutBtn').disabled=false;await pickPage();
 }catch(e){$('loginErr').textContent=e instanceof GraphErr?friendly(e):e.message;}}
function logout(){try{window.FB&&ST.userToken&&!MOCK&&FB.logout(()=>{});}catch(e){}
 Object.assign(ST,{userToken:null,pages:[],page:null,ig:null});$('who').textContent='已登出，權杖已清除。';$('pageSel').innerHTML='<option>（請先登入）</option>';$('pageSel').disabled=true;$('fbPosts').innerHTML=$('igPosts').innerHTML='';$('logoutBtn').disabled=true;$('fbLoad').disabled=$('igLoad').disabled=true;}

async function pickPage(){$('srcErr').textContent='';const p=ST.page=ST.pages[+$('pageSel').value];ST.ig=p.instagram_business_account||null;
 $('igInfo').innerHTML=ST.ig?`@${esc(ST.ig.username)}（${ST.ig.id}）`:'<span style="color:#a33">此粉專未連結 IG 專業帳號，無法讀取 IG 留言。請在 IG 設定為專業帳號並連結此粉專。</span>';
 $('selfIds').value=[p.id,ST.ig&&ST.ig.username].filter(Boolean).join(', ');$('fbLoad').disabled=false;$('igLoad').disabled=!ST.ig;
 try{const posts=await gget('/'+p.id+'/posts',{fields:'id,message,created_time,full_picture,permalink_url',limit:25},p.access_token);
  $('fbPosts').innerHTML=(posts.data||[]).map(x=>`<div class="item" data-id="${esc(x.id)}">${x.full_picture?`<img src="${esc(x.full_picture)}" alt="">`:''}<div>${esc((x.message||'（無文字）').slice(0,60))}</div><div class="hint">${tw(x.created_time)}</div></div>`).join('')||'<div class="hint">沒有貼文</div>';
 }catch(e){$('srcErr').textContent=friendly(e);}
 if(ST.ig)try{const m=await gget('/'+ST.ig.id+'/media',{fields:'id,caption,timestamp,media_type,media_url,thumbnail_url,permalink,comments_count',limit:25},p.access_token);ST.igMedia=m.data||[];
  $('igPosts').innerHTML=ST.igMedia.map(x=>`<div class="item" data-id="${esc(x.id)}"><img src="${esc(x.thumbnail_url||x.media_url||'')}" alt=""><div>${esc((x.caption||'（無文字）').slice(0,60))}</div><div class="hint">${tw(x.timestamp)}｜留言 ${x.comments_count??'?'}</div></div>`).join('');
 }catch(e){$('srcErr').textContent+=' IG：'+friendly(e);}
 for(const P of['FB','IG'])document.querySelectorAll('#'+P.toLowerCase()+'Posts .item').forEach(el=>el.onclick=()=>{document.querySelectorAll('#'+P.toLowerCase()+'Posts .item').forEach(x=>x.classList.toggle('on',x===el));ST.sel[P]=el.dataset.id;$(P.toLowerCase()+'Paste').value='';});}

function fbPostId(input,pageId){const s=input.trim();if(!s)return null;if(/^\d+_\d+$/.test(s))return s;if(/^\d+$/.test(s))return pageId+'_'+s;
 let m=/story_fbid=(\d+)/.exec(s);if(m)return pageId+'_'+m[1];m=/\/(?:posts|videos|photos)\/(?:[^/]+\/)?(\d+)/.exec(s);if(m)return pageId+'_'+m[1];
 if(/pfbid/.test(s))throw new Error('此網址為 pfbid 加密格式，API 無法直接換算；請改從上方貼文列表點選。');throw new Error('看不懂這個 FB 貼文網址，請改從列表點選或貼上「頁面ID_貼文ID」。');}
async function igMediaId(input){const s=input.trim();if(/^\d+$/.test(s))return s;const m=/instagram\.com\/(?:[^/]+\/)?(?:p|reel|tv)\/([\w-]+)/.exec(s);if(!m)throw new Error('看不懂這個 IG 網址');
 let j=await gget('/'+ST.ig.id+'/media',{fields:'id,permalink',limit:50},ST.page.access_token);
 for(let i=0;i<20;i++){const f=(j.data||[]).find(x=>(x.permalink||'').includes('/'+m[1]));if(f)return f.id;if(!j.paging||!j.paging.next)break;j=await gget(j.paging.next);}
 throw new Error('在此 IG 帳號近期貼文中找不到這個網址');}

async function loadFB(){$('srcErr').textContent='';try{const id=$('fbPaste').value.trim()?fbPostId($('fbPaste').value,ST.page.id):ST.sel.FB;if(!id)throw new Error('請先選擇或貼上 FB 貼文');
  const rows=await gall('/'+id+'/comments',{filter:$('fbReplies').checked?'stream':'toplevel',fields:'id,from{id,name},message,created_time,parent{id}',limit:100,order:'chronological'},ST.page.access_token,(n,p)=>$('fbProg').textContent=` 已讀取 ${n} 則（第 ${p} 頁）…`);
  const miss=rows.filter(r=>!r.from).length;$('fbProg').textContent=` ✅ 共 ${rows.length} 則留言`+(miss?`，其中 ${miss} 則缺少留言者資訊`:'');
  ST.raw.FB=rows.map(r=>({platform:'FB',id:r.id,uid:r.from&&r.from.id,name:r.from&&r.from.name,message:r.message||'',created_time:r.created_time,is_reply:!!r.parent}));ST.src.FB={post_id:id,page_id:ST.page.id,page_name:ST.page.name,fetched_at:tw(),include_replies:$('fbReplies').checked};applyFilter();
 }catch(e){$('srcErr').textContent=e instanceof GraphErr?friendly(e):e.message;}}
async function loadIG(){$('srcErr').textContent='';try{if(!ST.ig)throw new Error('此粉專未連結 IG 專業帳號');const id=$('igPaste').value.trim()?await igMediaId($('igPaste').value):ST.sel.IG;if(!id)throw new Error('請先選擇或貼上 IG 貼文');
  const rep=$('igReplies').checked;const rows=await gall('/'+id+'/comments',{fields:'id,username,text,timestamp'+(rep?',replies{id,username,text,timestamp}':''),limit:50},ST.page.access_token,(n,p)=>$('igProg').textContent=` 已讀取 ${n} 則（第 ${p} 頁）…`);
  const all=[];for(const r of rows){all.push({platform:'IG',id:r.id,uid:r.username,name:r.username,message:r.text||'',created_time:r.timestamp,is_reply:false});
   if(rep&&r.replies){let rs=r.replies.data||[],pg=r.replies.paging;while(pg&&pg.next){const j=await gget(pg.next);rs=rs.concat(j.data||[]);pg=j.paging;}for(const x of rs)all.push({platform:'IG',id:x.id,uid:x.username,name:x.username,message:x.text||'',created_time:x.timestamp,is_reply:true});}}
  $('igProg').textContent=` ✅ 共 ${all.length} 則留言（含回覆 ${all.filter(x=>x.is_reply).length}）`;
  ST.raw.IG=all;ST.src.IG={media_id:id,ig_user_id:ST.ig.id,ig_username:ST.ig.username,fetched_at:tw(),include_replies:rep};applyFilter();
 }catch(e){$('srcErr').textContent=e instanceof GraphErr?friendly(e):e.message;}}

// ===== 篩選 =====
function filterCfg(){return{aliases:$('kw').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),deadline:$('deadline').value,deadlineMs:taipeiDeadlineMs($('deadline').value),selfIds:$('selfIds').value.split(/[,，\s]+/).filter(Boolean),opt:{ignorePunct:$('optPunct').checked,s2t:$('optS2T').checked}};}
function applyFilter(){const cfg=filterCfg();let html='';
 for(const P of['FB','IG']){if(!ST.raw[P])continue;const r=ST.filtered[P]=filterComments(ST.raw[P],cfg);const c=r.counts;
  html+=`<h3 style="color:var(--wine);margin:10px 0 0"><span class="badge ${P}">${P}</span> 篩選結果</h3><div class="stats"><div>留言總數 <b>${c.total}</b></div><div>有效 <b>${c.valid}</b></div><div>未含關鍵字 <b>${c.no_keyword}</b></div><div>逾時 <b>${c.late}</b></div><div>重複 <b>${c.duplicate}</b></div><div>粉專本身 <b>${c.page_self}</b></div><div>無帳號資訊 <b>${c.no_account}</b></div></div>
  <details><summary>有效名單（${c.valid}）</summary><div class="scroll"><table class="t"><tr><th>#</th><th>帳號</th><th>${P=='FB'?'from.id':'比對鍵'}</th><th>留言時間（台北）</th><th>留言</th></tr>${r.entries.map((e,i)=>`<tr><td>${i+1}</td><td>${esc(e.name)}</td><td class="mono">${esc(e.key)}</td><td>${tw(e.created_time)}</td><td>${esc(e.message.slice(0,50))}</td></tr>`).join('')}</table></div></details>
  <details><summary>排除明細（${r.excluded.length}）</summary><div class="scroll"><table class="t"><tr><th>原因</th><th>帳號</th><th>時間（台北）</th><th>留言</th></tr>${r.excluded.map(e=>`<tr><td>${REASON[e.reason]}</td><td>${esc(e.name||'—')}</td><td>${tw(e.created_time)}</td><td>${esc(e.message.slice(0,50))}</td></tr>`).join('')}</table></div></details>`;}
 $('filterOut').innerHTML=html||'<div class="hint">尚未讀取留言。</div>';$('snapBtn').disabled=!Object.keys(ST.filtered).length;}

// ===== 快照 =====
async function buildSnapshot(){const cfg=filterCfg();const snap={type:'luchinshu-lottery-snapshot',version:1,campaign:CAMPAIGN,created_at:tw(),graph_version:GRAPH_VERSION,
  filters:{aliases:cfg.aliases,deadline_taipei:cfg.deadline,ignore_space_punct:cfg.opt.ignorePunct,s2t_basic:cfg.opt.s2t,fullwidth_nfkc:true,excluded_accounts:cfg.selfIds,one_entry_per_account:'earliest valid comment'},platforms:{}};
 for(const P of['FB','IG']){const r=ST.filtered[P];if(!r)continue;const keys=r.entries.map(e=>e.key);
  snap.platforms[P]={source:ST.src[P],identity:P=='FB'?'from.id':'normalized username',counts:r.counts,keys,list_hash_sha256:await listHash(keys),
   entries:r.entries.map(e=>({key:e.key,name:e.name,comment_id:e.id,created_time:e.created_time,is_reply:e.is_reply,message:e.message}))};}
 snap.snapshot_sha256=await sha256Hex(JSON.stringify({...snap,snapshot_sha256:undefined}));return snap;}
async function verifySnap(s){if(s.type!=='luchinshu-lottery-snapshot')throw new Error('不是盧琴樹抽獎快照檔');
 const h=await sha256Hex(JSON.stringify({...s,snapshot_sha256:undefined}));if(h!==s.snapshot_sha256)throw new Error('快照雜湊不符，檔案可能被修改過');
 for(const[P,d]of Object.entries(s.platforms)){const keys=[...d.keys].sort(cpCmp);if(keys.join('\n')!==d.keys.join('\n')||await listHash(keys)!==d.list_hash_sha256)throw new Error(P+' 名單雜湊不符');}return true;}
function showSnap(){const s=ST.snap;$('snapOut').innerHTML=`<div class="note">📌 快照建立於 ${esc(s.created_at)}<br>快照 SHA-256：<span class="mono">${s.snapshot_sha256}</span>${Object.entries(s.platforms).map(([P,d])=>`<br><span class="badge ${P}">${P}</span> 有效 ${d.keys.length} 人｜名單雜湊 <span class="mono">${d.list_hash_sha256}</span>`).join('')}</div>`;
 $('snapDl').disabled=false;$('drawBtn').disabled=false;renderSim();}

// ===== 抽獎（使用 core.js：drawWinners / combineLists / findSimilarPairs / applyReplacements）=====
function displayOf(P,key){const d=ST.snap.platforms[P];const e=d&&d.entries.find(x=>x.key===key);return e?(e.name||key):key;}
function entryName(entry,m){return splitEntry(entry).map(x=>`<span class="badge ${x.platform}">${x.platform}</span> ${esc(m?maskName(displayOf(x.platform,x.key)):displayOf(x.platform,x.key))}`).join(' ＋ ');}
function renderSim(){const keep=new Set(mergesSel().map(x=>x.join('|'))),mk=$('mask').checked,mm=t=>esc(mk?maskName(t):t);const on=ST.mode==='ALL'&&ST.snap&&ST.snap.platforms.FB&&ST.snap.platforms.IG;$('simCard').classList.toggle('hidden',!on);if(!on)return;
 const fb=ST.snap.platforms.FB.entries,byName=new Map();for(const e of fb){const k=normKey(e.name||'');if(!byName.has(k))byName.set(k,[]);byName.get(k).push(e.key);}
 const pairs=findSimilarPairs([...byName.keys()],ST.snap.platforms.IG.keys);const rows=[];for(const p of pairs)for(const id of byName.get(p.fb))rows.push({fbId:id,ig:p.ig,ratio:p.ratio});
 $('simList').innerHTML=rows.length?rows.map(p=>`<div class="rk"><label><input type="checkbox" data-fb="${esc(p.fbId)}" data-ig="${esc(p.ig)}"${keep.has(p.fbId+'|'+p.ig)?' checked':''}> 合併</label><span><span class="badge FB">FB</span> ${mm(displayOf('FB',p.fbId))}</span>↔<span><span class="badge IG">IG</span> @${mm(p.ig)}</span><span class="hint">相似度 ${p.ratio}</span></div>`).join(''):'<div class="hint">沒有疑似同一人的帳號。</div>';}
function mergesSel(){return[...document.querySelectorAll('#simList input:checked')].map(i=>[i.dataset.fb,i.dataset.ig]);}
async function doDraw(){const s=ST.snap;if(!s)return alert('請先建立或匯入快照');const seed=$('seed').value;if(!seed.trim())return alert('請輸入公開種子');const P=ST.mode;
 let keys,merges=[];if(P==='ALL'){if(!s.platforms.FB||!s.platforms.IG)return alert('合併抽需要快照同時包含 FB 與 IG');merges=mergesSel();keys=combineLists(s.platforms.FB.keys,s.platforms.IG.keys,merges);}
 else{if(!s.platforms[P])return alert('快照中沒有 '+P+' 名單');keys=s.platforms[P].keys;}
 const n=Math.max(1,parseInt($('nWin').value)||5);const ranking=await drawWinners(keys,seed,P,keys.length);
 ST.draw={platform:P,seed,n,keys,merges,ranking,removals:[],list_hash:await listHash(keys),time:tw()};renderDraw();}
function renderDraw(){const d=ST.draw,m=$('mask').checked;const ap=applyReplacements(d.ranking,d.n,d.removals);const orig=new Set(d.ranking.slice(0,d.n).map(r=>r.key));const gone=new Set(d.removals.map(r=>r.key));
 $('drawOut').classList.remove('hidden');$('platShow').textContent={FB:'FB 粉專',IG:'Instagram',ALL:'FB＋IG 合併抽'}[d.platform];
 $('winners').innerHTML=ap.winners.map((w,i)=>`<li><span class="no">${i+1}</span><span class="nm">${entryName(w.key,m)}${orig.has(w.key)?'':` <span class="hint">（遞補，原第 ${w.rank} 順位）</span>`}</span><span class="sc mono">${w.score.slice(0,16)}…</span></li>`).join('');
 $('repl').innerHTML=ap.replacements.length?'<b>遞補紀錄：</b><br>'+ap.replacements.map(x=>`第 ${x.removed_rank} 順位 ${entryName(x.removed_key,m)}（${esc(x.reason)}）→ 第 ${x.replaced_by_rank??'—'} 順位 ${x.replaced_by_key?entryName(x.replaced_by_key,m):'（無人可遞補）'}`).join('<br>'):'';
 $('meta').innerHTML=`抽獎時間：${d.time}（台北時間 UTC+8）<br>有效名單 ${d.keys.length} 筆｜名單雜湊 <span class="mono">${d.list_hash.slice(0,16)}…</span><br>種子：${esc(d.seed)}`;
 const win=new Set(ap.winners.map(w=>w.key));
 $('ranking').innerHTML=d.ranking.slice(0,d.n+10).map(r=>`<div class="rk ${gone.has(r.key)?'out':win.has(r.key)?'win':''}"><span>#${r.rank}</span><span style="flex:1">${entryName(r.key,m)}</span><span class="mono hint">${r.score.slice(0,12)}…</span>${win.has(r.key)?`<button data-k="${esc(r.key)}" data-r="同一人重複參加">同一人</button><button data-k="${esc(r.key)}" data-r="放棄／無法聯繫">放棄</button>`:''}</div>`).join('');
 $('ranking').querySelectorAll('button').forEach(b=>b.onclick=()=>{d.removals.push({key:b.dataset.k,reason:b.dataset.r});renderDraw();});}
function record(){const d=ST.draw,s=ST.snap,ap=applyReplacements(d.ranking,d.n,d.removals);const ent=k=>splitEntry(k).map(x=>{const p=s.platforms[x.platform],e=p.entries.find(y=>y.key===x.key);return{platform:x.platform,key:x.key,name:e.name,comment_id:e.comment_id,created_time:e.created_time};});
 return{campaign:CAMPAIGN,timestamp:d.time+' (台北時間 UTC+8)',platform:d.platform,seed:d.seed,winner_count:d.n,valid_count:d.keys.length,list_hash_sha256:d.list_hash,snapshot_sha256:s.snapshot_sha256,
  identity:{FB:'from.id（顯示名稱另列）',IG:'normalized username'},filters:s.filters,sources:Object.fromEntries(Object.entries(s.platforms).map(([P,v])=>[P,v.source])),merges:d.merges,
  algorithm:'score = SHA-256(seed + "|" + platform + "|" + key)；標準名單 = key 依 Unicode 碼位排序、\\n 串接；依 score 升冪取前 N 名（與 index.html / verify.py 相同）',
  winners:ap.winners.map((w,i)=>({position:i+1,rank:w.rank,key:w.key,score:w.score,accounts:ent(w.key)})),replacements:ap.replacements,canonical_list:d.keys,
  valid_entries:Object.fromEntries(Object.entries(s.platforms).map(([P,v])=>[P,v.entries.map(e=>({key:e.key,name:e.name,comment_id:e.comment_id,created_time:e.created_time}))]))};}
function exportCSV(r,m){const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';const nm=n=>m?maskName(n||''):n;
 let s=[['campaign',r.campaign],['timestamp',r.timestamp],['platform',r.platform],['seed',r.seed],['valid_count',r.valid_count],['list_hash_sha256',r.list_hash_sha256],['snapshot_sha256',r.snapshot_sha256]].map(x=>x.map(q).join(',')).join('\n');
 s+='\n\nposition,rank,key,names,comment_ids,score\n'+r.winners.map(w=>[w.position,w.rank,w.key,w.accounts.map(a=>nm(a.name)).join(' + '),w.accounts.map(a=>a.comment_id).join(' + '),w.score].map(q).join(',')).join('\n');
 s+='\n\nreplacements\nremoved_rank,removed_key,reason,replaced_by_rank,replaced_by_key\n'+r.replacements.map(x=>[x.removed_rank,x.removed_key,x.reason,x.replaced_by_rank,x.replaced_by_key].map(q).join(',')).join('\n');
 for(const[P,es]of Object.entries(r.valid_entries))s+=`\n\nvalid_entries_${P}\nkey,name,comment_id,created_time\n`+es.map(e=>[e.key,nm(e.name),e.comment_id,e.created_time].map(q).join(',')).join('\n');return s;}
function exportTxt(r,m){const nm=n=>m?maskName(n||''):n;return `${r.campaign}\n時間：${r.timestamp}\n平台：${r.platform}\n有效：${r.valid_count}\n名單雜湊：${r.list_hash_sha256}\n快照雜湊：${r.snapshot_sha256}\n種子：${r.seed}\n演算法：${r.algorithm}\n比對鍵：FB=from.id，IG=正規化帳號\n\n得獎者：\n${r.winners.map(w=>`${w.position}. ${w.accounts.map(a=>a.platform+' '+nm(a.name)).join(' + ')}（第 ${w.rank} 順位）${w.score}`).join('\n')}\n${r.replacements.length?'\n遞補：\n'+r.replacements.map(x=>`第 ${x.removed_rank} 順位 ${x.removed_key}（${x.reason}）→ 第 ${x.replaced_by_rank} 順位 ${x.replaced_by_key}`).join('\n')+'\n':''}\n驗證：python3 verify.py list.txt "${r.seed}" ${r.platform} ${r.winner_count}\n\n標準名單（存成 list.txt）：\n${r.canonical_list.join('\n')}\n`;}

// ===== 綁定 =====
function init(){$('appIdShow').textContent=MOCK?'（模擬模式）':APP_ID;$('verShow').textContent=GRAPH_VERSION;$('kw').value=DEFAULT_ALIASES.join('\n');
 $('permTable').innerHTML=SCOPES.map(s=>`<tr><td><code>${s}</code></td><td>${PERMS[s]}</td></tr>`).join('');
 $('loginBtn').onclick=login;$('logoutBtn').onclick=logout;$('pageSel').onchange=pickPage;$('fbLoad').onclick=loadFB;$('igLoad').onclick=loadIG;$('applyBtn').onclick=applyFilter;
 document.querySelectorAll('#srcCard .tabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#srcCard .tabs button').forEach(x=>x.classList.toggle('on',x===b));$('srcFB').classList.toggle('hidden',b.dataset.s!=='FB');$('srcIG').classList.toggle('hidden',b.dataset.s!=='IG');});
 document.querySelectorAll('#modeTabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#modeTabs button').forEach(x=>x.classList.toggle('on',x===b));ST.mode=b.dataset.m;$('nWin').value=ST.mode==='ALL'?10:5;renderSim();});
 $('snapBtn').onclick=async()=>{ST.snap=await buildSnapshot();showSnap();};
 $('snapDl').onclick=()=>dl('luchinshu_snapshot_'+ST.snap.snapshot_sha256.slice(0,8)+'.json',JSON.stringify(ST.snap,null,2),'application/json');
 $('snapIn').onchange=async e=>{$('snapErr').textContent='';const f=e.target.files[0];if(!f)return;try{const s=JSON.parse((await f.text()).replace(/^\uFEFF/,''));await verifySnap(s);ST.snap=s;showSnap();}catch(err){$('snapErr').textContent='匯入失敗：'+err.message;}};
 $('drawBtn').onclick=doDraw;$('mask').onchange=()=>{renderSim();ST.draw&&renderDraw();};
 $('dlJson').onclick=()=>dl(`luchinshu_${ST.draw.platform}_draw.json`,JSON.stringify(record(),null,2),'application/json');
 $('dlCsv').onclick=()=>dl(`luchinshu_${ST.draw.platform}_draw.csv`,exportCSV(record(),$('mask').checked),'text/csv');
 $('dlTxt').onclick=()=>dl(`luchinshu_${ST.draw.platform}_draw.txt`,exportTxt(record(),$('mask').checked),'text/plain');
 if(MOCK){$('mockbar').classList.remove('hidden');installMock();}}

// ===== 模擬模式：替換 FB SDK 與 fetch（不連網）=====
function mockData(){const T=(d,h,m)=>`2026-10-${d}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00+0000`;
 const fbNames=['王小明','陳美麗','林大華','張阿姨愛吃糖','黃小琪','牛軋糖控','吳先生','月下弦音迷','李小芬','Strawberry Love','周杰倫粉','許小姐'];
 const msgs=['草莓夏威夷果牛軋糖！','我猜 草莓 夏威夷果 牛軋糖～','草莓夏威夷豆牛軋糖','草莓夏威夷果牛轧糖','ＳＯ　草莓夏威夷果牛軋糖','是太妃牛軋糖嗎','草莓夏威夷果牛軋糖 +1'];
 const fb=[];let i=0;fbNames.forEach((n,k)=>fb.push({id:'c'+(++i),from:{id:String(100200300+k),name:n},message:msgs[k%msgs.length],created_time:T(21+(k%4),2+k,k*3)}));
 fb.push({id:'c'+(++i),from:{id:'100200300',name:'王小明'},message:'再留一次 草莓夏威夷果牛軋糖',created_time:T(24,9,0)});
 fb.push({id:'c'+(++i),from:{id:'100200301',name:'陳美麗'},message:'草莓夏威夷果牛軋糖',created_time:T(25,16,30)}); // 台北 10/26 00:30 逾時
 fb.push({id:'c'+(++i),from:{id:'999000111',name:'盧琴樹 LUCHINSHU'},message:'答案是 草莓夏威夷果牛軋糖',created_time:T(22,1,0),parent:{id:'c1'}});
 fb.push({id:'c'+(++i),message:'草莓夏威夷果牛軋糖',created_time:T(22,3,0)}); // 無 from
 fb.push({id:'c'+(++i),from:{id:'100200399',name:'晚到的人'},message:'草莓夏威夷果牛軋糖',created_time:T(25,15,59)}); // 台北 23:59 → 有效
 const ig=['straw.berry.tw','moonstring_lover','candy_girl','taoyuan_foodie','nougat.daily','sweet_tooth88','lu_fan_01','strawberrylove','jiayi_eats','pink.mood'].map((u,k)=>({id:'i'+(k+1),username:u,text:k==4?'好想吃':msgs[k%msgs.length],timestamp:T(21+(k%4),5+k,0)}));
 ig.push({id:'i90',username:'Candy_Girl',text:'草莓夏威夷果牛軋糖 再一次',timestamp:T(23,1,0)});ig.push({id:'i91',username:'late_bird',text:'草莓夏威夷果牛軋糖',timestamp:T(26,1,0)});
 ig[0].replies={data:[{id:'r1',username:'luchinshu_official',text:'感謝參加 草莓夏威夷果牛軋糖',timestamp:T(22,0,0)},{id:'r2',username:'reply_only_fan',text:'草莓夏威夷果牛軋糖',timestamp:T(22,0,5)}]};
 return{fb,ig};}
function installMock(){const D=mockData();const page={id:'999000111',name:'盧琴樹 LUCHINSHU',access_token:'MOCK_PAGE_TOKEN',instagram_business_account:{id:'1784000',username:'luchinshu_official'}};
 const pg=(arr,u,size)=>{const off=+(u.searchParams.get('after')||0);const data=arr.slice(off,off+size);const next=off+size<arr.length?(()=>{const n=new URL(u);n.searchParams.set('after',off+size);return n.toString();})():undefined;return{data,paging:next?{next}:{}};};
 const svg=(c,t)=>'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="110"><rect width="200" height="110" fill="${c}"/><circle cx="150" cy="40" r="22" fill="#C6A15B"/><text x="12" y="90" font-size="16" fill="#FBF6EE">${t}</text></svg>`);
 window.__mockCalls=[];window.fetch=async url=>{const u=new URL(url);window.__mockCalls.push(u.hostname+u.pathname);if(u.hostname!=='graph.facebook.com')throw new Error('mock: blocked '+u.hostname);const p=u.pathname.replace(/^\/v[\d.]+/,'');let body;
  if(p==='/me')body={id:'1',name:'Ervin（模擬）'};else if(p==='/me/permissions')body={data:SCOPES.map(s=>({permission:s,status:'granted'}))};else if(p==='/me/accounts')body={data:[page]};
  else if(p==='/999000111/posts')body={data:[{id:'999000111_1',message:'【猜猜我是誰】這次的新品是什麼口味？留言猜中就有機會抽中！',created_time:'2026-10-20T04:00:00+0000',full_picture:svg('#5C2331','猜猜我是誰')},{id:'999000111_2',message:'中秋感謝祭',created_time:'2026-09-10T04:00:00+0000',full_picture:svg('#3D1722','中秋')}]};
  else if(p==='/1784000/media')body={data:[{id:'1801',caption:'猜猜我是誰 🍓',timestamp:'2026-10-20T04:00:00+0000',media_url:svg('#5C2331','IG 猜猜我是誰'),permalink:'https://www.instagram.com/p/ABC123/',comments_count:D.ig.length}]};
  else if(p==='/999000111_1/comments'){const top=u.searchParams.get('filter')==='toplevel';body=pg(top?D.fb.filter(c=>!c.parent):D.fb,u,5);}
  else if(p==='/1801/comments'){const rep=(u.searchParams.get('fields')||'').includes('replies');body=pg(D.ig.map(c=>rep?c:{...c,replies:undefined}),u,4);}
  else body={error:{code:100,message:'Unsupported mock path '+p}};
  return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}});};
 window.FB={init(){},login(cb){cb({authResponse:{accessToken:'MOCK_USER_TOKEN'}});},logout(cb){cb&&cb();}};}
if(typeof document!=='undefined')init();
