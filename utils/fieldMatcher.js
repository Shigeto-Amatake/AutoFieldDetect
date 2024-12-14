// Utility functions for matching form fields with user-defined keys
export const FieldMatcher = {
  calculateMatchScore(fieldInfo, userKey) {
    let score = 0;
    const keyLower = userKey.toLowerCase();
    
    // Check label match
    if (fieldInfo.label && fieldInfo.label.toLowerCase().includes(keyLower)) {
      score += 3;
    }
    
    // Check placeholder match
    if (fieldInfo.placeholder && fieldInfo.placeholder.toLowerCase().includes(keyLower)) {
      score += 2;
    }
    
    // Check aria-label match
    if (fieldInfo.ariaLabel && fieldInfo.ariaLabel.toLowerCase().includes(keyLower)) {
      score += 2;
    }
    
    // Check ID/name match
    if (fieldInfo.id && fieldInfo.id.toLowerCase().includes(keyLower)) {
      score += 1;
    }
    
    // Check surrounding text match
    if (fieldInfo.surroundingText && fieldInfo.surroundingText.toLowerCase().includes(keyLower)) {
      score += 1;
    }
    
    return score;
  },

  findBestMatch(fieldInfo, userKeys, keyValuePairs) {
    let bestMatch = null;
    let bestScore = 0;
    let isNameField = false;

    // Check if this is a general name field
    const nameIndicators = ['name', '名前', 'お名前'];
    isNameField = nameIndicators.some(indicator => 
      fieldInfo.label?.toLowerCase().includes(indicator.toLowerCase()) ||
      fieldInfo.placeholder?.toLowerCase().includes(indicator.toLowerCase())
    );

    // If it's a general name field, try to combine sex and name
    if (isNameField) {
      const sexValue = keyValuePairs.find(pair => pair.key === '性')?.value || '';
      const nameValue = keyValuePairs.find(pair => pair.key === '名')?.value || '';
      if (sexValue && nameValue) {
        return {
          key: '氏名',
          value: `${sexValue}${nameValue}`,
          score: 5
        };
      }
    }

    // Regular matching logic
    userKeys.forEach(key => {
      const score = this.calculateMatchScore(fieldInfo, key);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = key;
      }
    });

    return bestScore >= 2 ? { key: bestMatch, score: bestScore } : null;
  },

  getConfidenceLevel(score) {
    if (score >= 5) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }
};

export { FieldMatcher };
export default FieldMatcher;
