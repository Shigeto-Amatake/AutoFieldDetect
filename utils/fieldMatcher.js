// Utility functions for matching form fields with user-defined keys
const FieldMatcher = {
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

    // Return match only if score is above threshold
    return bestScore >= 2 ? bestMatch : null;
  },

  getConfidenceLevel(score) {
    if (score >= 5) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }
};

export default FieldMatcher;
