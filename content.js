// Form field detection and auto-filling implementation
let formFields = [];

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

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SCAN_FIELDS') {
    formFields = detectFormFields();
    sendResponse({ fields: formFields });
  } else if (request.type === 'FILL_FIELDS') {
    const { mappings } = request;
    Object.entries(mappings).forEach(([selector, value]) => {
      const element = document.querySelector(selector);
      if (element) {
        fillField(element, value);
      }
    });
    sendResponse({ success: true });
  }
  return true;
});
