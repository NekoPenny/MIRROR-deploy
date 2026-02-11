
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Mic, CornerDownLeft, Sparkles, FileText, CheckCircle2, Loader2, Plus } from 'lucide-react';
import { useAppContext } from '../App';
import BlobBackground from '../components/BlobBackground';
import { startChatSession, analyzeChatSession, isRateLimitError, getPhotoEmotions } from '../services/geminiService';
import { Chat } from "@google/genai";
import { AppRoute, MoodEntry } from '../types';

interface Message {
  role: 'user' | 'model';
  text: string;
  image?: string; 
  isHero?: boolean;
}

const ChatPage: React.FC = () => {
  const { user, addToHistory, t, currentEntry } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  // Contexts
  const { alertContext, imageContext, reflectionTrigger, journalingMode } = location.state || {};
  
  const isHighHeartRate = alertContext === 'high_heart_rate';
  const isJournaling = journalingMode === true;
  const aiEnabled = user.preferences.aiEnabled;

  useEffect(() => {
    if (!chatSessionRef.current && !hasInitialized.current) {
        hasInitialized.current = true;

        let contextMsg = "User just opened the chat interface.";
        
        if (isHighHeartRate) {
            contextMsg = "High Heart Rate Detected (Non-exercise). User clicked notification.";
        } else if (imageContext) {
            contextMsg = "User uploaded a photo to their journal and wants to discuss it. The photo is provided in the chat history.";
        } else if (reflectionTrigger) {
            contextMsg = "User is reviewing their weekly trends.";
        } else if (isJournaling) {
            contextMsg = `User is in 'Journaling Mode'. 
            Current State: Mood=${currentEntry.moodType}, Intensity=${currentEntry.intensity}/100.
            The user just uploaded a photo to document this moment.
            YOUR GOAL: Guide the user to reflect on this photo and their feelings. Ask 1 gentle question at a time.`;
        }

        // Initialize Chat
        const chat = startChatSession(user.name, contextMsg, isHighHeartRate, user.preferences.language, aiEnabled);
        chatSessionRef.current = chat;

        // Initial Greeting / Trigger
        const initChat = async () => {
            setLoading(true);
            try {
                if (isJournaling && currentEntry.image) {
                     // 1. Show the Image in the UI immediately
                     setMessages([{
                         role: 'user',
                         text: '',
                         image: currentEntry.image,
                         isHero: true
                     }]);

                     // 2. Parallel: Send Image to Chat for question AND Analyze Image for Tags
                     const base64Data = currentEntry.image.replace(/^data:image\/\w+;base64,/, "");
                     const mimeMatch = currentEntry.image.match(/^data:([^;]+);/);
                     const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

                     // A: Get opening question
                     const prompt = `[SYSTEM TRIGGER] User uploaded this photo. They feel ${currentEntry.moodType} (Intensity ${currentEntry.intensity}/100). Ask a warm, short question to help them describe what is happening in the photo and why they feel this way.`;
                     
                     let chatResult: any;
                     if (aiEnabled) {
                         chatResult = await chat.sendMessage({
                             contents: [
                                 { text: prompt },
                                 { inlineData: { mimeType, data: base64Data } }
                             ]
                         });
                     } else {
                         // Mock response for image chat offline
                         chatResult = { text: "I see the photo. How does it make you feel?" };
                     }

                     // B: Get emotion tags (Independent call)
                     const tagsPromise = getPhotoEmotions(
                         currentEntry.image, 
                         currentEntry.moodType || 'Neutral', 
                         user.preferences.language,
                         aiEnabled
                     );

                     const [tagsResult] = await Promise.all([tagsPromise]);
                     
                     setMessages(prev => [...prev, { role: 'model', text: chatResult.text || t('chat.image_msg') }]);
                     setSuggestedTags(tagsResult);

                } else if (isHighHeartRate) {
                    const result = await chat.sendMessage({ message: "The user's heart rate is high. Start the conversation gently." });
                    setMessages([{ role: 'model', text: result.text || t('chat.high_hr_msg') }]);
                } else {
                    // Standard Greeting
                    const result = await chat.sendMessage({ message: "Start the conversation naturally." });
                    setMessages([{ role: 'model', text: result.text || t('chat.welcome_message', { name: user.name || 'Friend' }) }]);
                }
            } catch (e) {
                console.error("Chat Init Error", e);
                const fallback = isHighHeartRate ? t('chat.high_hr_error') : t('chat.connection_error');
                setMessages(prev => [...prev, { role: 'model', text: fallback }]);
            } finally {
                setLoading(false);
            }
        };

        initChat();
    }
  }, [alertContext, imageContext, isHighHeartRate, reflectionTrigger, isJournaling, user.name, user.preferences.language, currentEntry, t, aiEnabled]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!inputText.trim() || !chatSessionRef.current) return;

    const userMsg = inputText;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInputText('');
    setLoading(true);

    try {
        const result = await chatSessionRef.current.sendMessage({ message: userMsg });
        const responseText = result.text || "...";
        setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (e: any) {
        if (isRateLimitError(e)) {
             setMessages(prev => [...prev, { role: 'model', text: t('chat.rate_limit') }]);
        } else {
             setMessages(prev => [...prev, { role: 'model', text: t('chat.connection_error') }]);
        }
    } finally {
        setLoading(false);
    }
  };

  const handleTagClick = (tag: string) => {
      // Append tag to input text
      const newText = inputText.trim() ? `${inputText} ${tag}` : tag;
      setInputText(newText);
  };

  const handleLogEntry = async () => {
      setAnalyzing(true);
      
      // Convert chat history to string
      const chatHistoryText = messages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
      
      // Analyze
      const analysis = await analyzeChatSession(chatHistoryText, user.preferences.language, aiEnabled);
      
      const finalEntry: MoodEntry = {
          ...(currentEntry as MoodEntry),
          id: Date.now().toString(),
          timestamp: new Date(),
          // Use current selections or fallbacks from analysis
          moodType: currentEntry.moodType || analysis.moodType || 'Pleasant',
          intensity: currentEntry.intensity || 50,
          emotions: analysis.emotions && analysis.emotions.length > 0 ? analysis.emotions : (currentEntry.emotions || []),
          // Use the chat summary as the note
          note: analysis.summary,
          aiAnalysis: analysis.summary,
          advice: analysis.advice,
          image: currentEntry.image // Ensure image is preserved
      };

      addToHistory(finalEntry);
      
      // Small delay for UX
      setTimeout(() => {
          navigate(AppRoute.DASHBOARD);
      }, 800);
  };

  return (
    <BlobBackground mood={currentEntry.moodType || 'Pleasant'}>
      <div className="flex flex-col h-full min-h-0 relative font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-12 pb-4 z-10 relative bg-[#FFFDF7]/90 backdrop-blur-sm border-b border-gray-50/50">
             <button type="button" onClick={() => navigate(AppRoute.DASHBOARD)} className="btn-icon -ml-1">
                <ChevronLeft size={24} strokeWidth={2} />
             </button>
             
             {/* Center Brand or Mode */}
             {isJournaling ? (
                 <span className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase flex items-center gap-1">
                    <FileText size={10} /> {t('chat.log')}
                 </span>
             ) : (
                 <span className="text-[10px] font-bold tracking-[0.2em] text-gray-300 uppercase">{t('chat.brand')}</span>
             )}

             {/* Right Action: Log Button for Journaling Mode */}
             {isJournaling ? (
                 <button 
                    onClick={handleLogEntry}
                    disabled={analyzing}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C83025] text-white rounded-full text-xs font-bold shadow-md hover:bg-[#b02a20] transition-colors disabled:opacity-70"
                 >
                    {analyzing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                    {analyzing ? t('chat.saving') : t('chat.log')}
                 </button>
             ) : (
                <div className="w-8"></div>
             )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 min-h-0 flex flex-col relative z-10 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-4 pb-4">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`mb-6 flex ${msg.role === 'model' ? 'justify-start' : 'justify-end'}`}>
                        {/* Special Rendering for Hero Image */}
                        {msg.isHero && msg.image ? (
                            <div className="w-full max-w-[85%] ml-auto mb-2 animate-in zoom-in duration-500">
                                <div className="rounded-2xl overflow-hidden shadow-lg border-2 border-white">
                                    <img src={msg.image} alt="Journal Entry" className="w-full h-auto object-cover" />
                                </div>
                            </div>
                        ) : (
                            <div className={`max-w-[85%] px-5 py-4 rounded-2xl text-lg leading-relaxed shadow-sm ${
                                msg.role === 'user' 
                                ? 'bg-black text-white rounded-tr-sm ml-auto' 
                                : 'bg-[#F9F9F9] text-gray-800 rounded-tl-sm border border-gray-100'
                            }`}>
                                {msg.text}
                            </div>
                        )}
                    </div>
                ))}
                
                {loading && (
                    <div className="flex justify-start mb-6 animate-in fade-in duration-300">
                        <div className="bg-[#F9F9F9] px-5 py-4 rounded-2xl rounded-tl-sm border border-gray-100 flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} className="h-4" />
            </div>
        </div>

        {/* Suggested Tags (If Journaling & Tags exist) */}
        {isJournaling && suggestedTags.length > 0 && (
            <div className="px-4 pb-2 z-20">
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                    <div className="flex items-center gap-1 px-2">
                        <Sparkles size={12} className="text-[#C83025]" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Suggestions</span>
                    </div>
                    {suggestedTags.map((tag, i) => (
                        <button
                            key={i}
                            onClick={() => handleTagClick(tag)}
                            className="flex-shrink-0 px-3 py-1.5 bg-gray-50 border border-gray-100 hover:bg-white hover:border-gray-300 text-xs font-medium text-gray-600 rounded-full transition-colors flex items-center gap-1 shadow-sm"
                        >
                            {tag} <Plus size={10} className="opacity-50" />
                        </button>
                    ))}
                </div>
            </div>
        )}

        {/* Input Area */}
        <div className="px-4 pb-8 z-20 pt-1">
            <div className="bg-gray-50/80 backdrop-blur-sm rounded-[2.5rem] p-2 relative shadow-inner border border-gray-100 transition-all focus-within:bg-white focus-within:shadow-[0_4px_20px_rgba(0,0,0,0.05)] focus-within:border-gray-200">
                <div className="px-4 pt-3 pb-2 relative min-h-[3.5rem] flex items-center">
                    <input 
                        type="text" 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={t('chat.input_placeholder')}
                        className="w-full bg-transparent text-lg font-medium text-black placeholder-gray-400 outline-none pl-1"
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        autoFocus
                    />
                </div>

                <div className="flex items-center justify-between px-2 pb-1">
                    <button className="text-gray-400 hover:text-gray-600 transition-colors p-2">
                        <Mic size={22} strokeWidth={2} />
                    </button>
                    <button 
                        onClick={handleSend}
                        disabled={!inputText.trim()}
                        className={`
                            w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm transition-all duration-300
                            ${inputText.trim() ? 'bg-black scale-100' : 'bg-gray-200 scale-90 opacity-50'}
                        `}
                    >
                        <CornerDownLeft size={18} strokeWidth={3} />
                    </button>
                </div>
            </div>
        </div>

      </div>
    </BlobBackground>
  );
};

export default ChatPage;
