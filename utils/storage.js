// Utility functions for Chrome storage operations
export const StorageUtil = {
  async getApiKey() {
    try {
      const result = await chrome.storage.local.get(['openaiApiKey']);
      return result.openaiApiKey;
    } catch (error) {
      console.error('Failed to get API key:', error);
      throw new Error('APIキーの取得に失敗しました');
    }
  },

  async setApiKey(apiKey) {
    try {
      await chrome.storage.local.set({ openaiApiKey: apiKey });
    } catch (error) {
      console.error('Failed to save API key:', error);
      throw new Error('APIキーの保存に失敗しました');
    }
  },

  async getKeyValuePairs() {
    try {
      const result = await chrome.storage.local.get(['keyValuePairs']);
      return result.keyValuePairs || [];
    } catch (error) {
      console.error('Failed to get key-value pairs:', error);
      throw new Error('設定の取得に失敗しました');
    }
  },

  async setKeyValuePairs(pairs) {
    try {
      await chrome.storage.local.set({ keyValuePairs: pairs });
    } catch (error) {
      console.error('Failed to save key-value pairs:', error);
      throw new Error('設定の保存に失敗しました');
    }
  }
};

export default StorageUtil;
