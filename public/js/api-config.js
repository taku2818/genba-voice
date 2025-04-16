// API設定ファイル

// 環境に応じたベースURLを設定
const getBaseUrl = () => {
  // 本番環境（Render）とローカル環境を自動判別
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return ''; // ローカル環境では相対パスを使用
  } else {
    return ''; // 本番環境でも相対パスでOK（同一オリジン）
  }
};

// APIのベースURL
const API_BASE_URL = getBaseUrl();

// API関数をエクスポート
const API = {
  // APIエンドポイントURLを生成
  endpoint: (path) => `${API_BASE_URL}${path}`,
  
  // GET リクエスト
  get: async (path) => {
    const response = await fetch(API.endpoint(path));
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return response.json();
  },
  
  // POST リクエスト
  post: async (path, data) => {
    const response = await fetch(API.endpoint(path), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return response.json();
  },
  
  // ファイルアップロード用POST
  upload: async (path, formData) => {
    const response = await fetch(API.endpoint(path), {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return response.json();
  }
};
