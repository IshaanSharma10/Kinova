import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, Bot, User, Loader2, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { sendChatbotMessage, type ChatbotMessage as ServiceMessage } from '@/services/chatbotService';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Knowledge base for gait parameters
const gaitKnowledgeBase: Record<string, { description: string; normalRange: string; factors: string[]; tips?: string[] }> = {
  cadence: {
    description: 'Cadence is the number of steps taken per minute. It measures how fast you walk in terms of step frequency.',
    normalRange: 'Typically 100-120 steps/min for adults, but varies with height (taller people tend to have lower cadence).',
    factors: ['Height (taller = lower cadence)', 'Walking speed', 'Age', 'Fitness level'],
    tips: ['Aim for 110-115 steps/min for comfortable walking', 'Higher cadence can reduce joint stress', 'Cadence decreases naturally with height']
  },
  equilibrium: {
    description: 'Equilibrium Score measures your balance and stability while walking. Higher scores indicate better balance.',
    normalRange: 'Optimal range is 0.85-0.95. Scores below 0.80 may indicate balance issues.',
    factors: ['BMI (optimal BMI 20-25 gives best balance)', 'Core strength', 'Age', 'Neurological health'],
    tips: ['Maintain healthy BMI for better balance', 'Strengthen core muscles', 'Practice balance exercises']
  },
  'postural sway': {
    description: 'Postural Sway measures the amount of body oscillation or movement while maintaining balance. Lower values indicate better stability.',
    normalRange: 'Normal range is 8-15mm. Values above 20mm may indicate balance problems.',
    factors: ['BMI (higher BMI = more sway)', 'Height', 'Core strength', 'Age'],
    tips: ['Lower BMI can reduce postural sway', 'Strengthen core and leg muscles', 'Practice single-leg balance exercises']
  },
  'walking speed': {
    description: 'Walking Speed measures how fast you walk in meters per second. It\'s a key indicator of overall mobility and health.',
    normalRange: 'Comfortable walking speed is typically 1.2-1.4 m/s for adults. Speed correlates with leg length.',
    factors: ['Leg length (longer legs = faster speed)', 'Fitness level', 'Age', 'Joint health'],
    tips: ['Walking speed correlates with leg length (~0.95 × leg length)', 'Regular exercise improves walking speed', 'Maintain joint flexibility']
  },
  'gait symmetry': {
    description: 'Gait Symmetry measures how balanced your left and right steps are during walking. Higher values indicate more symmetrical gait patterns.',
    normalRange: 'Normal gait symmetry ranges from 40-60%. Values closer to 50% indicate perfect symmetry between left and right sides.',
    factors: ['Muscle strength balance', 'Joint mobility', 'Previous injuries', 'Neurological conditions', 'Habitual movement patterns'],
    tips: ['Aim for symmetry close to 50%', 'Unilateral exercises can improve asymmetry', 'Address muscle imbalances through targeted training', 'Consult a physiotherapist if asymmetry is significant']
  },
  'step width': {
    description: 'Step Width is the lateral distance between your feet while walking. It affects stability and balance.',
    normalRange: 'Normal step width is 5-13cm. Slightly wider for taller individuals.',
    factors: ['Height', 'Balance ability', 'Age', 'Hip width'],
    tips: ['Too narrow step width can reduce stability', 'Too wide can indicate balance issues', 'Aim for 6-10cm for most adults']
  },
  frequency: {
    description: 'Step Frequency (Hz) is how many steps you take per second. It\'s derived from cadence (frequency = cadence / 60).',
    normalRange: 'Normal frequency is 1.7-2.0 Hz (100-120 steps/min ÷ 60).',
    factors: ['Cadence', 'Walking speed', 'Height', 'Natural rhythm'],
    tips: ['Frequency = Cadence ÷ 60', 'Higher frequency can improve efficiency', 'Find your natural comfortable frequency']
  },
  'knee force': {
    description: 'Knee Force is the force exerted on the knee joint during walking, typically 1.5-2 times your body weight.',
    normalRange: 'Normal knee force is approximately 1.5-2.0 × body weight (in Newtons). For a 70kg person, that\'s about 1000-1400N.',
    factors: ['Body weight', 'Walking speed', 'Terrain', 'Gait pattern'],
    tips: ['Maintain healthy weight to reduce knee stress', 'Proper walking form reduces excessive force', 'Strengthen leg muscles to support joints']
  }
};

// Note: The knowledge base below is kept for reference and UI display.
// The chatbot now uses the Hugging Face model for responses.

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your gait analysis assistant. I can help you understand gait parameters like cadence, equilibrium, postural sway, walking speed, and more. What would you like to know?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true); // Voice output enabled by default
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
  const lastInputWasVoiceRef = useRef<boolean>(false); // Track if last input was from voice

  // Voice input hook
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    error: speechError,
    isSupported: isSpeechSupported,
  } = useSpeechRecognition();

  // Auto-send timer ref
  const autoSendTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthesisRef.current = window.speechSynthesis;
    }
    
    // Cleanup: stop any ongoing speech when component unmounts
    return () => {
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }
    };
  }, []);

  // Function to speak text - defined early so handleSend can use it
  const speakText = useCallback((text: string) => {
    if (!speechSynthesisRef.current) return;
    
    // Cancel any ongoing speech
    speechSynthesisRef.current.cancel();
    
    // Create speech utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure voice settings
    utterance.rate = 1.0; // Normal speed
    utterance.pitch = 1.0; // Normal pitch
    utterance.volume = 1.0; // Full volume
    
    // Try to use a natural-sounding female voice
    const voices = speechSynthesisRef.current.getVoices();
    // Load voices if not available yet
    if (voices.length === 0) {
      speechSynthesisRef.current.getVoices(); // Trigger voice loading
      // Retry after a short delay
      setTimeout(() => {
        const retryVoices = speechSynthesisRef.current?.getVoices() || [];
        // Prefer female voices
        const preferredVoice = retryVoices.find(voice => 
          (voice.name.toLowerCase().includes('female') || 
           voice.name.toLowerCase().includes('woman') ||
           voice.name.toLowerCase().includes('zira') || // Windows female voice
           voice.name.toLowerCase().includes('samantha') || // macOS female voice
           voice.name.toLowerCase().includes('karen') || // Australian female
           voice.name.toLowerCase().includes('fiona') || // Scottish female
           voice.name.toLowerCase().includes('tessa') || // South African female
           voice.name.toLowerCase().includes('veena') || // Indian female
           voice.name.toLowerCase().includes('google uk english female') ||
           voice.name.toLowerCase().includes('google us english female') ||
           voice.name.toLowerCase().includes('natural female')) &&
          voice.lang.startsWith('en')
        ) || retryVoices.find(voice => 
          voice.lang.startsWith('en') && 
          !voice.name.toLowerCase().includes('male') &&
          !voice.name.toLowerCase().includes('david') &&
          !voice.name.toLowerCase().includes('mark') &&
          !voice.name.toLowerCase().includes('alex')
        ) || retryVoices.find(voice => voice.lang.startsWith('en'));
        
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
        speechSynthesisRef.current?.speak(utterance);
      }, 100);
      return;
    }
    
    // Prefer female voices
    const preferredVoice = voices.find(voice => 
      (voice.name.toLowerCase().includes('female') || 
       voice.name.toLowerCase().includes('woman') ||
       voice.name.toLowerCase().includes('zira') || // Windows female voice
       voice.name.toLowerCase().includes('samantha') || // macOS female voice
       voice.name.toLowerCase().includes('karen') || // Australian female
       voice.name.toLowerCase().includes('fiona') || // Scottish female
       voice.name.toLowerCase().includes('tessa') || // South African female
       voice.name.toLowerCase().includes('veena') || // Indian female
       voice.name.toLowerCase().includes('google uk english female') ||
       voice.name.toLowerCase().includes('google us english female') ||
       voice.name.toLowerCase().includes('natural female')) &&
      voice.lang.startsWith('en')
    ) || voices.find(voice => 
      voice.lang.startsWith('en') && 
      !voice.name.toLowerCase().includes('male') &&
      !voice.name.toLowerCase().includes('david') &&
      !voice.name.toLowerCase().includes('mark') &&
      !voice.name.toLowerCase().includes('alex')
    ) || voices.find(voice => voice.lang.startsWith('en'));
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    // Handle errors
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
    };
    
    // Speak the text
    speechSynthesisRef.current.speak(utterance);
  }, []);

  // Define handleSend so it can be used in useEffect
  const handleSend = useCallback(async (isVoiceInput: boolean = false) => {
    if (!input.trim() || isLoading) return;

    // Track if this input came from voice
    lastInputWasVoiceRef.current = isVoiceInput;

    // Clear auto-send timer if it exists
    if (autoSendTimerRef.current) {
      clearTimeout(autoSendTimerRef.current);
      autoSendTimerRef.current = null;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      // Prepare conversation history for context
      const conversationHistory: ServiceMessage[] = messages
        .slice(-10) // Keep last 10 messages for context
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      // Call Hugging Face chatbot API via backend
      const response = await sendChatbotMessage(currentInput, conversationHistory);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Speak the assistant's response only if input was from voice AND voice is enabled
      if (isVoiceInput && voiceEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        console.log('Speaking response (voice input detected):', { isVoiceInput, voiceEnabled });
        // Use setTimeout to ensure the message is added to state first
        setTimeout(() => {
          speakText(response);
        }, 100);
      } else {
        console.log('Not speaking (text input or voice disabled):', { isVoiceInput, voiceEnabled });
      }
    } catch (error) {
      console.error('Error getting chatbot response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error instanceof Error 
          ? `Sorry, I encountered an error: ${error.message}` 
          : 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, speakText, voiceEnabled]);

  // Update input field when transcript changes
  useEffect(() => {
    if (transcript) {
      console.log('Transcript updated in Chatbot:', transcript);
      setInput(transcript);
    }
  }, [transcript]);

  // Auto-stop and send after 2 seconds of silence
  // With continuous=true, we need to manually stop after detecting silence
  useEffect(() => {
    // Clear any existing timer
    if (autoSendTimerRef.current) {
      clearTimeout(autoSendTimerRef.current);
      autoSendTimerRef.current = null;
    }

    // If we're listening and have a transcript, check for silence
    if (isListening && transcript && transcript.trim()) {
      const lastTranscript = transcript.trim();
      
      // Set up a timer to check if transcript hasn't changed (silence detected)
      autoSendTimerRef.current = setTimeout(() => {
        // If transcript hasn't changed in 2 seconds, we've had silence
        if (isListening && transcript.trim() === lastTranscript && !isLoading) {
          console.log('Silence detected, stopping recognition and auto-sending');
          stopListening(); // Stop recognition first
          // The onend handler will trigger, then we'll auto-send
        }
      }, 2000); // 2 second delay for silence detection
    }

    // If we have a transcript and recording just stopped, set up auto-send
    if (!isListening && transcript && transcript.trim() && !isLoading) {
      const transcriptValue = transcript.trim();
      autoSendTimerRef.current = setTimeout(() => {
        // Only auto-send if input matches transcript and hasn't been manually changed
        if (input.trim() === transcriptValue && !isLoading) {
          console.log('Auto-sending message from voice input');
          handleSend(true); // Pass true to indicate this is a voice input
        }
      }, 500); // Shorter delay since we already waited for silence
    }

    // Cleanup timer on unmount or when listening starts again
    return () => {
      if (autoSendTimerRef.current) {
        clearTimeout(autoSendTimerRef.current);
        autoSendTimerRef.current = null;
      }
    };
  }, [isListening, transcript, input, isLoading, handleSend, stopListening]);

  // Stop listening when sending a message
  useEffect(() => {
    if (isLoading && isListening) {
      stopListening();
    }
  }, [isLoading, isListening, stopListening]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(false); // Pass false to indicate this is a text input
    }
  };

  const quickQuestions = [
    'What is cadence?',
    'What are gait parameters?',
    'How can I improve my gait?',
    'What is a normal walking speed?'
  ];

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-primary rounded-full p-3">
              <MessageSquare className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Gait Parameters Chatbot</h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                Ask me anything about gait parameters and walking analysis
              </p>
            </div>
          </div>
          {typeof window !== 'undefined' && 'speechSynthesis' in window && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newVoiceEnabled = !voiceEnabled;
                setVoiceEnabled(newVoiceEnabled);
                if (speechSynthesisRef.current && !newVoiceEnabled) {
                  speechSynthesisRef.current.cancel();
                }
              }}
              title={voiceEnabled ? "Disable voice output" : "Enable voice output"}
            >
              {voiceEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>

        <Card className="bg-gradient-primary border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Chat</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex flex-col h-[600px]">
              <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="bg-primary rounded-full p-2 h-8 w-8 flex items-center justify-center shrink-0">
                          <Bot className="w-4 h-4 text-primary-foreground" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] sm:max-w-[70%] rounded-lg p-3 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {message.role === 'user' && (
                        <div className="bg-muted rounded-full p-2 h-8 w-8 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="bg-primary rounded-full p-2 h-8 w-8 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-primary-foreground" />
                      </div>
                      <div className="bg-muted rounded-lg p-3">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="border-t p-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {quickQuestions.map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setInput(question)}
                    >
                      {question}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about gait parameters..."
                    className="flex-1"
                    disabled={isLoading || isListening}
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                  />
                  {isSpeechSupported && (
                    <Button
                      onClick={isListening ? stopListening : startListening}
                      disabled={isLoading}
                      variant={isListening ? "destructive" : "outline"}
                      className="shrink-0 relative"
                      title={isListening ? "Stop recording" : "Start voice input"}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="w-4 h-4" />
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        </>
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                  <Button
                    onClick={() => handleSend(false)} // Pass false to indicate this is a text input
                    disabled={!input.trim() || isLoading || isListening}
                    className="shrink-0"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {isListening && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span>Recording... Speak clearly into your microphone</span>
                  </div>
                )}
                {!isListening && transcript && transcript.trim() && !isLoading && input.trim() === transcript.trim() && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                    <span>Sending automatically in 2 seconds...</span>
                  </div>
                )}
                {speechError && (
                  <div className="text-sm text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
                    <strong>Voice Input Error:</strong> {speechError}
                    <br />
                    <span className="text-xs mt-1 block">
                      Tips: Make sure your microphone is connected and working. Speak clearly and check browser permissions.
                    </span>
                  </div>
                )}
                {!isSpeechSupported && (
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    Voice input is not supported in your browser. Please use Chrome or Edge for voice input.
                  </div>
                )}
                {isListening && !transcript && (
                  <div className="text-xs text-muted-foreground">
                    Waiting for speech... Make sure your microphone is working and speak clearly.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-primary border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-foreground">Available Gait Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {Object.keys(gaitKnowledgeBase).map((key) => (
                <div key={key} className="p-2 bg-muted/50 rounded-md text-center">
                  {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

