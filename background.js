// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
import { OpenAIUtil } from './utils/openai.js';
import { StorageUtil } from './utils/storage.js';

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'ANALYZE_FIELDS') {
    handleAnalyzeFields(request.data)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
});

async function handleAnalyzeFields(fields) {
  try {
    const apiKey = await StorageUtil.getApiKey();
    if (!apiKey) {
      throw new Error('OpenAI API keyが設定されていません。設定画面でAPIキーを登録してください。');
    }
    const openaiUtil = new OpenAIUtil(apiKey);
    
    const systemPrompt = `
    あなたはフォームフィールドの分析の専門家です。
    与えられたフォームフィールドの情報を分析し、各フィールドの目的を特定してください。
    以下のような項目に特に注目してください：
    - ラベルテキスト
    - プレースホルダー
    - aria-label
    - 周辺のテキスト
    - フィールドID/名前

    結果は以下のようなJSON形式で返してください：
    {
      "fieldId1": "推測された目的（例：姓、名、メールアドレス等）",
      "fieldId2": "推測された目的"
    }`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `以下のフォームフィールドを分析してください：\n${JSON.stringify(fields, null, 2)}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    const analysis = JSON.parse(response.choices[0].message.content);
    
    // Add confidence scores
    const enhancedAnalysis = {};
    for (const [fieldId, purpose] of Object.entries(analysis)) {
      enhancedAnalysis[fieldId] = {
        purpose,
        confidence: calculateConfidence(purpose, fields.find(f => f.id === fieldId))
      };
    }
    
    return JSON.stringify(enhancedAnalysis);
  } catch (error) {
    console.error('Field Analysis Error:', error);
    throw error;
  }
}

function calculateConfidence(purpose, fieldInfo) {
  if (!fieldInfo) return 0.5;
  
  let score = 0;
  const purposeLower = purpose.toLowerCase();
  
  // Check label match
  if (fieldInfo.label && fieldInfo.label.toLowerCase().includes(purposeLower)) {
    score += 0.3;
  }
  
  // Check placeholder match
  if (fieldInfo.placeholder && fieldInfo.placeholder.toLowerCase().includes(purposeLower)) {
    score += 0.2;
  }
  
  // Check aria-label match
  if (fieldInfo.ariaLabel && fieldInfo.ariaLabel.toLowerCase().includes(purposeLower)) {
    score += 0.2;
  }
  
  // Check surrounding text match
  if (fieldInfo.surroundingText && fieldInfo.surroundingText.toLowerCase().includes(purposeLower)) {
    score += 0.1;
  }
  
  return Math.min(1, score + 0.2); // Base confidence of 0.2
}
