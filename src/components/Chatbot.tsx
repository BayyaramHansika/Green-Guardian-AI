import React, { useState, useRef, useEffect } from "react";
import { 
  MessageSquare, 
  Send, 
  X, 
  Sparkles, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Activity
} from "lucide-react";
import { ChatMessage } from "../types";

export const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [glow, setGlow] = useState(true);
  
  // Unified single AI Assistant history
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);

  // Voice Assistant states
  const [isListening, setIsListening] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Welcome Message Constant
  const welcomeText = "Hi there! I am your Green Guardian AI Assistant. I can help you with leaf pathology diagnostics, organic sprays, watering schedules, agritech metrics, and domestic crop-care. What plant concerns or questions can I help you troubleshoot today?";

  // Initialize Speech Recognition API
  useEffect(() => {
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        if (transcript) {
          setInputValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Sync messages list with initial welcome message if empty
  const currentMessages = messages.length > 0 ? messages : [
    {
      id: "welcome-ai",
      role: "model" as const,
      text: welcomeText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
  ];

  // Scroll to bottom on modifications
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages, loading]);

  // Cancel any TTS reading if closed
  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMsgId(null);
  }, [isOpen]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMsgId(null);

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    // Append user message to active history list
    const nextHistory = [...currentMessages, userMsg];
    setMessages(nextHistory);
    setInputValue("");
    setLoading(true);

    try {
      // Maps to only user/model parameters (omits welcome node if it causes schema noise)
      // Exclude the initial greeting message if it was fallback welcome code
      const formattedHistory = nextHistory
        .filter(m => m.id !== "welcome-ai")
        .map((m) => ({
          role: m.role,
          text: m.text,
        }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: formattedHistory,
          professional: "general" // Keep param for server route backwards compatibility
        }),
      });

      if (!res.ok) throw new Error("Invalid chatbot service response");

      const data = await res.json();
      const replyText = data.text || "I was unable to assess your query. Please restate it.";

      const aiMsg: ChatMessage = {
        id: Math.random().toString(),
        role: "model",
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => {
        const activeBase = prev.length > 0 ? prev : nextHistory;
        return [...activeBase, aiMsg];
      });

      // Auto-Read Aloud if enabled
      if (isTtsEnabled) {
        speakResponseText(replyText, aiMsg.id);
      }

    } catch (err) {
      console.error(err);
      const errReply: ChatMessage = {
        id: Math.random().toString(),
        role: "model",
        text: "I encountered an integration issue connecting to our agricultural network. Please verify that your platform has stable connectivity.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => {
        const activeBase = prev.length > 0 ? prev : nextHistory;
        return [...activeBase, errReply];
      });
    } finally {
      setLoading(false);
    }
  };

  // Toggle speech recording
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech-to-Text input requires microphone permission or is not fully supported in this iframe. Try opening the application in a new browser tab to activate!");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Start speech failed:", err);
      }
    }
  };

  // TTS Voice Output execution
  const speakResponseText = (text: string, msgId: string) => {
    if (!("speechSynthesis" in window)) return;

    // Toggle off if clicking the same message that's currently speaking
    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Clean markdown, emojis, asterisks and symbols for cleaner spoken audio
    const cleanedText = text
      .replace(/[*#_\-`~\[\]]/g, "")
      .replace(/[🌿🍅🐜🍋🌸🌾🧪👨🕵🔬👩💻🏥]/g, "");

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.volume = 1.0;
    utterance.rate = 1.0;
    
    utterance.onend = () => {
      setSpeakingMsgId(null);
    };
    utterance.onerror = () => {
      setSpeakingMsgId(null);
    };

    // Try finding a suitable English speaker voice
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const preferred = voices.find(v => v.lang.startsWith("en-US") || v.lang.startsWith("en-GB")) || voices[0];
      utterance.voice = preferred;
    }

    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Handcrafted preset suggestions to guide simple queries
  const getQuickPrompts = () => {
    return [
      "🌿 Leaf Yellowing spots", 
      "🐛 Stop garden spider mites", 
      "🧪 Balanced NPK ratios", 
      "🍅 Prevent blossom rot"
    ];
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    setGlow(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[999] font-sans antialiased text-stone-850">
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className={`flex items-center justify-center w-14 h-14 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white shadow-lg cursor-pointer transition-transform hover:scale-105 duration-200 relative ${
            glow ? "animate-pulse ring-4 ring-emerald-500/30" : ""
          }`}
          title="Consult AI Care Assistant"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-teal-400 rounded-full flex items-center justify-center text-[10px] font-bold text-white border border-white">
          </span>
        </button>
      )}

      {/* Chat window panel */}
      {isOpen && (
        <div className="flex flex-col w-85 sm:w-96 h-[520px] bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300">
          
          {/* Main Top Header */}
          <div className="bg-emerald-850 text-white p-4 flex items-center justify-between border-b border-emerald-950 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-950 flex items-center justify-center text-xl shadow-inner border border-emerald-800">
                🤖
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-xs sm:text-sm tracking-tight leading-tight">
                    Green Guardian AI
                  </h3>
                  <Sparkles className="w-3 h-3 text-amber-300" />
                </div>
                <p className="text-[10px] text-emerald-200 font-semibold tracking-wide">
                  Autonomous Plant Care Assistant
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* TTS Global Toggle */}
              <button
                type="button"
                onClick={() => {
                  setIsTtsEnabled(!isTtsEnabled);
                  if (speakingMsgId && !isTtsEnabled === false) {
                    window.speechSynthesis.cancel();
                    setSpeakingMsgId(null);
                  }
                }}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isTtsEnabled 
                    ? "text-amber-300 bg-emerald-800/60" 
                    : "text-emerald-300 hover:text-white hover:bg-emerald-800/40"
                }`}
                title={isTtsEnabled ? "Mute Voice Reading" : "Enable Auto-Voice Reading"}
              >
                {isTtsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-emerald-250 hover:text-white p-1.5 hover:bg-emerald-800/40 rounded-lg cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          <>
            {/* Message History area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-stone-50 dark:bg-stone-950">
              {currentMessages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[85%] ${
                      isUser ? "ml-auto items-end" : "mr-auto items-start"
                    }`}
                  >
                    <div className="flex items-end gap-1.5">
                      {!isUser && (
                        <div className="w-6 h-6 rounded-lg bg-teal-500/10 flex items-center justify-center text-xs shrink-0 select-none border border-teal-500/10">
                          🤖
                        </div>
                      )}
                      <div
                        className={`p-3 rounded-2xl text-xs whitespace-pre-line leading-relaxed shadow-sm relative group ${
                          isUser
                            ? "bg-emerald-700 text-white rounded-tr-none font-medium"
                            : "bg-white dark:bg-stone-900 text-stone-850 dark:text-stone-150 rounded-tl-none border border-stone-200 dark:border-stone-800"
                        }`}
                      >
                        {msg.text}

                        {/* Individual Message TTS Playback Button */}
                        {!isUser && (
                          <button
                            type="button"
                            onClick={() => speakResponseText(msg.text, msg.id)}
                            className={`absolute -bottom-2.5 -right-2 p-1 bg-white dark:bg-stone-800 border border-stone-250 dark:border-stone-700 rounded-lg text-stone-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:shadow-md transition-all cursor-pointer ${
                              speakingMsgId === msg.id ? "text-emerald-600 animate-pulse bg-emerald-50" : "opacity-0 group-hover:opacity-100"
                            }`}
                            title={speakingMsgId === msg.id ? "Stop reading" : "Read message response aloud"}
                          >
                            <Volume2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <span className="text-[9px] text-stone-400 mt-1 px-1">{msg.timestamp}</span>
                  </div>
                );
              })}

              {/* AI Loading state */}
              {loading && (
                <div className="flex flex-col max-w-[80%] mr-auto items-start">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-lg bg-teal-500/10 flex items-center justify-center text-xs shrink-0 select-none">
                      🤖
                    </div>
                    <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-tl-none flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-700 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-emerald-700 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-emerald-700 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Scroll Anchor */}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts Suggestions */}
            {currentMessages.length <= 1 && (
              <div className="bg-stone-100 dark:bg-stone-950 px-3.5 py-2 flex gap-1.5 flex-wrap border-t border-stone-250 dark:border-stone-800 shrink-0 select-none">
                {getQuickPrompts().map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="text-[10px] bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-full px-2.5 py-1 text-stone-600 dark:text-stone-300 hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Interactive Audio Signal Indicator when Speech recognition is active */}
            {isListening && (
              <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/15 flex items-center gap-2.5 text-xs text-red-600 dark:text-red-400 font-bold tracking-tight shrink-0 select-none">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                <Activity className="w-4.5 h-4.5 text-red-500 animate-pulse shrink-0" />
                <span className="animate-pulse">Listening to voice input... speak clearly</span>
              </div>
            )}

            {/* Form Input Row */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputValue);
              }}
              className="p-3 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex items-center gap-1.5 shrink-0"
            >
              {/* Voice Dictation Speech-to-Text Button */}
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  isListening 
                    ? "bg-red-500/10 border-red-400 text-red-600" 
                    : "bg-stone-50 hover:bg-stone-100 border-stone-200 dark:bg-stone-950 dark:border-stone-800 text-stone-500 dark:text-stone-400 hover:text-emerald-600"
                }`}
                title={isListening ? "Listening... click to stop" : "Speak Message (Voice Assistant Input)"}
              >
                {isListening ? <MicOff className="w-4.5 h-4.5 animate-bounce" /> : <Mic className="w-4.5 h-4.5" />}
              </button>

              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask Green Guardian..."
                className="flex-1 text-xs px-3 py-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-stone-900 dark:text-white text-stone-950"
              />

              <button
                type="submit"
                disabled={!inputValue.trim() || loading}
                className="p-2.5 bg-emerald-700 disabled:bg-stone-200 dark:disabled:bg-stone-900 disabled:text-stone-400 text-white rounded-xl hover:bg-emerald-800 transition-colors disabled:cursor-not-allowed cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </>

        </div>
      )}
    </div>
  );
};
