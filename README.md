# Gemini API Key Pool Worker

這是一個部署在 Cloudflare Workers 上的腳本，作為 Google Gemini API 的代理和負載平衡器。它管理一組 Gemini API 金鑰，根據使用情況將請求分發到不同的金鑰，並能處理來自 Gemini API 的速率限制錯誤，同時確保金鑰安全。

**此腳本非常簡單，並未進行嚴格的安全性檢查，建議僅供個人使用。**


## 功能

*   支援多個 Gemini API 金鑰，並代理請求至 Google Gemini API。
*   使用 Cloudflare KV 追蹤每個金鑰的使用情況（請求次數和最後使用時間）。
*   為每個請求選擇使用次數最少的金鑰，實現負載平衡。
*   當收到 429 (Too Many Requests) 錯誤時，自動切換到下一個可用金鑰並重試。


## 專案結構

```
.
├── .gitignore         # Git 忽略檔案列表
├── README.md          # 專案說明文件
├── package.json       # Node.js 專案設定檔
├── wrangler.toml      # Cloudflare Worker 設定檔
└── worker.js          # Worker 主要程式碼
```

## 前置準備

1.  **安裝 Node.js 與 npm/yarn:** 如果您尚未安裝，請先安裝 Node.js (包含 npm)。
2.  **安裝 Wrangler CLI:** Wrangler 是 Cloudflare Workers 的官方命令列工具。
    ```bash
    npm install -g wrangler
    # 或使用 yarn
    # yarn global add wrangler
    ```
3.  **登入 Wrangler:**
    ```bash
    wrangler login
    ```

## 設定

1.  **`wrangler.toml` 設定:**
    *   開啟 `wrangler.toml` 檔案。
    *   **`account_id`**: 將 `YOUR_ACCOUNT_ID_HERE` 替換為您的 Cloudflare Account ID。您可以從 Cloudflare 儀表板找到它。
    *   **`kv_namespaces`**:
        *   在 Cloudflare 儀表板中建立一個 KV Namespace。
        *   將 `YOUR_KV_NAMESPACE_ID_HERE` 替換為您建立的 KV Namespace 的 ID。綁定名稱應保持為 `KV_BINDING`，與 `worker.js` 中的設定一致。

2.  **環境變數 (Secrets):**
    為了安全性，`AUTH_KEY` 和 `API_KEYS` 應設定為 Worker 的 secrets。請勿將它們直接寫入 `wrangler.toml`。
    *   **`AUTH_KEY`**: 用戶端呼叫此 Worker 時必須提供的秘密金鑰。
        ```bash
        wrangler secret put AUTH_KEY
        ```
        (依照提示輸入您的金鑰)
    *   **`API_KEYS`**: 您的 Google Gemini API 金鑰列表，每行一個金鑰。
        ```bash
        wrangler secret put API_KEYS
        ```
        (依照提示輸入您的金鑰，例如 `key1\nkey2\nkey3`)

## 本地開發

您可以使用 Wrangler 在本地執行和測試您的 Worker：

```bash
npm run dev
# 或
# yarn dev
```
Wrangler 會啟動一個本地伺服器。您可能需要在 `wrangler.toml` 的 `[dev.vars]` 部分設定本地開發用的環境變數。

## 部署

1.  **部署 Worker:**
    ```bash
    npm run deploy
    # 或
    # yarn deploy
    ```
    此命令會將您的 Worker 部署到 Cloudflare 網路。

## 使用方式

要透過此 Worker 呼叫 Google Gemini API，請依照以下步驟設定您的 SDK 或客戶端應用程式：

1. **設定 Base URL**  
   - **Gemini Base URL:** `https://your-worker.your-domain.workers.dev`  
   - **OpenAI 相容性:** `https://your-worker.your-domain.workers.dev/v1beta/openai`

2. **設定 API Key**  
   - 請填入您在 Worker 環境變數 `AUTH_KEY` 中設定的金鑰，以驗證使用權限。

其他設定與正常呼叫 Google Gemini API 相同。此 Worker 會自動選擇可用的 Gemini API 金鑰並轉發請求。
