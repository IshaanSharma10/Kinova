import { useState, useEffect, useRef, useCallback } from 'react';

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  error: string | null;
  isSupported: boolean;
}

// Type definitions for Web Speech API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

export const useSpeechRecognition = (): UseSpeechRecognitionReturn => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef('');

  // Check if browser supports speech recognition
  const isSupported = typeof window !== 'undefined' && (
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  );

  // Helper function to create a new recognition instance
  const createRecognition = useCallback((): SpeechRecognition | null => {
    if (!isSupported) return null;

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true; // Keep listening until manually stopped
      recognition.interimResults = true; // Show text as user speaks
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;
      
      // Note: With continuous=true, recognition keeps listening until stop() is called
      // This gives more time for speech detection

      // Handle start
      recognition.onstart = () => {
        console.log('Speech recognition started successfully');
        setIsListening(true);
        setError(null);
        setTranscript(''); // Clear previous transcript
        finalTranscriptRef.current = ''; // Reset final transcript
      };

      // Handle results
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        console.log('Speech recognition result received:', event);
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0]?.transcript || '';
          const confidence = result[0]?.confidence || 0;
          console.log(`Result ${i}: transcript="${transcript}", isFinal=${result.isFinal}, confidence=${confidence}`);
          
          if (result.isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        // Update transcript with both interim and final results
        const newTranscript = finalTranscriptRef.current + finalTranscript + interimTranscript;
        console.log('Setting transcript:', newTranscript);
        setTranscript(newTranscript);

        // If we got final results, add them to the final transcript
        if (finalTranscript) {
          finalTranscriptRef.current += finalTranscript;
          console.log('Final transcript updated:', finalTranscriptRef.current);
        }
      };

      // Handle errors
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error, event.message);
        
        let errorMessage = 'An error occurred with speech recognition.';
        
        switch (event.error) {
          case 'no-speech':
            // With continuous=true, this might fire if there's a pause
            // Don't treat it as a fatal error - just log it
            console.warn('No speech detected in this segment - continuing to listen...');
            // Don't set error or stop - let it continue listening
            return; // Exit early, don't show error
          case 'audio-capture':
            errorMessage = 'Microphone not found. Please check your microphone settings and try again.';
            setIsListening(false);
            recognitionRef.current = null;
            break;
          case 'not-allowed':
            errorMessage = 'Microphone permission denied. Please allow microphone access in your browser settings and refresh the page.';
            setIsListening(false);
            recognitionRef.current = null;
            break;
          case 'network':
            errorMessage = 'Network error. Please check your internet connection and try again.';
            setIsListening(false);
            recognitionRef.current = null;
            break;
          case 'aborted':
            // User stopped recording, not really an error
            console.log('Speech recognition aborted by user');
            setIsListening(false);
            recognitionRef.current = null;
            return;
          case 'service-not-allowed':
            errorMessage = 'Speech recognition service not allowed. Please check your browser settings.';
            setIsListening(false);
            recognitionRef.current = null;
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}. ${event.message || ''}`;
            setIsListening(false);
            recognitionRef.current = null;
        }
        
        setError(errorMessage);
      };

      // Handle no match (speech detected but not recognized)
      recognition.onnomatch = (event: SpeechRecognitionEvent) => {
        console.warn('Speech detected but not recognized:', event);
        setError('Speech detected but could not be understood. Please speak more clearly.');
      };

      // Handle end of recognition
      recognition.onend = () => {
        console.log('Speech recognition ended. Final transcript:', finalTranscriptRef.current);
        const hadTranscript = finalTranscriptRef.current.trim().length > 0;
        
        // If we have a final transcript, ensure it's set
        if (finalTranscriptRef.current) {
          setTranscript(finalTranscriptRef.current);
        }
        
        setIsListening(false);
        // Clear the ref so a new instance can be created next time
        recognitionRef.current = null;
        
        // If no transcript was captured and we were listening, it might have stopped too early
        if (!hadTranscript) {
          console.warn('Recognition ended without capturing any speech');
        }
      };

      return recognition;
    } catch (err) {
      console.error('Failed to create speech recognition:', err);
      setError('Failed to initialize speech recognition.');
      return null;
    }
  }, [isSupported]);

  const startListening = useCallback(async () => {
    if (!isSupported) {
      setError('Speech recognition is not available in your browser. Please use Chrome or Edge.');
      return;
    }

    // Request microphone permission first
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('Microphone permission granted');
      }
    } catch (permissionError: any) {
      console.error('Microphone permission error:', permissionError);
      if (permissionError.name === 'NotAllowedError' || permissionError.name === 'PermissionDeniedError') {
        setError('Microphone permission denied. Please allow microphone access in your browser settings.');
      } else if (permissionError.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.');
      } else {
        setError('Could not access microphone. Please check your browser settings.');
      }
      setIsListening(false);
      return;
    }

    // Always create a fresh instance - once a recognition instance ends, it cannot be restarted
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (err) {
        // Ignore errors
      }
      recognitionRef.current = null;
    }

    const recognition = createRecognition();
    if (!recognition) {
      setError('Failed to create speech recognition instance.');
      return;
    }

    recognitionRef.current = recognition;

    try {
      setError(null);
      setTranscript('');
      finalTranscriptRef.current = '';
      console.log('Starting speech recognition...', {
        continuous: recognition.continuous,
        interimResults: recognition.interimResults,
        lang: recognition.lang
      });
      
      // Add a small delay to ensure everything is ready
      setTimeout(() => {
        try {
          recognition.start();
          console.log('Speech recognition start() called successfully');
        } catch (startErr: any) {
          console.error('Error in recognition.start():', startErr);
          setError(`Failed to start: ${startErr.message || 'Unknown error'}`);
          setIsListening(false);
          recognitionRef.current = null;
        }
      }, 100);
    } catch (err: any) {
      console.error('Error setting up speech recognition:', err);
      let errorMsg = 'Failed to start recording. ';
      if (err.message) {
        errorMsg += err.message;
      } else {
        errorMsg += 'Please try again.';
      }
      setError(errorMsg);
      setIsListening(false);
      recognitionRef.current = null;
    }
  }, [isSupported, createRecognition]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        console.log('Stopping speech recognition...');
        recognitionRef.current.stop();
        // Don't set isListening to false here - let onend handle it
        // This ensures we capture any final results
      } catch (err) {
        console.error('Error stopping speech recognition:', err);
        setIsListening(false);
        recognitionRef.current = null;
      }
    } else {
      setIsListening(false);
    }
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    error,
    isSupported,
  };
};

