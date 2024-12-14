let keyValuePairs = [];

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupEventListeners();
  // Add debug log element to the DOM (assuming a div with id 'debugLog' exists in the HTML)
  const debugLog = document.createElement('div');
  debugLog.id = 'debugLog';
  debugLog.style.height = '300px';
  debugLog.style.overflowY = 'scroll';
  document.body.appendChild(debugLog);

  // Move the auto-fill button to the top (assuming the button has id 'fillFields')
  const fillFieldsButton = document.getElementById('fillFields');
  if (fillFieldsButton) {
    document.body.insertBefore(fillFieldsButton, document.getElementById('apiKey').parentElement);
  }

});

function loadSettings() {
  chrome.storage.local.get(['keyValuePairs', 'openaiApiKey'], (result) => {
    if (result.openaiApiKey) {
      document.getElementById('apiKey').value = result.openaiApiKey;
    }

    if (result.keyValuePairs) {
      keyValuePairs = result.keyValuePairs;
    } else {
      // Set default key-value pairs
      keyValuePairs = [
        { key: '性', value: '' },
        { key: '名', value: '' },
        { key: 'メールアドレス', value: '' },
        { key: '電話番号', value: '' },
        { key: '〒', value: '' },
        { key: '住所１', value: '' },
        { key: '住所２', value: '' },
        { key: '住所３', value: '' }
      ];
    }
    renderKeyValuePairs();
  });
}

function setupEventListeners() {
  document.getElementById('saveApiKey').addEventListener('click', saveApiKey);
  document.getElementById('addPair').addEventListener('click', addKeyValuePair);
  document.getElementById('fillFields').addEventListener('click', fillFormFields);
}

function saveApiKey() {
  const apiKey = document.getElementById('apiKey').value;
  chrome.storage.local.set({ openaiApiKey: apiKey }, () => {
    if (chrome.runtime.lastError) {
      showStatus('APIキーの保存に失敗しました', 'error');
      logDebug('Error saving API key: ' + chrome.runtime.lastError.message);
    } else {
      showStatus('APIキーを保存しました', 'success');
      logDebug('API key saved successfully');
    }
  });
}

function addKeyValuePair() {
  if (keyValuePairs.length >= 20) {
    showStatus('最大20個までの項目しか登録できません', 'error');
    return;
  }

  keyValuePairs.push({ key: '', value: '' });
  saveKeyValuePairs();
  renderKeyValuePairs();
}

function renderKeyValuePairs() {
  const container = document.getElementById('keyValuePairs');
  container.innerHTML = '';

  keyValuePairs.forEach((pair, index) => {
    const pairDiv = document.createElement('div');
    pairDiv.className = 'key-value-pair';
    
    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.className = 'key-input';
    keyInput.value = pair.key;
    keyInput.placeholder = 'キー';
    keyInput.dataset.index = index;
    keyInput.addEventListener('change', (e) => updatePair(index, 'key', e.target.value));
    
    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.className = 'value-input';
    valueInput.value = pair.value;
    valueInput.placeholder = '値';
    valueInput.dataset.index = index;
    valueInput.addEventListener('change', (e) => updatePair(index, 'value', e.target.value));
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-button';
    deleteButton.textContent = '×';
    deleteButton.addEventListener('click', () => deletePair(index));
    
    pairDiv.appendChild(keyInput);
    pairDiv.appendChild(valueInput);
    pairDiv.appendChild(deleteButton);
    container.appendChild(pairDiv);
  });
}

function updatePair(index, field, value) {
  keyValuePairs[index][field] = value;
  saveKeyValuePairs();
  logDebug(`Updated ${field} for pair ${index} with value: ${value}`);
}

function deletePair(index) {
  keyValuePairs.splice(index, 1);
  saveKeyValuePairs();
  renderKeyValuePairs();
}

function saveKeyValuePairs() {
  chrome.storage.local.set({ keyValuePairs }, () => {
    if (chrome.runtime.lastError) {
      showStatus('設定の保存に失敗しました', 'error');
      logDebug('Error saving key-value pairs: ' + chrome.runtime.lastError.message);
    } else {
      logDebug('Key-value pairs saved successfully');
    }
  });
}

async function fillFormFields() {
  try {
    logDebug('Starting form field analysis...');
    
    // Get form fields from the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      throw new Error('アクティブなタブが見つかりません');
    }
    
    logDebug('Found active tab: ' + tab.url);
    
    // Scan fields in the current page
    logDebug('Scanning for form fields...');
    const response = await new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, { type: 'SCAN_FIELDS' }, (result) => {
        if (chrome.runtime.lastError) {
          resolve({ error: chrome.runtime.lastError.message });
        } else {
          resolve(result);
        }
      });
    });
    
    if (response.error) {
      throw new Error('コンテンツスクリプトとの通信に失敗しました: ' + response.error);
    }
    
    if (!response || !response.fields) {
      throw new Error('フォームフィールドの取得に失敗しました');
    }

    logDebug(`Found ${response.fields.length} form fields`);

    // Analyze fields using ChatGPT
    logDebug('Analyzing fields with ChatGPT...');
    const analysis = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ 
        type: 'ANALYZE_FIELDS', 
        data: response.fields 
      }, (result) => {
        if (chrome.runtime.lastError) {
          resolve({ error: chrome.runtime.lastError.message });
        } else {
          resolve(result);
        }
      });
    });

    if (analysis.error) {
      throw new Error(analysis.error);
    }

    // Map analyzed fields to stored values
    logDebug('Mapping fields to stored values...');
    const mappings = mapFieldsToValues(analysis.result, keyValuePairs);
    logDebug(`Created mappings for ${Object.keys(mappings).length} fields`);

    // Fill the form
    logDebug('Filling form fields...');
    await new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, { 
        type: 'FILL_FIELDS', 
        mappings 
      }, (result) => {
        if (chrome.runtime.lastError) {
          resolve({ error: chrome.runtime.lastError.message });
        } else {
          resolve(result);
        }
      });
    });

    logDebug('Form filling completed successfully');
    showStatus('フォームの入力が完了しました', 'success');
  } catch (error) {
    console.error('Form filling error:', error);
    logDebug('Error: ' + error.message);
    showStatus(error.message || '予期せぬエラーが発生しました', 'error');
  }
}

function mapFieldsToValues(analysis, keyValuePairs) {
  const mappings = {};
  Object.entries(analysis).forEach(([fieldId, field]) => {
    const matchingPair = keyValuePairs.find(pair => 
      field.purpose.toLowerCase().includes(pair.key.toLowerCase()) &&
      field.confidence >= 0.6 // Only use matches with decent confidence
    );
    if (matchingPair) {
      mappings[fieldId] = matchingPair.value;
    }
  });
  return mappings;
}

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  logDebug(`Status: ${message} (${type})`);
  setTimeout(() => {
    status.textContent = '';
    status.className = 'status';
  }, 3000);
}

function logDebug(message) {
  const debugLog = document.getElementById('debugLog');
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = `[${timestamp}] ${message}\n`;
  debugLog.textContent = logEntry + debugLog.textContent;
}