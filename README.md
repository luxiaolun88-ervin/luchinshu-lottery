# 鹿琴書 抽獎工具

社群留言抽獎的純前端網頁工具，所有運算都在瀏覽器內完成，不上傳資料。

- 抽獎主頁：[index.html](https://luxiaolun88-ervin.github.io/luchinshu-lottery/index.html)
- Meta（FB/IG）授權讀取留言：[auth.html](https://luxiaolun88-ervin.github.io/luchinshu-lottery/auth.html)（設定方式見 META-SETUP.md）

## 驗證抽獎結果

抽獎結果可用種子重現。安裝 Python 3 後執行：

```
python3 verify.py list.txt "<種子>" FB 5   （合併抽：python3 verify.py fb.txt "<種子>" ALL 5 ig.txt）
```

可參考 `sample.txt` 範例名單，依網頁顯示的種子與名單比對結果是否一致。
