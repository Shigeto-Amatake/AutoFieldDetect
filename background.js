import OpenAIUtil from './utils/openai.js';
import StorageUtil from './utils/storage.js';

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
    const analysis = await openaiUtil.analyzeFields(fields);
    
    // Add confidence scores to the analysis
    const enhancedAnalysis = openaiUtil.enhanceAnalysisResults(analysis);
    
    return JSON.stringify(enhancedAnalysis);
  } catch (error) {
    console.error('Field Analysis Error:', error);
    throw error;
  }
}
