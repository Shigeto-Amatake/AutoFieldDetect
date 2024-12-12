let keyValuePairs = [];

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupEventListeners();
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
    showStatus('APIキーを保存しました', 'success');
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
    pairDiv.innerHTML = `
      <input type="text" class="key-input" value="${pair.key}" placeholder="キー" 
             data-index="${index}" onchange="updatePair(${index}, 'key', this.value)">
      <input type="text" class="value-input" value="${pair.value}" placeholder="値" 
             data-index="${index}" onchange="updatePair(${index}, 'value', this.value)">
      <button class="delete-button" onclick="deletePair(${index})">×</button>
    `;
    container.appendChild(pairDiv);
  });
}

function updatePair(index, field, value) {
  keyValuePairs[index][field] = value;
  saveKeyValuePairs();
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
    }
  });
}

async function fillFormFields() {
  try {
    // Get form fields from the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const fields = await new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, { type: 'SCAN_FIELDS' }, resolve);
    });

    // Analyze fields using ChatGPT
    const analysis = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ 
        type: 'ANALYZE_FIELDS', 
        data: fields.fields 
      }, resolve);
    });

    // Map analyzed fields to stored values
    const mappings = mapFieldsToValues(JSON.parse(analysis), keyValuePairs);

    // Fill the form
    await chrome.tabs.sendMessage(tab.id, { 
      type: 'FILL_FIELDS', 
      mappings 
    });

    showStatus('フォームの入力が完了しました', 'success');
  } catch (error) {
    showStatus(error.message || '予期せぬエラーが発生しました', 'error');
  }
}

function mapFieldsToValues(analysis, keyValuePairs) {
  const mappings = {};
  Object.entries(analysis).forEach(([selector, purpose]) => {
    const matchingPair = keyValuePairs.find(pair => 
      purpose.toLowerCase().includes(pair.key.toLowerCase())
    );
    if (matchingPair) {
      mappings[selector] = matchingPair.value;
    }
  });
  return mappings;
}

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  setTimeout(() => {
    status.textContent = '';
    status.className = 'status';
  }, 3000);
}
