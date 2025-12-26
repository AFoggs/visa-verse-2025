import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Mic, MicOff, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { companionApi } from '../services/api';

function Companion() {
  const { userProfile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [pendingInterest, setPendingInterest] = useState(null);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversation history
  useEffect(() => {
    async function loadHistory() {
      try {
        const data = await companionApi.getHistory();
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        } else {
          // Initial greeting
          setMessages([
            {
              role: 'assistant',
              content: `Hi ${userProfile?.profile?.name || 'there'}! I'm your AI companion on 3Degrees. I'm here to chat, learn about you, and help you connect with locals and travelers. What's on your mind today?`,
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      } catch {
        // Initial greeting on error
        setMessages([
          {
            role: 'assistant',
            content: `Hi ${userProfile?.profile?.name || 'there'}! I'm your AI companion on VisaVerse. I'm here to chat, learn about you, and help you connect with locals and travelers. What's on your mind today?`,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    }
    loadHistory();
  }, [userProfile]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join('');
        setInput(transcript);
      };

      recognitionRef.current.onend = () => {
        setListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
    } else {
      recognitionRef.current?.start();
      setListening(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await companionApi.chat(userMessage.content);

      const assistantMessage = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Check if there's a detected interest
      if (response.detectedInterest) {
        setPendingInterest(response.detectedInterest);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "I'm having trouble connecting right now. Let's try again in a moment.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleInterestResponse = async (confirm) => {
    if (!pendingInterest) return;

    try {
      await companionApi.confirmInterest(pendingInterest, confirm);
      setPendingInterest(null);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: confirm
            ? `Great! I've added "${pendingInterest}" to your interests. This will help me find even better matches for you!`
            : `No problem! I won't add that as an interest. Let me know if you change your mind.`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Interest confirmation error:', error);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="bg-dark-700/50 border-b border-dark-600 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center">
            <Sparkles className="text-white" size={24} />
          </div>
          <div>
            <h1 className="font-semibold">Your AI Companion</h1>
            <p className="text-dark-300 text-sm">Private conversation - only insights used for matching</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary-400 text-white'
                      : 'bg-dark-700 border border-dark-600'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-primary-200' : 'text-dark-400'
                    }`}
                  >
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading indicator */}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-dark-700 border border-dark-600 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Interest confirmation */}
          {pendingInterest && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-accent-400/10 border border-accent-400/20 rounded-2xl px-4 py-3">
                <p className="mb-3">
                  I noticed you seem interested in <strong>"{pendingInterest}"</strong>. Would you
                  like me to add it to your interests?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleInterestResponse(true)}
                    className="btn-success text-sm flex items-center gap-1"
                  >
                    <CheckCircle size={16} />
                    Yes, add it
                  </button>
                  <button
                    onClick={() => handleInterestResponse(false)}
                    className="btn-ghost text-sm flex items-center gap-1"
                  >
                    <XCircle size={16} />
                    No thanks
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-dark-700/50 border-t border-dark-600 px-4 py-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-2">
          {/* Voice input button */}
          {recognitionRef.current && (
            <button
              type="button"
              onClick={toggleListening}
              className={`btn-ghost p-3 ${listening ? 'text-red-400' : 'text-dark-300'}`}
            >
              {listening ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
          )}

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="input flex-1"
            disabled={loading}
          />

          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="btn-primary p-3"
          >
            <Send size={24} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default Companion;
