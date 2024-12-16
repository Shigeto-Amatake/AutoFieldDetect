// Service worker for handling OpenAI API requests
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user

let apiKey = null;

// Initialize API key from storage
chrome.storage.local.get(['openaiApiKey'], (result) => {
  apiKey = result.openaiApiKey;
  console.log(apiKey ? 'API key loaded successfully' : 'No API key found in storage');
});

// Update API key when changed
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.openaiApiKey) {
    apiKey = changes.openaiApiKey.newValue;
    console.log('API key updated');
  }
});

// Error messages mapping
const ERROR_MESSAGES = {
  401: 'APIキーが無効です。設定を確認してください。',
  429: 'API利用制限に達しました。しばらく待ってから再試行してください。',
  500: 'OpenAI APIサーバーエラーが発生しました。',
  503: 'OpenAI APIサービスが一時的に利用できません。'
};

// Main message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'ANALYZE_FIELDS') {
    if (!apiKey) {
      sendResponse({ 
        error: 'OpenAI APIキーが設定されていません。設定画面でAPIキーを登録してください。' 
      });
      return true;
    }

    analyzeFields(request.data.fields, request.data.keyValuePairs)
      .then(result => sendResponse({ result }))
      .catch(error => {
        console.error('Analysis error:', error);
        sendResponse({ error: error.message });
      });
    return true;
  }
});

// Analyze form fields using OpenAI API
async function analyzeFields(fields, keyValuePairs) {
  const systemPrompt = `
   あなたはフォームフィールド入力の専門家です。

   以下の情報をもとに、それぞれの入力フィールドに適切な値を入力するためのマッピングを作成してください。

   ユーザーのキーと値の一覧：
   ${JSON.stringify(keyValuePairs, null, 2)}

   ページ上のフィールド情報：
   ${JSON.stringify(fields, null, 2)}

   結果は以下のJSON形式で返してください：
   {
     "フィールドID": "入力すべき値"
   }

   注意点：
   - フィールドの目的とユーザーのキーをマッチングさせてください。
   - 適切な値が見つからない場合、そのフィールドを無視してください。
  `;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { 
            role: "system", 
            content: systemPrompt 
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        ERROR_MESSAGES[response.status] || 
        errorData.error?.message || 
        'APIリクエストに失敗しました。'
      );
    }

    const result = await response.json();
    if (!result.choices || !result.choices[0]?.message?.content) {
      throw new Error('OpenAI APIからの応答が不正です。');
    }

    const mappings = JSON.parse(result.choices[0].message.content);
    return mappings;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error;
  }
}
