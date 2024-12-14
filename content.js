// Form field detection and auto-filling implementation
let formFields = [];

// Field matching utility functions
const FieldMatcher = {
  calculateMatchScore(fieldInfo, userKey) {
    let score = 0;
    const keyLower = userKey.toLowerCase();
    
    if (fieldInfo.label && fieldInfo.label.toLowerCase().includes(keyLower)) {
      score += 3;
    }
    
    if (fieldInfo.placeholder && fieldInfo.placeholder.toLowerCase().includes(keyLower)) {
      score += 2;
    }
    
    if (fieldInfo.ariaLabel && fieldInfo.ariaLabel.toLowerCase().includes(keyLower)) {
      score += 2;
    }
    
    if (fieldInfo.id && fieldInfo.id.toLowerCase().includes(keyLower)) {
      score += 1;
    }
    
    return score;
  },

  findBestMatch(fieldInfo, userKeys) {
    let bestMatch = null;
    let bestScore = 0;

    userKeys.forEach(key => {
      const score = this.calculateMatchScore(fieldInfo, key);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = key;
      }
    });

    return bestScore >= 2 ? bestMatch : null;
  }
};

function detectFormFields() {
  const inputSelectors = [
    'input[type="text"]',
    'input[type="email"]',
    'input[type="tel"]',
    'input[type="number"]',
    'input[type="password"]',
    'textarea'
  ];

  const fields = [];
  inputSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(input => {
      // Skip hidden fields
      if (input.type === 'hidden' || !isElementVisible(input)) {
        return;
      }

      const fieldInfo = {
        id: input.id || input.name || generateUniqueId(),
        selector: generateUniqueSelector(input),
        type: input.type,
        label: getFieldLabel(input),
        placeholder: input.placeholder || '',
        ariaLabel: input.getAttribute('aria-label') || '',
        surroundingText: getSurroundingText(input),
        attributes: getRelevantAttributes(input)
      };
      fields.push(fieldInfo);
    });
  });

  return fields;
}

function generateUniqueId() {
  return '_' + Math.random().toString(36).substr(2, 9);
}

function isElementVisible(element) {
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden' && element.offsetParent !== null;
}

function getRelevantAttributes(input) {
  const relevantAttrs = ['name', 'class', 'data-field-type', 'data-test-id'];
  const attrs = {};
  relevantAttrs.forEach(attr => {
    const value = input.getAttribute(attr);
    if (value) attrs[attr] = value;
  });
  return attrs;
}

function generateUniqueSelector(element) {
  const path = [];
  while (element && element.nodeType === Node.ELEMENT_NODE) {
    let selector = element.nodeName.toLowerCase();
    if (element.id) {
      selector += '#' + element.id;
      path.unshift(selector);
      break;
    } else {
      let sibling = element;
      let nth = 1;
      while (sibling = sibling.previousElementSibling) {
        if (sibling.nodeName.toLowerCase() === selector) nth++;
      }
      if (nth !== 1) selector += `:nth-of-type(${nth})`;
    }
    path.unshift(selector);
    element = element.parentNode;
  }
  return path.join(' > ');
}

function getFieldLabel(input) {
  let label = '';
  
  // Check for explicit label
  if (input.labels && input.labels.length > 0) {
    label = input.labels[0].textContent;
  }
  
  // Try finding a label by the 'for' attribute
  if (!label && input.id) {
    const labelElement = document.querySelector(`label[for="${input.id}"]`);
    if (labelElement) {
      label = labelElement.textContent;
    }
  }
  
  // Look for aria-label and aria-labelledby
  if (!label) {
    label = input.getAttribute('aria-label') || '';
    const labelledBy = input.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelElement = document.getElementById(labelledBy);
      if (labelElement) {
        label = labelElement.textContent;
      }
    }
  }
  
  // Look for preceding text node
  if (!label) {
    const prevNode = input.previousSibling;
    if (prevNode && prevNode.nodeType === Node.TEXT_NODE) {
      label = prevNode.textContent;
    }
  }

  return label.trim();
}

function getSurroundingText(element) {
  // Get text from parent and siblings
  const textParts = [];
  const parent = element.parentElement;
  
  if (parent) {
    // Get preceding siblings text
    let prevSibling = element.previousElementSibling;
    while (prevSibling && textParts.length < 3) {
      textParts.unshift(prevSibling.textContent.trim());
      prevSibling = prevSibling.previousElementSibling;
    }
    
    // Get parent's direct text
    const parentText = Array.from(parent.childNodes)
      .filter(node => node.nodeType === Node.TEXT_NODE)
      .map(node => node.textContent.trim())
      .join(' ');
    if (parentText) textParts.push(parentText);
    
    // Get following siblings text
    let nextSibling = element.nextElementSibling;
    while (nextSibling && textParts.length < 5) {
      textParts.push(nextSibling.textContent.trim());
      nextSibling = nextSibling.nextElementSibling;
    }
  }
  
  return textParts.join(' ').substring(0, 200).trim();
}

function fillField(element, value) {
  // Focus the element first
  element.focus();
  
  // Handle different input types
  if (element.tagName.toLowerCase() === 'textarea' || 
      (element.tagName.toLowerCase() === 'input' && 
       ['text', 'email', 'tel', 'number', 'password'].includes(element.type))) {
    
    // Clear existing value
    element.value = '';
    
    // Trigger events that often occur during typing
    element.dispatchEvent(new Event('focus', { bubbles: true }));
    
    // Set the new value
    element.value = value;
    
    // Trigger input events
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Some frameworks use these events
    element.dispatchEvent(new CustomEvent('input', { bubbles: true, detail: { value } }));
    element.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { value } }));
  }
  
  // Blur the element to trigger any onBlur validation
  element.blur();
  element.dispatchEvent(new Event('blur', { bubbles: true }));
  
  // Log success
  console.log(`Field filled successfully: ${element.name || element.id}`);
}

// Initialize content script
console.log('Form Filler content script initializing...');

// Track initialization state
let isInitialized = false;

// Initialize the content script
async function initialize() {
  if (isInitialized) return;
  
  console.log('Form Filler content script initializing...');
  try {
    // Ensure we're in the main frame
    if (window.top !== window.self) {
      console.log('Skipping initialization in iframe');
      return;
    }

    // Wait for DOM to be ready
    if (document.readyState !== 'complete' && document.readyState !== 'interactive') {
      await new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve, { once: true });
      });
    }

    // Perform initial form field scan
    formFields = detectFormFields();
    console.log('Initial form fields detected:', formFields.length);

    isInitialized = true;
    console.log('Form Filler content script initialized successfully');

    // Notify that initialization is complete
    chrome.runtime.sendMessage({ 
      type: 'CONTENT_SCRIPT_READY',
      url: window.location.href
    });
  } catch (error) {
    console.error('Content script initialization error:', error);
    isInitialized = false;
  }
}

// Initialize when the script loads
initialize().catch(error => {
  console.error('Failed to initialize content script:', error);
});

// Re-initialize on navigation within SPA
let previousUrl = window.location.href;
const observer = new MutationObserver(() => {
  if (window.location.href !== previousUrl) {
    previousUrl = window.location.href;
    console.log('URL changed, reinitializing...');
    isInitialized = false;
    initialize().catch(console.error);
  }
});

observer.observe(document, { subtree: true, childList: true });

// Set up message listener
const messageListener = (request, sender, sendResponse) => {
  console.log('Received message:', request.type);
  
  // Always respond to PING messages, even if not fully initialized
  if (request.type === 'PING') {
    sendResponse({ 
      status: 'ready',
      initialized: isInitialized,
      documentState: document.readyState
    });
    return true;
  }

  // For other messages, ensure we're initialized
  if (!isInitialized) {
    console.warn('Content script not yet initialized, retrying initialization...');
    initialize();
    sendResponse({ error: 'Content script not yet initialized' });
    return true;
  }
  
  if (request.type === 'SCAN_FIELDS') {
    try {
      formFields = detectFormFields();
      console.log('Detected form fields:', formFields.length);
      sendResponse({ fields: formFields });
    } catch (error) {
      console.error('Error scanning fields:', error);
      sendResponse({ error: error.message });
    }
  } else if (request.type === 'FILL_FIELDS') {
    try {
      const { mappings } = request;
      console.log('Filling fields with mappings:', mappings);
      
      Object.entries(mappings).forEach(([fieldId, value]) => {
        const field = formFields.find(f => f.id === fieldId);
        if (field) {
          const element = document.querySelector(field.selector);
          if (element) {
            fillField(element, value);
          } else {
            console.warn('Element not found for selector:', field.selector);
          }
        }
      });
      
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error filling fields:', error);
      sendResponse({ error: error.message });
    }
  }
  
  // Return true to indicate we'll send a response asynchronously
  return true;
};

// Register message listener
try {
  chrome.runtime.onMessage.addListener(messageListener);
  console.log('Message listener registered successfully');
} catch (error) {
  console.error('Failed to register message listener:', error);
}

// Setup error handling for disconnection
chrome.runtime.onConnect.addListener(port => {
  port.onDisconnect.addListener(() => {
    if (chrome.runtime.lastError) {
      console.log('Port disconnected:', chrome.runtime.lastError.message);
      // Attempt to re-initialize
      isInitialized = false;
      initialize().catch(console.error);
    }
  });
});

console.log('Form Filler content script ready');
