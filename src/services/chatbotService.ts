// Chatbot service for Hugging Face integration
// This service calls the backend API which securely handles the HF token

interface ChatbotMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatbotResponse {
  response: string;
  error: string | null;
}

/**
 * Send a message to the chatbot via the backend API
 * @param message - The user's message
 * @param conversationHistory - Previous messages in the conversation (optional)
 * @returns The chatbot's response
 */
export async function sendChatbotMessage(
  message: string,
  conversationHistory: ChatbotMessage[] = []
): Promise<string> {
  try {
    const response = await fetch('/api/chatbot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message.trim(),
        conversation_history: conversationHistory,
      }),
    });

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        // If response is not JSON, try to get text
        try {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        } catch {
          errorMessage = `Server error (${response.status}). Please check backend logs.`;
        }
      }
      throw new Error(errorMessage);
    }

    const data: ChatbotResponse = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    return data.response || 'I apologize, but I couldn\'t generate a response.';
  } catch (error) {
    console.error('Chatbot service error:', error);
    
    // Provide user-friendly error messages
    if (error instanceof Error) {
      if (error.message.includes('model_loading')) {
        return 'The AI model is currently loading. Please wait a moment and try again.';
      }
      if (error.message.includes('timeout') || error.message.includes('504')) {
        return 'The request took too long. Please try again with a shorter message.';
      }
      if (error.message.includes('credentials not configured')) {
        return 'Chatbot service is not properly configured. Please contact support.';
      }
      return `Error: ${error.message}`;
    }
    
    return 'An unexpected error occurred. Please try again.';
  }
}

export type { ChatbotMessage, ChatbotResponse };

