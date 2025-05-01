# Gemini API Key Pool Worker

這是一個部署在 Cloudflare Workers 上的腳本，作為 Google Gemini API 的代理和負載平衡器。它管理一組 Gemini API 金鑰，根據使用情況將請求分發到不同的金鑰，並能處理來自 Gemini API 的速率限制錯誤，同時確保金鑰安全。

**此腳本非常簡單，並未進行嚴格的安全性檢查，建議僅供個人使用。**


## 功能

*   支援多個 Gemini API 金鑰，並代理請求至 Google Gemini API。
*   使用 Cloudflare KV 追蹤每個金鑰的使用情況（請求次數和最後使用時間）。
*   為每個請求選擇使用次數最少的金鑰，實現負載平衡。
*   當收到 429 (Too Many Requests) 錯誤時，自動切換到下一個可用金鑰並重試。


## 部署

1.  **部署 Worker:** 將 `worker.js` 部署到您的 Cloudflare Workers。
2.  **建立 KV Namespace:** 在 Cloudflare 儀表板中建立一個 KV Namespace。
3.  **綁定 KV Namespace:** 將您建立的 KV Namespace 綁定到此 Worker。腳本中預設的綁定名稱是 `KV_BINDING`。您需要在 Worker 的設定中確保綁定名稱一致。
4.  **設定環境變數:** 在 Cloudflare Worker 的設定頁面中設定以下環境變數：
    *   `VALID_API_KEY`: (必需) 用戶端呼叫此 Worker 時必須提供的秘密金鑰。這是對 Worker 本身的訪問控制。
    *   `API_KEYS`: (必需) 您的 Google Gemini API 金鑰列表，以逗號分隔 (例如 `key1,key2,key3`)。Worker 將使用這些金鑰向 Google 發送請求。
    *   `KV_BINDING`: (必需) 您綁定到此 Worker 的 KV Namespace 的名稱。


## 使用方式

要透過此 Worker 呼叫 Google Gemini API，請依照以下步驟設定您的 SDK 或客戶端應用程式：

1. **設定 Base URL**  
   - **Gemini Base URL:** `https://your-worker.your-domain.workers.dev`  
   - **OpenAI 相容性:** `https://your-worker.your-domain.workers.dev/v1beta/openai`

2. **設定 API Key**  
   - 請填入您在 Worker 環境變數 `VALID_API_KEY` 中設定的金鑰，以驗證使用權限。

其他設定與正常呼叫 Google Gemini API 相同。此 Worker 會自動選擇可用的 Gemini API 金鑰並轉發請求。
