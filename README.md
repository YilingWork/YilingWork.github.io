# 蔡懿玲 個人網頁 — 正式版（GitHub Pages 可直接部署）

這個 `site/` 資料夾就是可上線的完整網站。

## 內容
```
site/
├── index.html      ← 完整獨立網頁（頭像等圖片已內嵌，可離線開啟）
└── slides/         ← 5 份演講簡報 PDF（演講區塊的「📊 簡報」按鈕連到這裡）
    ├── 2025-03-28-raps-2024-congress.pdf
    ├── 2025-07-26-raps-2024-global-trends.pdf
    ├── 2025-08-08-elderly-integrated-care.pdf
    ├── 2025-11-23-pediatric-orphan-gene-therapy.pdf
    └── 2026-04-24-us-eu-ai-regulatory.pdf
```

## 本機預覽
直接用瀏覽器打開 `index.html` 即可（雙擊或拖進瀏覽器）。

## 部署到 GitHub Pages（步驟）

1. 在 GitHub 建一個**公開** repo（Pages 免費版需公開），例如 `personal-website` 或 `yilingtsai.github.io`。
2. 把 **`site/` 資料夾裡的內容**（`index.html` 與 `slides/`）放到 repo 根目錄，推上去：
   ```bash
   cd site
   git init
   git add .
   git commit -m "個人網頁上線"
   git branch -M main
   git remote add origin https://github.com/<你的帳號>/<repo名>.git
   git push -u origin main
   ```
3. GitHub repo → **Settings → Pages** → Source 選 `Deploy from a branch` → Branch 選 `main` / `/ (root)` → Save。
4. 等 1–2 分鐘，網址會是：
   - 若 repo 名為 `<帳號>.github.io` → `https://<帳號>.github.io`
   - 其他 repo 名 → `https://<帳號>.github.io/<repo名>/`

> 💡 若用 `yilingtsai.github.io` 這種 repo 名，網址最短、最像個人官網。

## 更新內容
- 改文字／新增演講：直接編輯 `index.html` 對應段落，重新 push 即可。
- 新增簡報：把 PDF 放進 `slides/`，在對應演講的 `📊 簡報` 連結指到新檔名。
- 換頭像：圖片是內嵌 base64；要換的話請 AI 重新產生 `index.html`。

## 待辦（來自資料蒐集清單）
- ⚠️ 指導學生的**碩士論文英文題目**待你校正後更新。
- 之後簡報累積更多，再另開獨立「簡報庫」頁面。
