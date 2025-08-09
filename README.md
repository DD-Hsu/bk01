# 書籍資料庫（DD是我的貓）

## 特色
- 分類頁：預設**隨機**顯示、提供 Shuffle 與標題/年份/評分/新增時間排序、分類內搜尋。
- 詳情：封面、摘要、作者介紹、作者頭像、筆記連結。
- 結構：每本書獨立資料夾。

## 新增一本書
1. 建資料夾：`data/books/<書ID>/`（如 `bk-0123`）
2. 建 `meta.json`（必要）：id, title, author, author_bio, category（10 類之一）
3. 可選檔案：`cover.jpg`、`author.jpg`、`notes.md`
4. 重新產生索引：`node scripts/build_index.mjs`
5. 重新整理頁面。

## 更換分類圖示
- 圖片位置：`assets/icons/<slug>.png`，10 個 slug 依序為：
  art-design / sound-music / mind-psych / philosophy-science / economy-society / language-expression / self-growth-design / senses-style / knowledge-civilization / innovation-problem
- 以同名檔案覆蓋即可（建議正方形 512×512 PNG）。
