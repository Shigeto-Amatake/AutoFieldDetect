// Service worker for handling OpenAI API requests
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user

let apiKey = null;

// Initialize API key from storage
async function initializeApiKey() {
  try {
    const result = await chrome.storage.local.get(['openaiApiKey']);
    apiKey = result.openaiApiKey;
    console.log(apiKey ? 'API key loaded successfully' : 'No API key found in storage');
  } catch (error) {
    console.error('Failed to load API key:', error);
  }
}

// Initialize on service worker startup
initializeApiKey();

// Update API key when changed
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.openaiApiKey) {
    apiKey = changes.openaiApiKey.newValue;
    console.log('API key updated');
  }
});

// Handle API errors
function handleApiError(status, data = {}) {
  const errorMessages = {
    401: 'APIキーが無効です。設定を確認してください。',
    429: 'API利用制限に達しました。しばらく待ってから再試行してください。',
    500: 'OpenAI APIサーバーエラーが発生しました。',
    503: 'OpenAI APIサービスが一時的に利用できません。'
  };
  
  return new Error(errorMessages[status] || data.error?.message || 'APIリクエストに失敗しました。');
}

// Main message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'ANALYZE_FIELDS') {
    analyzeFormFields(request.data)
      .then(sendResponse)
      .catch(error => {
        console.error('Analysis error:', error);
        sendResponse({ error: error.message });
      });
    return true;
  }
});

// Analyze form fields using OpenAI API
async function analyzeFormFields(fields) {
  if (!apiKey) {
    throw new Error('OpenAI APIキーが設定されていません。設定画面でAPIキーを登録してください。');
  }

  try {
    const systemPrompt = `
      あなたはフォームフィールドの分析の専門家です。
      以下のフィールド情報を分析し、各フィールドの目的を特定してください。
      結果は以下のJSON形式で返してください：
      {
        "fieldId": "推測された目的（姓、名、メールアドレス等）"
      }
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `フォームフィールド情報：${JSON.stringify(fields, null, 2)}` 
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw handleApiError(response.status, errorData);
    }

    const result = await response.json();
    const analysis = JSON.parse(result.choices[0].message.content);
    
    return JSON.stringify(addConfidenceScores(analysis, fields));
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error;
  }
}

// Add confidence scores to the analysis results
function addConfidenceScores(analysis, fields) {
  const enhanced = {};
  Object.entries(analysis).forEach(([fieldId, purpose]) => {
    const field = fields.find(f => f.id === fieldId);
    enhanced[fieldId] = {
      purpose,
      confidence: calculateConfidence(purpose, field)
    };
  });
  return enhanced;
}

// Calculate confidence score for field matching
function calculateConfidence(purpose, field) {
  if (!field) return 0.5;
  
  let score = 0;
  const purposeLower = purpose.toLowerCase();
  
  if (field.label?.toLowerCase().includes(purposeLower)) score += 0.3;
  if (field.placeholder?.toLowerCase().includes(purposeLower)) score += 0.2;
  if (field.ariaLabel?.toLowerCase().includes(purposeLower)) score += 0.2;
  if (field.surroundingText?.toLowerCase().includes(purposeLower)) score += 0.1;
  
  return Math.min(1, score + 0.2); // Base confidence of 0.2
}
