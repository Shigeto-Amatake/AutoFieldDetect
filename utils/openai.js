// OpenAI API interaction utilities
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
import OpenAI from 'openai';

export class OpenAIUtil {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
  }

  /**
   * Analyzes form fields using ChatGPT API
   * @param {Array} fields Array of field information objects
   * @returns {Promise<Object>} Analyzed field mappings
   */
  async analyzeFields(fields) {
    if (!this.apiKey) {
      throw new Error('OpenAI API keyが設定されていません。設定画面でAPIキーを登録してください。');
    }

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
    }
    `;

    try {
      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
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
          temperature: 0.3, // Lower temperature for more consistent results
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw this.handleAPIError(response.status, errorData);
      }

      const result = await response.json();
      return JSON.parse(result.choices[0].message.content);

    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw this.handleAPIError(error.status, error);
    }
  }

  /**
   * Validates the API key with a simple test request
   * @returns {Promise<boolean>} True if API key is valid
   */
  async validateApiKey() {
    try {
      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: "This is a test message to validate the API key."
            }
          ],
          max_tokens: 5
        })
      });

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      return true;
    } catch (error) {
      console.error('API Key Validation Error:', error);
      return false;
    }
  }

  /**
   * Handles various API errors and returns appropriate user-friendly messages
   * @param {number} status HTTP status code
   * @param {Object} errorData Error response data
   * @returns {Error} Error with user-friendly message
   */
  handleAPIError(status, errorData) {
    let message;
    switch (status) {
      case 401:
        message = 'OpenAI APIキーが無効です。APIキーを確認して更新してください。';
        break;
      case 429:
        message = 'APIの利用制限に達しました。しばらく待ってから再試行してください。';
        break;
      case 500:
        message = 'OpenAI APIサーバーでエラーが発生しました。後でお試しください。';
        break;
      case 503:
        message = 'OpenAI APIサービスが一時的に利用できません。後でお試しください。';
        break;
      default:
        message = errorData.error?.message || 
                 'ChatGPT APIとの通信に失敗しました。ネットワーク接続を確認するか、後でお試しください。';
    }
    return new Error(message);
  }

  /**
   * Processes field analysis results and adds confidence scores
   * @param {Object} analysis Raw analysis results from API
   * @returns {Object} Enhanced analysis with confidence scores
   */
  enhanceAnalysisResults(analysis) {
    const enhanced = {};
    for (const [fieldId, purpose] of Object.entries(analysis)) {
      enhanced[fieldId] = {
        purpose,
        confidence: this.calculateConfidence(purpose)
      };
    }
    return enhanced;
  }

  /**
   * Calculates confidence score for field purpose prediction
   * @param {string} purpose Predicted field purpose
   * @returns {number} Confidence score between 0 and 1
   */
  calculateConfidence(purpose) {
    // Simple confidence calculation based on purpose specificity
    const commonFields = [
      '姓', '名', 'メールアドレス', '電話番号', '住所', '郵便番号',
      'name', 'email', 'phone', 'address', 'postal'
    ];
    
    const hasCommonField = commonFields.some(field => 
      purpose.toLowerCase().includes(field.toLowerCase())
    );

    return hasCommonField ? 0.8 : 0.6;
  }
}

export default OpenAIUtil;
