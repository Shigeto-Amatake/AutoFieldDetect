// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user

let openaiUtil = null;
let storageUtil = null;

// Initialize utilities
async function initializeUtils() {
  try {
    const { OpenAIUtil } = await import(chrome.runtime.getURL('utils/openai.js'));
    const { StorageUtil } = await import(chrome.runtime.getURL('utils/storage.js'));
    
    storageUtil = StorageUtil;
    const apiKey = await storageUtil.getApiKey();
    
    if (apiKey) {
      openaiUtil = new OpenAIUtil(apiKey);
      console.log('OpenAI utility initialized successfully');
    } else {
      console.warn('No API key found in storage');
    }
  } catch (error) {
    console.error('Failed to initialize utilities:', error);
  }
}

// Initialize on service worker startup
initializeUtils().catch(console.error);

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'ANALYZE_FIELDS') {
    handleAnalyzeFields(request.data)
      .then(sendResponse)
      .catch(error => {
        console.error('Analysis error:', error);
        sendResponse({ error: error.message });
      });
    return true;
  }
});

async function handleAnalyzeFields(fields) {
  try {
    if (!openaiUtil) {
      const apiKey = await storageUtil.getApiKey();
      if (!apiKey) {
        throw new Error('OpenAI API keyが設定されていません。設定画面でAPIキーを登録してください。');
      }
      const { OpenAIUtil } = await import(chrome.runtime.getURL('utils/openai.js'));
      openaiUtil = new OpenAIUtil(apiKey);
    }
    
    const analysis = await openaiUtil.analyzeFields(fields);
    
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
