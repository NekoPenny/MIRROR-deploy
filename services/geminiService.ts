import { GoogleGenAI, Chat, GenerateContentResponse, Type } from "@google/genai";

const getApiKey = (): string | undefined => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    if ((import.meta as any).env.VITE_GEMINI_API_KEY) return (import.meta as any).env.VITE_GEMINI_API_KEY;
    if ((import.meta as any).env.API_KEY) return (import.meta as any).env.API_KEY; 
  }

  if (typeof process !== 'undefined' && process.env) {
    if (process.env.VITE_GEMINI_API_KEY) return process.env.VITE_GEMINI_API_KEY;
    if (process.env.NEXT_PUBLIC_GEMINI_API_KEY) return process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (process.env.API_KEY) return process.env.API_KEY;
  }
  
  return undefined;
};

const apiKey = getApiKey();

/** 是否使用代理（无客户端 API Key 时走服务端代理，API Key 不暴露） */
const useProxy = (): boolean => !apiKey || !String(apiKey).trim();

/** 调用服务端 /api/gemini 代理 */
async function callProxy<T = unknown>(action: string, payload: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Proxy error: ${res.status}`);
  }
  return res.json();
}

if (!apiKey && import.meta.env?.DEV) {
  console.warn("[Mirror] 未配置客户端 API Key，AI 将尝试走 /api/gemini 代理；无代理时使用兜底。生产部署建议仅设置 GEMINI_API_KEY。");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" }); 

// Primary model; fallback for image/multimodal when preview not available
const TEXT_MODEL_NAME = 'gemini-3-flash-preview';
const FALLBACK_IMAGE_MODEL = 'gemini-2.0-flash';

// --- MOCK DATABASE (OFFLINE MODE) - CHINESE TRANSLATION ---
const MOCK_DB = {
  insights: [
    "情绪如潮水，时而平静，时而汹涌，皆是生命之美。",
    "情绪有时反应的是内心的需求。",
    "允许一切发生，接纳所有情绪，与自己和解，才是真正的强大。",
    "深呼吸。现在你已经很棒了。",
    "每天即使只做出微小的改变就已经足够。",
    "你已经做的很好了，辛苦了！",
    "悟已往之不谏，知来者之可追。",
    "给自己点时间，不要着急。",
    "跳出舒适圈是成长的第一步。"
  ],
  questions: [
    { q: "今天发生的一件让你快乐的小事是什么？", opts: ["一桌美食", "一次愉快的对话", "一段安静的时光"] },
    { q: "现在你心里最重的事情是什么？", opts: ["工作压力", "人际关系问题", "对未来的不确定"] },
    { q: "如果你能改变今天的某件事，那会是什么？", opts: ["我在面对情绪时的反应", "我的精力状态", "没什么，今天还好"] },
    { q: "你的身体现在需要什么？", opts: ["休息", "运动", "情绪慰藉"] }
  ],
  goals: [
    "情绪激动时深呼吸 3 次。",
    "起身走一圈去接一杯水。",
    "出去呼吸新鲜空气。",
    "想出 3 件令你愉悦的事。",
    "闭上眼放松 2 分钟。",
    "放下手机 10 分钟。"
  ],
  emotions: {
    Pleasant: ["快乐", "感激", "满足", "乐观"],
    Stressful: ["不知所措", "紧张", "焦虑", "精疲力尽"],
    Calm: ["平和", "放松", "宁静", "平衡"],
    Thrilled: ["兴奋", "精力充沛", "受启发", "充满活力"],
    Irritating: ["恼火", "沮丧", "烦扰", "怨恨"]
  } as Record<string, string[]>,
  chatResponses: [
    "原来是这样，你还想再跟我说说吗？",
    "你的感觉如何呢？",
    "我在陪着你呢，不着急，慢慢来。",
    "有这种感觉是正常的。情绪有时往往很复杂。",
    "那现在做什么能让你感觉好一些呢？"
  ]
};

/** 按心情类型导出预设情绪词，供情绪选择界面使用 */
export const DEFAULT_EMOTIONS_BY_MOOD: Record<string, string[]> = MOCK_DB.emotions;

const getRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// --- Helper Functions ---

const cleanJsonString = (text: string): string => {
  if (!text) return "[]";
  let clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
  return clean;
};

export const isRateLimitError = (error: any) => {
  return error?.status === 429 || 
    error?.code === 429 || 
    String(error?.message).includes('429') || 
    String(error?.message).includes('quota') ||
    String(error?.message).includes('RESOURCE_EXHAUSTED');
};

const handleApiError = (context: string, error: any, fallbackValue: any) => {
  if (isRateLimitError(error)) {
    console.warn(`[GeminiService] ⚠️ ${context}: Quota exceeded (429). Using fallback content.`);
  } else {
    console.error(`[GeminiService] ❌ ${context}:`, error);
  }
  return fallbackValue;
};

// --- Core Features ---

/** 代理模式下的 Chat 封装，通过 /api/gemini 的 chatSend 无状态发送 */
class ProxyChat {
  private messages: { role: string; text?: string; image?: string }[] = [];
  constructor(
    private systemInstruction: string,
    private language: string
  ) {}

  async sendMessage(params: { message?: string; contents?: any }): Promise<{ text: string }> {
    const text = params.message ?? (params.contents?.find((p: any) => p.text)?.text ?? '');
    const imgPart = params.contents?.find((p: any) => p.inlineData);
    const userMsg: { role: string; text?: string; image?: string } = { role: 'user' };
    if (text) userMsg.text = text;
    if (imgPart?.inlineData) {
      const { data, mimeType } = imgPart.inlineData;
      userMsg.image = `data:${mimeType || 'image/jpeg'};base64,${data}`;
    }
    this.messages.push(userMsg);
    const out = await callProxy<{ text: string }>('chatSend', {
      systemInstruction: this.systemInstruction,
      messages: this.messages,
      language: this.language,
    });
    this.messages.push({ role: 'model', text: out.text });
    return { text: out.text };
  }
}

// Helper class to mock the GoogleGenAI Chat object
class MockChat {
  constructor(private userName: string) {}
  
  async sendMessage(params: { message?: string, contents?: any }) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Simple logic to make it feel slightly responsive
    const msg = params.message || (params.contents && params.contents[0]?.text) || "";
    let responseText = getRandom(MOCK_DB.chatResponses);

    if (msg.toLowerCase().includes("hello") || msg.toLowerCase().includes("hi") || msg.includes("你好") || msg.includes("哈喽")) {
        responseText = `你好呀 ${this.userName}。我在听呢。`;
    } else if (msg.length < 2) {
        responseText = "能再跟我说说吗？";
    }

    return { text: responseText };
  }
}

export const startChatSession = (userName: string, context: string, isHeartRateAlert: boolean = false, language: string = 'English', aiEnabled: boolean = true): Chat | any => {
  if (!aiEnabled) {
      return new MockChat(userName || "朋友");
  }

  const nameToUse = userName || 'Friend';
  let systemInstruction = `You are Mirror, an empathetic emotional companion for ${nameToUse}. 
      Your goal is to listen to the user, validate their feelings, and provide gentle insights.
      
      CRITICAL: REPLY IN ${language.toUpperCase()}.

      CRITICAL STYLE INSTRUCTIONS:
      1. Speak like a real, supportive friend. 
      2. Use simple, everyday, grounded language.
      3. DO NOT use flowery, poetic, abstract, or overly dramatic words.
      4. Avoid "therapist-speak" (like "I hear you saying..."). Just talk naturally.
      5. Keep responses CONCISE (max 40 words or 2-3 short sentences).
      
      If this is the start of the conversation, your first priority is to gently ask how the user is feeling right now.
      
      Context of current feeling: ${context}.`;

  if (isHeartRateAlert) {
    systemInstruction += `
    CRITICAL CONTEXT: The user's watch detected a high heart rate while they were NOT exercising.
    1. Ask if they are okay immediately.
    2. Guide them to identify if it's stress or excitement.
    `;
  }

  if (useProxy()) {
    return new ProxyChat(systemInstruction, language);
  }

  return ai.chats.create({
    model: TEXT_MODEL_NAME,
    config: { systemInstruction },
  });
};

export const startWeeklyReflectionSession = (
    userName: string, 
    mbti: string, 
    weeklyHistory: any[], 
    language: string = 'English', 
    openingAnswer: string = '',
    aiEnabled: boolean = true
): Chat | any => {
    if (!aiEnabled) {
        return new MockChat(userName || "朋友");
    }

    const nameToUse = userName || 'Friend';
    const historyContext = weeklyHistory.map(h => 
        `[${new Date(h.timestamp).toLocaleString()}] Mood: ${h.moodType}, Categories: ${h.categories?.join(',')}, Goal: ${h.growthGoal?.text}`
    ).join('\n');

    const systemInstruction = `
    You are "Claire" (Mirror), a professional reflection coach conducting a "Weekly Depth Review".
    User: ${nameToUse}. MBTI: ${mbti}.
    Language: ${language}.
    
    WEEKLY DATA:
    ${historyContext}

    CONTEXT: The user has just answered a deep reflection question.
    User's Answer: "${openingAnswer}"

    YOUR GOAL:
    Continue the conversation from their answer. Guide them through a Socratic reflection on their week.

    CRITICAL STYLE:
    1. **SHORT & CONVERSATIONAL**: Max 40-50 words.
    2. Be warm and casual. NO POETRY. NO ABSTRACT METAPHORS.
    3. Use direct, spoken language.
    `;

    if (useProxy()) {
        return new ProxyChat(systemInstruction, language);
    }

    return ai.chats.create({
        model: TEXT_MODEL_NAME,
        config: { systemInstruction },
    });
};

export const analyzePanicEntry = async (
    image: string | null, 
    sensations: string[], 
    language: string = 'English', 
    aiEnabled: boolean = true
): Promise<{ moodType: 'Stressful' | 'Thrilled' | 'Calm', summary: string, advice: string, emotions: string[] }> => {
    const fallback = {
        moodType: 'Stressful' as const,
        summary: '你的身体感到有些不适。',
        advice: '深呼吸，慢慢喝杯水。这感觉会过去的。',
        emotions: ['紧张', '不安']
    };

    if (!aiEnabled) {
        await new Promise(r => setTimeout(r, 1000));
        return fallback;
    }

    try {
        const prompt = `
            User detected a High Heart Rate event.
            Context:
            - User selected Tags: ${sensations.join(', ') || 'None reported'}
            ${image ? '- User provided a photo of their surroundings.' : ''}

            TASK:
            1. Analyze the input to determine if this is Negative (Panic/Anxiety/Stress) OR Positive (Excitement/Thrill/Joy).
            2. If tags include words like "Excited", "Surprised", "Energetic", "Happy", classify as "Thrilled".
            3. If tags include "Anxious", "Scared", "Lost", classify as "Stressful".
            4. Provide a very short, grounding summary (2nd person).
            5. Provide 1 specific, immediate action advice.
               - If Stressful: Grounding technique (breathing).
               - If Thrilled: Savoring technique (capture the moment, share it).

            Return JSON: { moodType: "Stressful" | "Thrilled", summary: string, advice: string, emotions: string[] }
            Language: ${language}.
        `;

        const parts: any[] = [{ text: prompt }];
        if (image) {
             const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
             const mimeMatch = image.match(/^data:([^;]+);/);
             const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
             parts.push({ inlineData: { mimeType, data: base64Data } });
        }

        const response = await ai.models.generateContent({
            model: TEXT_MODEL_NAME,
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        moodType: { type: Type.STRING, enum: ['Stressful', 'Thrilled', 'Calm'] },
                        summary: { type: Type.STRING },
                        advice: { type: Type.STRING },
                        emotions: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        });

        return JSON.parse(cleanJsonString(response.text || JSON.stringify(fallback)));
    } catch (error) {
        return handleApiError("analyzePanicEntry", error, fallback);
    }
};

export const generateWeeklyInsightQuestion = async (
    userName: string, 
    mbti: string, 
    weeklyHistory: any[], 
    language: string = 'English',
    aiEnabled: boolean = true
): Promise<{ question: string, options: string[] }> => {
    const fallback = getRandom(MOCK_DB.questions);
    
    if (!aiEnabled) {
        await new Promise(r => setTimeout(r, 1000));
        return { question: fallback.q, options: fallback.opts };
    }

    if (weeklyHistory.length === 0) return { question: fallback.q, options: fallback.opts };

    try {
        const historyContext = weeklyHistory.map(h => 
            `Mood: ${h.moodType}, Tags: ${h.categories?.join(',')}`
        ).join('; ');

        const prompt = `
            User: ${userName} (${mbti}).
            Weekly History: ${historyContext}

            TASK: 
            1. Generate ONE single, deep, therapeutic question to help the user reflect on their entire week's pattern.
            2. Provide 3 short, first-person starting sentences (options) for their answer.

            CRITICAL: The question must be short (max 20 words), warm, and use simple everyday language. Avoid poetic metaphors.
            Language: ${language}.

            Return JSON.
        `;

        const response = await ai.models.generateContent({
            model: TEXT_MODEL_NAME,
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        question: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        });
        return JSON.parse(cleanJsonString(response.text || JSON.stringify({ question: fallback.q, options: fallback.opts })));
    } catch (error) {
        return handleApiError("generateWeeklyInsightQuestion", error, { question: fallback.q, options: fallback.opts });
    }
};

export const generateInsight = async (userName: string, recentHistory: any[], language: string = 'English', aiEnabled: boolean = true): Promise<string> => {
  if (!aiEnabled) {
      await new Promise(r => setTimeout(r, 500));
      return getRandom(MOCK_DB.insights);
  }
  if (useProxy()) {
    try {
      const { text } = await callProxy<{ text: string }>('generateInsight', {
        userName,
        recentHistory,
        language,
        aiEnabled: true,
      });
      return text || getRandom(MOCK_DB.insights);
    } catch (e) {
      return handleApiError('generateInsight', e, getRandom(MOCK_DB.insights));
    }
  }

  try {
    const historySummary = recentHistory.map(h => `${new Date(h.timestamp).toDateString()}: ${h.moodType} (${h.emotions.join(', ')})`).join('\n');
    
    const prompt = `
        You are Mirror, a thoughtful AI companion. User: ${userName || 'Friend'}. 
        Recent History: ${historySummary}. 
        Task: Generate a single, supportive daily insight for this user. 
        CRITICAL STYLE:
        - Keep it under 30 words.
        - Use simple, conversational, grounded language.
        - DO NOT use flowery poetry, abstract riddles, or "fortune cookie" style.
        - Speak like a caring friend.
        Language: ${language}.`;
    
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: prompt,
    });
    return response.text?.trim() || getRandom(MOCK_DB.insights);
  } catch (error) {
    return handleApiError("generateInsight", error, getRandom(MOCK_DB.insights));
  }
};

export const getSuggestedEmotions = async (mood: string, cause: string, language: string = 'English', aiEnabled: boolean = true): Promise<string[]> => {
  if (!aiEnabled) {
      const moodKey = mood as keyof typeof MOCK_DB.emotions;
      return MOCK_DB.emotions[moodKey] || MOCK_DB.emotions['Pleasant'];
  }

  if (!cause.trim()) return [];
  try {
    const prompt = `Suggest 12 specific single-word emotional adjectives for a user feeling ${mood} because: "${cause}". Return JSON array of strings. The adjectives MUST be in ${language} and use common, easy-to-understand words.`;
    const response = await ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    });
    return JSON.parse(cleanJsonString(response.text || "[]"));
  } catch (error) {
    return handleApiError("getSuggestedEmotions", error, []);
  }
};

export const getPhotoEmotions = async (image: string, mood: string, language: string = 'English', aiEnabled: boolean = true): Promise<string[]> => {
  if (!aiEnabled) {
      const moodKey = mood as keyof typeof MOCK_DB.emotions;
      return MOCK_DB.emotions[moodKey] || ["捕捉", "瞬间", "回忆", "静止"];
  }
  if (useProxy()) {
    try {
      const res = await callProxy<string[]>('getPhotoEmotions', { image, mood, language, aiEnabled: true });
      return res ?? [];
    } catch (e) {
      return handleApiError('getPhotoEmotions', e, []);
    }
  }
  if (!apiKey?.trim()) {
    const moodKey = mood as keyof typeof MOCK_DB.emotions;
    return MOCK_DB.emotions[moodKey] || ["捕捉", "瞬间", "回忆", "静止"];
  }

  try {
    const prompt = `Analyze this image in the context of the user feeling "${mood}". Suggest 6 precise emotional adjectives that describe the vibe of the photo. Return a JSON array of strings in ${language}. Use simple, common vocabulary.`;
    
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const mimeMatch = image.match(/^data:([^;]+);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    const response = await ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: {
        parts: [
            { text: prompt },
            { inlineData: { mimeType, data: base64Data } }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    });
    return JSON.parse(cleanJsonString(response.text || "[]"));
  } catch (error) {
    return handleApiError("getPhotoEmotions", error, []);
  }
};

export const analyzeImageMood = async (image: string, language: string = 'English', aiEnabled: boolean = true): Promise<{
    moodType: 'Pleasant' | 'Stressful' | 'Calm' | 'Thrilled' | 'Irritating',
    emotions: string[],
    vibeDescription: string
}> => {
  const fallback = { moodType: 'Pleasant' as const, emotions: ['瞬间', '感受', '生活'], vibeDescription: '被捕捉的时间切片。' };
  
  if (!aiEnabled) {
      await new Promise(r => setTimeout(r, 1500));
      return fallback;
  }
  if (useProxy()) {
    try {
      return await callProxy('analyzeImageMood', { image, language, aiEnabled: true });
    } catch (e) {
      return handleApiError('analyzeImageMood', e, fallback);
    }
  }
  if (!apiKey?.trim()) {
    if (import.meta.env?.DEV) console.warn('[Mirror] API Key 未配置，图片分析将使用兜底结果。');
    await new Promise(r => setTimeout(r, 800));
    return fallback;
  }

  try {
     const langPrompt = language === 'Chinese' ? 'Simplified Chinese (简体中文)' : language;
     const prompt = `
        Analyze the *emotional atmosphere* and *implied feelings* of this image (not just the visual objects).
        1. Classify the overall mood into EXACTLY ONE of: Pleasant, Stressful, Calm, Thrilled, Irritating.
        2. Provide 6-8 specific, evocative emotional keywords (single words) that a human might feel in this scene. DO NOT simply list objects like 'Tree' or 'Sky'. CRITICAL: Use ${langPrompt} only. Output emotion words in 简体中文 when Chinese.
        3. Write a very short (3-6 words) vibe description in ${langPrompt}. Make it simple and direct (e.g., "Warm afternoon light"), NOT abstract poetry.
        Return JSON.
     `;
     
     const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
     const mimeMatch = image.match(/^data:([^;]+);/);
     const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

     const tryModel = async (modelId: string) => {
       const res = await ai.models.generateContent({
         model: modelId,
         contents: {
           parts: [
             { text: prompt },
             { inlineData: { mimeType, data: base64Data } }
           ]
         },
         config: {
           responseMimeType: "application/json",
           responseSchema: {
             type: Type.OBJECT,
             properties: {
               moodType: { type: Type.STRING, enum: ['Pleasant', 'Stressful', 'Calm', 'Thrilled', 'Irritating'] },
               emotions: { type: Type.ARRAY, items: { type: Type.STRING } },
               vibeDescription: { type: Type.STRING }
             }
           }
         }
       });
       const t = (res as any).text != null ? (res as any).text : (res as any).candidates?.[0]?.content?.parts?.[0]?.text;
       return JSON.parse(cleanJsonString(t || JSON.stringify(fallback)));
     };

     try {
       return await tryModel(TEXT_MODEL_NAME);
     } catch (firstErr) {
       const msg = String((firstErr as Error)?.message ?? firstErr);
       if (msg.includes('404') || msg.includes('not found') || msg.includes('model') || msg.includes('Invalid')) {
         try {
           return await tryModel(FALLBACK_IMAGE_MODEL);
         } catch {
           return handleApiError("analyzeImageMood", firstErr, fallback);
         }
       }
       return handleApiError("analyzeImageMood", firstErr, fallback);
     }
  } catch (error) {
      if (import.meta.env?.DEV) console.warn('[Mirror] 图片分析失败，使用兜底:', (error as Error)?.message ?? error);
      return handleApiError("analyzeImageMood", error, fallback);
  }
};

export const generateUserPersona = async (name: string, mbti: string, quizAnswers: any, language: string = 'English', aiEnabled: boolean = true): Promise<string> => {
  const fallback = "你是一个拥有深刻感知能力的复杂灵魂。";
  
  if (!aiEnabled) {
      await new Promise(r => setTimeout(r, 1500));
      return fallback;
  }

  try {
    const prompt = `Create a simple, warm, and easy-to-understand "Emotional Essence" (max 30 words) for: ${name || 'Friend'}, MBTI: ${mbti}, Traits: ${JSON.stringify(quizAnswers)}. 
    Use clear, grounded, and supportive everyday language that feels like a warm hug.
    AVOID abstract metaphors, obscure poetry, or ancient philosophy style.
    CRITICAL: Respond strictly in ${language}.`;
    
    const response = await ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: prompt,
    });
    return response.text?.trim() || fallback;
  } catch (error) {
    return handleApiError("generateUserPersona", error, fallback);
  }
};

export const generateGuidanceQuestion = async (
    userName: string, 
    mbti: string, 
    mood: string, 
    tags: string[], 
    image: string | undefined, 
    language: string = 'English',
    aiEnabled: boolean = true
): Promise<{ question: string, options: string[] }> => {
    const fallback = getRandom(MOCK_DB.questions);
    
    if (!aiEnabled) {
        return { question: fallback.q, options: fallback.opts };
    }

    try {
        const prompt = `
            User: ${userName} (${mbti}).
            Current Mood: ${mood}.
            Context Tags: ${tags.join(', ')}.
            ${image ? 'User also uploaded an image.' : ''}

            TASK: 
            1. Generate ONE single, deep, therapeutic question to help the user deconstruct this feeling.
            2. Provide 3 short, first-person starting sentences (options) that the user might use to answer this question.

            GUIDELINES:
            1. If mood is Stressful/Irritating: Ask about control or triggers.
            2. If mood is Pleasant/Thrilled: Ask about savoring the moment.
            3. Use simple, direct, everyday language. Avoid complex metaphors or flowery speech.
            
            CRITICAL: The question must be short (max 20 words) and warm. Options must be short (max 10 words).
            Language: ${language}.

            Return JSON.
        `;

        const parts: any[] = [{ text: prompt }];
        if (image) {
             const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
             const mimeMatch = image.match(/^data:([^;]+);/);
             const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
             parts.push({ inlineData: { mimeType, data: base64Data } });
        }

        const response = await ai.models.generateContent({
            model: TEXT_MODEL_NAME,
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        question: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        });
        return JSON.parse(cleanJsonString(response.text || JSON.stringify({ question: fallback.q, options: fallback.opts })));
    } catch (error) {
        return handleApiError("generateGuidanceQuestion", error, { question: fallback.q, options: fallback.opts });
    }
};

export const analyzeChatSession = async (
  chatHistoryText: string,
  language: string = 'English',
  aiEnabled: boolean = true
): Promise<{
  moodType: 'Pleasant' | 'Stressful' | 'Calm' | 'Thrilled' | 'Irritating';
  emotions: string[];
  summary: string;
  advice: string;
}> => {
  const fallback = {
    moodType: 'Calm' as const,
    emotions: ['反思', '安静'],
    summary: '一段安静的对话。',
    advice: '花点时间深呼吸。'
  };

  if (!aiEnabled) {
    await new Promise(r => setTimeout(r, 1000));
    return fallback;
  }
  if (useProxy()) {
    try {
      return await callProxy('analyzeChatSession', { chatHistoryText, language, aiEnabled: true });
    } catch (e) {
      return handleApiError('analyzeChatSession', e, fallback);
    }
  }

  try {
    const prompt = `
      Analyze this chat session between Mirror (AI) and the user.
      Chat History:
      ${chatHistoryText}

      Task:
      1. Determine the user's overall mood (Pleasant, Stressful, Calm, Thrilled, Irritating).
      2. Identify 3-5 specific emotions.
      3. Summarize the user's situation/feelings in 1-2 sentences using simple, direct language.
      4. Provide 1 sentence of gentle, actionable advice.
      
      Respond in JSON. Language: ${language}.
    `;

    const response = await ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            moodType: { type: Type.STRING, enum: ['Pleasant', 'Stressful', 'Calm', 'Thrilled', 'Irritating'] },
            emotions: { type: Type.ARRAY, items: { type: Type.STRING } },
            summary: { type: Type.STRING },
            advice: { type: Type.STRING }
          }
        }
      }
    });

    return JSON.parse(cleanJsonString(response.text || JSON.stringify(fallback)));
  } catch (error) {
    return handleApiError("analyzeChatSession", error, fallback);
  }
};

export const analyzeMoodEntry = async (
  mood: string,
  cause: string,
  language: string = 'English',
  image?: string,
  aiEnabled: boolean = true
): Promise<{
  emotions: string[];
  summary: string;
}> => {
  const fallback = {
    emotions: [mood],
    summary: cause || mood
  };

  if (!aiEnabled) {
    await new Promise(r => setTimeout(r, 1000));
    return fallback;
  }
  if (useProxy()) {
    try {
      const res = await callProxy<{ emotions: string[]; summary: string }>('analyzeMoodEntry', {
        mood,
        cause,
        language,
        image,
        aiEnabled: true,
      });
      return res;
    } catch (e) {
      return handleApiError('analyzeMoodEntry', e, fallback);
    }
  }

  try {
    const prompt = `
      User feels ${mood} because: "${cause}".
      ${image ? "User also provided an image." : ""}
      
      Task:
      1. Identify 5 nuanced emotions related to this.
      2. Write a compassionate, short summary (1 sentence) acknowledging their feeling. Use simple, grounded language.
      
      Respond in JSON. Language: ${language}.
    `;

    const parts: any[] = [{ text: prompt }];
    if (image) {
       const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
       const mimeMatch = image.match(/^data:([^;]+);/);
       const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
       parts.push({ inlineData: { mimeType, data: base64Data } });
    }

    const response = await ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            emotions: { type: Type.ARRAY, items: { type: Type.STRING } },
            summary: { type: Type.STRING }
          }
        }
      }
    });

    return JSON.parse(cleanJsonString(response.text || JSON.stringify(fallback)));
  } catch (error) {
    return handleApiError("analyzeMoodEntry", error, fallback);
  }
};

export const generateDetailedReport = async (
  userName: string,
  history: any[],
  language: string = 'English',
  aiEnabled: boolean = true
): Promise<string> => {
  const fallback = "你的旅程显示出混合的情绪。继续记录以发现更多模式。";

  if (!aiEnabled || history.length === 0) {
    return fallback;
  }

  try {
    const historyText = history.map(h => 
      `${new Date(h.timestamp).toLocaleDateString()}: ${h.moodType} - ${h.note || h.cause || 'No note'}`
    ).join('\n');

    const prompt = `
      User: ${userName}.
      Recent Mood History:
      ${historyText}

      Task: Write a warm, insightful summary of the user's recent emotional journey. 
      Highlight patterns, strengths, and areas for self-care. Keep it under 100 words.
      CRITICAL: Use simple, encouraging, everyday language. Avoid psychological jargon or flowery prose.
      Language: ${language}.
    `;

    const response = await ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: prompt,
    });

    return response.text?.trim() || fallback;
  } catch (error) {
    return handleApiError("generateDetailedReport", error, fallback);
  }
};

export const analyzeSpiritAnimal = async (
  userName: string,
  mbti: string,
  quizAnswers: any,
  language: string = 'English',
  aiEnabled: boolean = true
): Promise<{ animal: string; reason: string }> => {
  const fallback = { animal: 'Cat', reason: '独立且善于观察。' };

  if (!aiEnabled) {
    await new Promise(r => setTimeout(r, 1500));
    return fallback;
  }

  try {
    const prompt = `
      User: ${userName}, MBTI: ${mbti}, Traits: ${JSON.stringify(quizAnswers)}.
      
      Task: Assign a Spirit Animal to this user based on their personality.
      Choose ONE from this list: Cat, Dolphin, Owl, Lion, Koala, Fox, Butterfly, Wolf.
      Provide a short reason (1 sentence) in clear, simple language.

      Respond in JSON. Language for reason: ${language}.
    `;

    const response = await ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            animal: { type: Type.STRING },
            reason: { type: Type.STRING }
          }
        }
      }
    });

    return JSON.parse(cleanJsonString(response.text || JSON.stringify(fallback)));
  } catch (error) {
    return handleApiError("analyzeSpiritAnimal", error, fallback);
  }
};

/** 是否为正向情绪（用于行为目标：品味/留住 vs 调节/应对） */
const isPositiveMood = (mood: string): boolean => {
  const m = mood?.trim() || '';
  return m === 'Pleasant' || m === 'Thrilled' || m === 'Calm';
};

/** 行为目标 fallback 池（负向/调节）：无法连接 AI 时随机挑选。格式统一为「在…时，我会…。」 */
const GROWTH_FALLBACK_POOL = [
  "在感到恼火时，我会深呼吸三次。",
  "在烦躁时，我会起身喝杯水。",
  "在情绪上头时，我会先离开现场一分钟。",
  "在感到焦虑时，我会环顾四周，寻找并命名 3 种我能看到的颜色。",
  "在压力过大时，我会用力握紧拳头 5 秒钟，然后彻底松开。",
  "在脑子乱成一团时，我会花两分钟整理一下桌面的杂物。",
  "在心情低落时，我会推开窗户，感受一下外面的风或阳光。",
  "在感到倦怠时，我会去洗手间用凉水洗一下脸或手腕。",
  "在自我怀疑时，我会挺直后背，保持「权力姿势」站立一分钟。",
  "在想要发火时，我会快速在心里倒数十个数。",
  "在急于反驳时，我会先用舌尖抵住上颚，强迫自己停顿三秒。",
  "在感到委屈时，我会找个没人的地方大口呼气，把淤积的气吐出去。",
  "在感到大脑过载时，我会闭上眼睛，去辨听空气中能听到的三种声音。",
  "在感到委屈想哭时，我会抬头向上看 45 度，并在心里默数三个数。",
  "在感到社交压力时，我会轻轻触摸衣服的质地，感受布料的触感。",
  "在感到极度沮丧时，我会找出一首节奏轻快的歌，哪怕只听 30 秒。",
  "在感到犹豫不决时，我会告诉自己：「先只做三分钟，三分钟后可以随时停下。」",
  "在感到谈话陷入僵局时，我会低头整理一下自己的袖口、表带或指甲。",
  "在感到睡前思绪纷乱时，我会把烦恼简短地写在纸上，然后扣过来放好。",
  "在感到急躁不安时，我会刻意放慢说话的速度，让每个字都吐得清晰一点。",
  "在感到环境压抑时，我会走出房门，去看看远方的建筑或树木。",
  "在感到后悔纠结时，我会拍拍自己的肩膀，轻声说：「那是当时的最佳选择。」",
  "在感到任务堆积如山时，我会先挑一件哪怕只需一分钟就能完成的小事去做。",
  "在感到期待落空时，我会深呼吸并告诉自己：「这只是路径变了，目标还在。」",
  "在感到不被尊重时，我会先挺直脊梁，深吸一口气后再开口回应。",
];

/** 行为目标 fallback 池（正向/品味）：留住、品味或延续好状态。格式统一为「在…时，我会…。」 */
const GROWTH_FALLBACK_POOL_POSITIVE = [
  "在感到愉悦时，我会在心里默念一句感谢。",
  "在心情很好时，我会把这份感受记下一笔。",
  "在感到平静时，我会闭眼深呼吸三次，留住这一刻。",
  "在感到满足时，我会停下来感受一下身体的放松。",
  "在感到过于激动时，我会深呼吸先稍微平静下来。",
  "在感到被滋养时，我会把这份温暖分享给一个人。",
  "在感到充满活力时，我会到窗边晒一会儿太阳。",
  "在感到感恩时，我会写下此刻的一件小事。",
  "在感到放松时，我会多停留几秒再进入下一件事。",
  "在感到开心时，我会对着镜子笑一下。",
  "在感到宁静时，我会听一段喜欢的音乐。",
  "在感到被爱时，我会给对方一个拥抱。",
];

const getRandomGrowthFallback = (mood: string): { insight: string; actions: string[] } => {
  const pool = isPositiveMood(mood) ? GROWTH_FALLBACK_POOL_POSITIVE : GROWTH_FALLBACK_POOL;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const need = 3;
  const actions = shuffled.length >= need ? shuffled.slice(0, need) : [...shuffled, ...GROWTH_FALLBACK_POOL.slice(0, need - shuffled.length)].slice(0, need);
  return {
    insight: shuffled[0] || (pool === GROWTH_FALLBACK_POOL_POSITIVE ? GROWTH_FALLBACK_POOL_POSITIVE[0] : GROWTH_FALLBACK_POOL[0]),
    actions,
  };
};

/** 供 GrowthSeed 等调用：按情绪取 fallback，保证与 API 层一致 */
export const getGrowthFallbackForMood = (mood: string): { insight: string; actions: string[] } => {
  return getRandomGrowthFallback(mood || 'Neutral');
};

export const generateGrowthGoals = async (
  mood: string,
  context: string,
  categories: string[],
  language: string = 'English',
  aiEnabled: boolean = true
): Promise<{ insight: string, actions: string[] }> => {
  
  const fallback = getRandomGrowthFallback(mood);

  if (!aiEnabled) {
    await new Promise(r => setTimeout(r, 1500));
    return fallback;
  }
  if (useProxy()) {
    try {
      return await callProxy('generateGrowthGoals', { mood, context, categories, language, aiEnabled: true });
    } catch (e) {
      return handleApiError('generateGrowthGoals', e, fallback);
    }
  }

  const positive = isPositiveMood(mood);
  const taskAndExamples = positive
    ? `
      Task (positive mood — savor/keep this good state):
      1. "insight": ONE short sentence that affirms this good state (max 20 words). Natural, spoken language. No metaphors.
      2. "actions": EXACTLY 3 sentences. Each MUST follow: 在[正向情境]时，我会[留住/品味/延续的小动作]。 (Chinese: 在...时，我会...。 with period at end). Actions should help savor, keep, or extend this good feeling. Concrete, doable (under 30 seconds).
      
      Examples of valid actions (savor/keep style only):
      在感到愉悦时，我会在心里默念一句感谢。
      在心情很好时，我会把这份感受记下一笔。
      在感到平静时，我会闭眼深呼吸三次，留住这一刻。
      `
    : `
      Task (difficult mood — regulate/cope):
      1. "insight": ONE short sentence that acknowledges their feeling (max 20 words). Natural, spoken language. No metaphors.
      2. "actions": EXACTLY 3 sentences. Each sentence MUST follow this format STRICTLY: 在[情境或触发]时，我会[具体小动作]。 (Chinese: 在...时，我会...。 with period at end). The part after 我会 must be a concrete, doable action (under 30 seconds). No other format allowed.
      
      Examples of valid actions (use this style only):
      在感到恼火时，我会深呼吸三次。
      在烦躁时，我会起身喝杯水。
      在情绪上头时，我会先离开现场一分钟。
      在感到焦虑时，我会环顾四周，寻找并命名 3 种我能看到的颜色。
      `;

  try {
    const prompt = `
      User feels ${mood}. Context: ${context}. Categories: ${categories.join(', ')}.
      ${taskAndExamples}
      
      Respond in JSON. Language: ${language}. Every "actions" item must be exactly one sentence in the form 在...时，我会...。 (no leading/trailing space, period at end).
    `;

    const response = await ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
              insight: { type: Type.STRING },
              actions: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });

    const parsed = JSON.parse(cleanJsonString(response.text || JSON.stringify(fallback)));
    const actions = Array.isArray(parsed.actions) ? parsed.actions : fallback.actions;
    const insight = typeof parsed.insight === 'string' && parsed.insight.trim() ? parsed.insight.trim() : fallback.insight;
    const normalizedActions = actions.slice(0, 3).map((a: string) => typeof a === 'string' ? a.trim() : '');
    const validActions = normalizedActions.filter((a: string) => /在.+时，我会.+。$/.test(a));
    const finalActions = validActions.length >= 3 ? validActions : [...validActions, ...fallback.actions].slice(0, 3);
    return { insight, actions: finalActions };
  } catch (error) {
    return handleApiError("generateGrowthGoals", error, fallback);
  }
};

/** 每周反思：根据选中的激烈时刻与用户复盘答案，生成模式总结与 1–3 条「在…时，我会…」改进目标 */
export const generateWeeklyImprovementPlan = async (
  selectedEntries: any[],
  reflectionAnswers: { trigger?: string; bodySignal?: string; reaction?: string; nextAlternative?: string }[],
  language: string = 'Chinese',
  aiEnabled: boolean = true
): Promise<{ patternSummary: string; actionSeedsIfThen: string[] }> => {
  const fallback = {
    patternSummary: "这一周你面对了不少激烈情绪。看见自己对不同情况做出的反应，就是改变的第一步。",
    actionSeedsIfThen: [
      "在感到紧张时，我会先深呼吸 3 次。",
      "在情绪激动时，我会先强制自己抽离 1 分钟。"
    ]
  };

  if (!aiEnabled || selectedEntries.length === 0) {
    await new Promise(r => setTimeout(r, 1200));
    return fallback;
  }

  try {
    const entriesSummary = selectedEntries.map((e, i) => {
      const dateStr = new Date(e.timestamp).toLocaleDateString();
      const body = e.bodySensations?.length ? ` 身体:${(e.bodySensations as string[]).join(',')}` : '';
      const advice = e.advice ? ` 建议/反应:${e.advice}` : '';
      return `[${i + 1}] ${dateStr} ${e.moodType} ${e.note || ''}${body}${advice}`;
    }).join('\n');

    const prompt = `
Based on the user's weekly intense moments (entry data only; bodySensations/advice when present can be used as body signals and reactions):

${entriesSummary}

Task:
1. patternSummary: 2-3 short sentences summarizing common triggers, one unhelpful reaction pattern, and one small helpful strategy. Warm, coaching tone. Language: ${language}.
2. actionSeedsIfThen: 1-3 concrete goals. Each MUST be one sentence in form: 在[情境/触发]时，我会[具体小动作]. The action should be doable in under 30 seconds. Language: ${language}.

Return JSON only. actionSeedsIfThen must be an array of 1-3 strings.
`;

    const response = await ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            patternSummary: { type: Type.STRING },
            actionSeedsIfThen: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });

    const parsed = JSON.parse(cleanJsonString(response.text || JSON.stringify(fallback)));
    const list = Array.isArray(parsed.actionSeedsIfThen) ? parsed.actionSeedsIfThen : fallback.actionSeedsIfThen;
    return {
      patternSummary: typeof parsed.patternSummary === 'string' ? parsed.patternSummary : fallback.patternSummary,
      actionSeedsIfThen: list.slice(0, 3)
    };
  } catch (error) {
    return handleApiError("generateWeeklyImprovementPlan", error, fallback);
  }
};

export const generateWeeklyReport = async (
    userName: string, 
    weeklyHistory: any[], 
    language: string = 'English', 
    aiEnabled: boolean = true
): Promise<{
    climateTitle: string,
    climateDescription: string,
    keywords: string[],
    letterContent: string,
    totem: string
}> => {
    // 🇨🇳 UPDATED: Chinese Fallback
    const fallback = {
        climateTitle: "起伏的一周",
        climateDescription: "你度过了各种情绪的起伏。",
        keywords: ["成长", "平静", "韧性"],
        letterContent: "这周你做得很好。花点时间休息吧。",
        totem: "Sun" // Keep icon key in English for mapping
    };

    if (!aiEnabled || weeklyHistory.length === 0) {
        await new Promise(r => setTimeout(r, 1500));
        return fallback;
    }

    try {
        const historyText = weeklyHistory.map(h => 
            `Day ${new Date(h.timestamp).getDay()}: ${h.moodType} - ${h.categories?.join(',')}`
        ).join('\n');

        const prompt = `
            Analyze last 7 days for ${userName}.
            Data: ${historyText}
            
            Task: Return a Weekly Story JSON.
            1. climateTitle: Short descriptive title (e.g. "Storm & Sunshine"). Simple words.
            2. climateDescription: 1 sentence summary of mood flow. Natural language.
            3. keywords: 3-4 emotional keywords.
            4. letterContent: Warm, encouraging letter (max 60 words). Use conversational, easy-to-read language.
            5. totem: Choose ONE icon name that represents their next week's energy: Sun, Moon, Star, Anchor, Feather, Mountain, Tree, Heart.

            CRITICAL: Respond in ${language}. 
            NOTE: 'totem' value must be one of the English keys listed above (e.g. 'Sun', not '太阳'), even if the rest of the JSON is in Chinese.
        `;

        const response = await ai.models.generateContent({
            model: TEXT_MODEL_NAME,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        climateTitle: { type: Type.STRING },
                        climateDescription: { type: Type.STRING },
                        keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                        letterContent: { type: Type.STRING },
                        totem: { type: Type.STRING }
                    }
                }
            }
        });

        return JSON.parse(cleanJsonString(response.text || JSON.stringify(fallback)));
    } catch (error) {
        return handleApiError("generateWeeklyReport", error, fallback);
    }
};
