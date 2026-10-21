# 盧琴樹 授權版抽獎頁：Meta 開發者 App 設定步驟（給 Ervin）

> 目標：建立一個只給自己（和小編）用的 Meta App，讓 `auth.html` 能用 Facebook 登入，讀取「盧琴樹」粉專與連結 IG 的貼文留言。
> App **維持開發模式（Development）**，只有 App 裡有角色的人可以登入，所以**不需要送 App 審查**。
> 預計網址：`https://luxiaolun88-ervin.github.io/luchinshu-lottery/auth.html`（GitHub Pages，帳號 luxiaolun88-ervin）。
>
> 本文件依 2026-10 查到的 Meta 官方文件與近期教學整理。Meta 後台介面常改版，**選單名稱可能和畫面不完全一樣**，有不確定的地方會標「⚠️待確認」。

---

## 0. 事前確認
1. 你的個人 FB 帳號是「盧琴樹」粉專的管理者（有完整控制權或「任務」存取權）。
2. **IG 必須是專業帳號（商業或創作者）並且連結到這個粉專**：
   - IG App → 設定 → 帳號類型與工具 → 切換為專業帳號。
   - 連結方式：在 Meta Business Suite（business.facebook.com）→ 設定 → 帳號 → Instagram 帳號 → 連結；或在粉專設定的「已連結的帳號」連結。
   - 驗證方式：登入 auth.html 後，「Instagram 專業帳號」欄位會顯示 @帳號；若顯示「未連結」，代表 API 看不到連結（`instagram_business_account` 為空）。
3. 已註冊 Meta 開發者帳號：到 <https://developers.facebook.com/> 用你的 FB 帳號登入，第一次會要求「註冊成為開發者」（需驗證電話或信用卡之一）。

## 1. 建立 App
1. 開啟 <https://developers.facebook.com/apps> → 按「**建立應用程式（Create App）**」。
2. 填入 App 名稱（例：`盧琴樹 抽獎工具`）與聯絡信箱。
3. **選擇使用案例（Use case）**：選「**管理粉絲專頁上的所有內容（Manage everything on your Page）**」。
   - 此使用案例預設包含 `pages_show_list`、`business_management`、`public_profile`，並使用 **Facebook Login for Business**。
   - 若之後要讀 IG 留言，需同時加入 Instagram 相關使用案例 ⚠️待確認：目前 Meta 有兩種 IG API——「**Instagram API with Facebook Login**」（本工具用的是這個，透過粉專取得 IG 帳號）與「Instagram API with Instagram Login」（不適用）。請在「新增使用案例」中選擇「**管理 Instagram 上的訊息和內容**」並選 **透過 Facebook 登入（with Facebook Login）** 的版本。
4. 如被問到「連結企業管理平台（Business portfolio）」：選盧琴樹／鷹速國際的企業管理平台；沒有也可以先跳過。
   - 舊版流程會問「應用程式類型」，請選「**商家（Business）**」。

## 2. 加入權限
在左側「**使用案例（Use cases）**」→ 該使用案例按「**自訂（Customize）**」→「權限與功能（Permissions and features）」，把以下權限按「新增」：

| 權限 | 用途 |
|---|---|
| `pages_show_list` | 列出你管理的粉專 |
| `pages_read_engagement` | 讀粉專貼文列表、縮圖 |
| `pages_read_user_content` | 讀粉絲留言（含留言者） |
| `pages_manage_metadata` | 留言相關依賴權限（若後台沒列出可略過，⚠️待確認是否必要） |
| `business_management` | 粉專在企業管理平台底下時才看得到 |
| `instagram_basic` | 讀 IG 帳號與貼文 |
| `instagram_manage_comments` | 讀 IG 留言（本工具只讀不寫） |

開發模式下，有角色的人使用這些權限**不需審查**（Standard Access 即可）。

## 3. 設定 Facebook 登入
左側「**Facebook Login for Business → 設定（Settings）**」（若用的是一般 Facebook 登入，則為「Facebook 登入 → 設定」）：
1. **用 JavaScript SDK 登入（Login with the JavaScript SDK）**：開啟「是」。
2. **JavaScript SDK 允許的網域（Allowed Domains for the JavaScript SDK）**：填 `https://luxiaolun88-ervin.github.io/`
3. **有效的 OAuth 重新導向 URI（Valid OAuth Redirect URIs）**：填 `https://luxiaolun88-ervin.github.io/luchinshu-lottery/auth.html`（JS SDK 彈窗登入通常不需要，但填上無害）。
4. 「用戶端 OAuth 登入」「網頁 OAuth 登入」「強制使用 HTTPS」保持開啟。
5. ⚠️待確認：Facebook Login for Business 可能要求建立「**設定（Configuration）**」並取得 **Configuration ID**。若登入時出現「Invalid Scopes」或要求 config_id：在「Facebook Login for Business → 設定（Configurations）」建立一組，選「使用者存取權杖」、勾選上表權限與盧琴樹粉專，把產生的 ID 填到 `auth.js` 的 `META_LOGIN_CONFIG_ID`。

## 4. App 基本設定
「**應用程式設定（App settings）→ 基本資料（Basic）**」：
1. **應用程式網域（App Domains）**：`luxiaolun88-ervin.github.io`
2. **隱私政策網址**：可填官網隱私權頁（例：https://luchinshu.com 的隱私權頁）。開發模式通常非必填，但有些功能會要求。
3. 往下「**新增平台（Add platform）→ 網站（Website）**」，網站網址填 `https://luxiaolun88-ervin.github.io/luchinshu-lottery/`
4. **App ID（應用程式編號）** 就在這一頁最上方（也顯示在後台左上角 App 名稱下方）。**App 密鑰（App Secret）不需要，也不要放進網頁。**

## 5. 保持開發模式並加入角色
1. 後台上方的「**應用程式模式**」維持「**開發（Development）**」，**不要切換為上線（Live）**。
2. 左側「**應用程式角色（App roles）→ 角色（Roles）**」：你自己建立 App 就是管理員。要讓小編也能用：按「新增人員」→ 選「測試人員（Tester）」或「開發者」→ 輸入小編的 FB 帳號，小編需到 <https://developers.facebook.com/requests> 接受邀請（小編也要先註冊開發者帳號）。
3. 小編本人也必須是盧琴樹粉專的管理者，才會在 `/me/accounts` 看到粉專。

## 6. 填入 App ID 並測試
1. 編輯 `auth.js` 最上方：`const META_APP_ID = '你的App編號';`（或暫時用 `auth.html?appId=你的App編號`）。
2. 推到 GitHub Pages（**目前尚未發布，需你決定 repo 名稱後再推**），用 https 開啟 `https://luxiaolun88-ervin.github.io/luchinshu-lottery/auth.html`。
3. 按「使用 Facebook 登入」→ 在彈窗中**勾選盧琴樹粉專與 IG 帳號**、所有權限都保持開啟。
4. 本機測試可用 `auth.html?mock=1`（假資料，不連 Facebook）。

## 7. 已知限制與注意事項
- **留言者資訊（`from`）可能缺少** ⚠️重要：Meta 對粉專留言的留言者姓名／ID 有限制，部分案例回報在 Standard Access 下 `from` 不回傳。若實際登入後發現大量「無帳號資訊」，代表需要 Advanced Access（需商家驗證＋App 審查），此時建議改用 `index.html` 手動貼名單抽獎。**請在正式活動前先用自己的測試留言驗證。**
- FB 留言的 `from.id` 是「針對此 App 的使用者 ID」，同一人在不同 App 的 ID 不同，但在本工具中穩定，適合做抽獎比對鍵。
- 用 pfbid 開頭的貼文網址無法換算 ID，請從貼文列表點選。
- IG 留言 API 只回傳專業帳號自己貼文的留言；被隱藏的留言可能不會出現。
- Graph API 版本設定為 `v26.0`（2026-07-29 發布）；每版至少支援兩年。
- 權杖只存在瀏覽器記憶體，關掉頁面即消失；頁面只連 `connect.facebook.net`（SDK）與 `graph.facebook.com`。

參考：developers.facebook.com/docs/pages-api、/docs/instagram-platform/instagram-api-with-facebook-login、/docs/facebook-login/facebook-login-for-business、/docs/development/build-and-test/app-modes、/docs/graph-api/changelog
