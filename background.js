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

    analyzeFields(request.data)
      .then(result => sendResponse({ result }))
      .catch(error => {
        console.error('Analysis error:', error);
        sendResponse({ error: error.message });
      });
    return true;
  }
});

// Analyze form fields using OpenAI API
async function analyzeFields(fields) {
  const systemPrompt = `
    あなたはフォームフィールドの分析の専門家です。
    以下のフィールド情報を分析し、各フィールドの目的を特定してください。
    結果は以下のJSON形式で返してください：
    {
      "fieldId": "推測された目的（姓、名、メールアドレス等）"
    }
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
          },
          { 
            role: "user", 
            content: `フォームフィールド情報：${JSON.stringify(fields, null, 2)}` 
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

    const analysis = JSON.parse(result.choices[0].message.content);
    return enhanceAnalysis(analysis, fields);
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error;
  }
}

// Enhance analysis with confidence scores
function enhanceAnalysis(analysis, fields) {
  const enhanced = {};
  Object.entries(analysis).forEach(([fieldId, purpose]) => {
    const field = fields.find(f => f.id === fieldId);
    if (field) {
      enhanced[fieldId] = {
        purpose,
        confidence: calculateConfidence(field, purpose)
      };
    }
  });
  return enhanced;
}

// Calculate confidence score
function calculateConfidence(field, purpose) {
  let score = 0.2; // Base confidence
  const purposeLower = purpose.toLowerCase();

  // Check for matches in field attributes
  const matches = {
    label: 0.3,
    placeholder: 0.2,
    ariaLabel: 0.2,
    surroundingText: 0.1
  };

  Object.entries(matches).forEach(([attr, weight]) => {
    if (field[attr]?.toLowerCase().includes(purposeLower)) {
      score += weight;
    }
  });

  return Math.min(1, score);
}
