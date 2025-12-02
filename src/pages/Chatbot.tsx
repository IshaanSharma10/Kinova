import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, Bot, User, Loader2 } from 'lucide-react';
import { gsap } from 'gsap';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant for the Kinova Gait Analysis Platform. How can I help you today?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  // Hugging Face Space configuration
  const SPACE_URL = 'https://elizaarora22-gait-analyzer-chatbot.hf.space';
  const API_TOKEN = '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';

  useEffect(() => {
    document.title = 'Kinova - Chatbot';

    if (headerRef.current) {
      gsap.fromTo(
        headerRef.current,
        { y: -50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power2.out' }
      );
    }

    if (chatRef.current) {
      gsap.fromTo(
        chatRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power2.out', delay: 0.3 }
      );
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      // Build conversation history for Gradio chat API
      // Format: [[user_msg1, assistant_msg1], [user_msg2, assistant_msg2], ...]
      const conversationHistory = messages
        .filter((msg) => msg.id !== '1') // Exclude initial greeting
        .reduce((acc, msg, index, array) => {
          if (msg.role === 'user') {
            const nextMsg = array[index + 1];
            if (nextMsg && nextMsg.role === 'assistant') {
              acc.push([msg.content, nextMsg.content]);
            } else {
              acc.push([msg.content, '']);
            }
          }
          return acc;
        }, [] as string[][]);

      // Add current user message
      conversationHistory.push([currentInput, '']);

      // Call Hugging Face Space API
      // For Gradio chat interfaces, try different endpoints and formats
      let response;
      let data;
      
      // Try /api/predict first (standard Gradio API)
      try {
        response = await fetch(`${SPACE_URL}/api/predict`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_TOKEN}`,
          },
          body: JSON.stringify({
            data: [currentInput, conversationHistory],
          }),
        });

        if (response.ok) {
          data = await response.json();
        } else {
          throw new Error(`API returned ${response.status}`);
        }
      } catch (error) {
        // Fallback to /run/predict
        try {
          response = await fetch(`${SPACE_URL}/run/predict`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${API_TOKEN}`,
            },
            body: JSON.stringify({
              data: [currentInput, conversationHistory],
            }),
          });

          if (response.ok) {
            data = await response.json();
          } else {
            throw new Error(`API returned ${response.status}`);
          }
        } catch (error2) {
          // Try alternative format with just the message
          response = await fetch(`${SPACE_URL}/api/predict`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${API_TOKEN}`,
            },
            body: JSON.stringify({
              data: [currentInput],
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
              errorData = JSON.parse(errorText);
            } catch {
              errorData = { error: errorText };
            }
            throw new Error(
              errorData.error || errorData.message || `API request failed: ${response.status} ${response.statusText}`
            );
          }
          
          data = await response.json();
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        throw new Error(
          errorData.error || errorData.message || `API request failed: ${response.status} ${response.statusText}`
        );
      }

      // Handle different response formats from Hugging Face Space
      let assistantResponse = '';
      
      if (data.data) {
        // Response from /run/predict or /api/chat
        const responseData = data.data;
        
        if (Array.isArray(responseData)) {
          // Check if it's a chat format: [[user, assistant], ...]
          if (Array.isArray(responseData[0]) && responseData[0].length === 2) {
            // Get the last exchange and extract assistant response
            const lastExchange = responseData[responseData.length - 1];
            assistantResponse = lastExchange[1] || lastExchange[0] || '';
          } else if (typeof responseData[0] === 'string') {
            assistantResponse = responseData[0];
          } else if (responseData[0]?.message) {
            assistantResponse = responseData[0].message;
          } else {
            assistantResponse = JSON.stringify(responseData[0]);
          }
        } else if (typeof responseData === 'string') {
          assistantResponse = responseData;
        } else if (responseData.message) {
          assistantResponse = responseData.message;
        } else {
          assistantResponse = JSON.stringify(responseData);
        }
      } else if (data.message) {
        assistantResponse = data.message;
      } else if (data.generated_text) {
        assistantResponse = data.generated_text;
      } else if (typeof data === 'string') {
        assistantResponse = data;
      } else {
        assistantResponse = 'I received your message, but I\'m having trouble processing the response format.';
      }

      // Clean up the response (remove any markdown formatting if needed)
      assistantResponse = assistantResponse.trim();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantResponse || 'I apologize, but I couldn\'t generate a response. Please try again.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chatbot error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error instanceof Error 
          ? `Sorry, I encountered an error: ${error.message}. Please try again.` 
          : 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div ref={headerRef} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8" />
              AI Chatbot
            </h1>
            <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
              Get instant answers and assistance about gait analysis and your data
            </p>
          </div>
        </div>

        {/* Chat Interface */}
        <div ref={chatRef} className="w-full">
          <Card className="bg-gradient-primary border-border/50 h-[calc(100vh-200px)] flex flex-col">
            <CardHeader className="border-b border-border/30">
              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                Gait Analyzer Chat Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
              <ScrollArea className="flex-1 p-4 sm:p-6">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <Bot className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-card border border-border/50 text-foreground'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        <p className="text-xs opacity-70 mt-2">
                          {message.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      {message.role === 'user' && (
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                      <div className="bg-card border border-border/50 rounded-lg px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              <div className="border-t border-border/30 p-4">
                <div className="flex gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
                    className="min-h-[60px] resize-none"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="shrink-0"
                    size="icon"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
