// angers-email-system/src/utils/api.js
const API_BASE_URL = 'http://localhost:5000/api';

export const emailAPI = {
  // Fetch and classify emails from backend
  fetchAndClassifyEmails: async () => {
    try {
      console.log('📡 Calling backend API...');
      const response = await fetch(`${API_BASE_URL}/emails/fetch-classify`);
      const data = await response.json();
      console.log('✅ Backend response:', data);
      return data;
    } catch (error) {
      console.error('❌ Error fetching emails:', error);
      return { 
        success: false, 
        error: error.message,
        message: 'Could not connect to backend. Make sure it is running on port 5000.'
      };
    }
  },

  // Classify a single email
  classifyEmail: async (email, provider = 'gemini') => {
    try {
      const response = await fetch(`${API_BASE_URL}/emails/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, provider })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error classifying email:', error);
      return { success: false, error: error.message };
    }
  },

  // Send auto-reply
  sendAutoReply: async (emailId, replyText = null) => {
    try {
      const response = await fetch(`${API_BASE_URL}/emails/auto-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          emailId, 
          replyText,
          customReply: !!replyText 
        })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending auto-reply:', error);
      return { success: false, error: error.message };
    }
  },

  // Provide feedback for classification improvement
  provideFeedback: async (emailId, correctClassification) => {
    try {
      const response = await fetch(`${API_BASE_URL}/emails/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId, correctClassification })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error providing feedback:', error);
      return { success: false, error: error.message };
    }
  },

  // Test backend connection
  testConnection: async () => {
    try {
      const response = await fetch('http://localhost:5000/health');
      const data = await response.json();
      return data;
    } catch (error) {
      return { status: 'ERROR', message: 'Backend not reachable' };
    }
  }
};