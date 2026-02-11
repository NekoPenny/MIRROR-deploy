/**
 * Vercel Serverless 代理 - API Key 仅存于服务端，不暴露给前端
 * 部署时设置环境变量 GEMINI_API_KEY（勿使用 VITE_ 前缀）
 */
import { GoogleGenAI, Type } from '@google/genai';

const TEXT_MODEL = 'gemini-3-flash-preview';
const FALLBACK_IMAGE_MODEL = 'gemini-2.0-flash';

export default async function handler(req: Request) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey?.trim()) {
    return Response.json({ error: 'API key not configured' }, { status: 500 });
  }

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const body = await req.json();
    const { action, payload } = body;

    switch (action) {
      case 'analyzeImageMood': {
        const { image, language, aiEnabled } = payload;
        if (!aiEnabled || !image) {
          return Response.json({ moodType: 'Pleasant', emotions: ['瞬间', '感受', '生活'], vibeDescription: '被捕捉的时间切片。' });
        }
        const langPrompt = language === 'Chinese' ? 'Simplified Chinese (简体中文)' : language;
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const mimeMatch = image.match(/^data:([^;]+);/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const prompt = `Analyze the emotional atmosphere. 1) Classify mood: Pleasant/Stressful/Calm/Thrilled/Irritating. 2) Give 6-8 emotion keywords in ${langPrompt}. 3) Short vibe (3-6 words). Return JSON: {moodType, emotions: string[], vibeDescription}`;
        
        const run = async (model: string) => {
          const res = await ai.models.generateContent({
            model,
            contents: { parts: [{ text: prompt }, { inlineData: { mimeType, data: base64Data } }] },
            config: { responseMimeType: 'application/json', responseSchema: { type: Type.OBJECT, properties: { moodType: { type: Type.STRING }, emotions: { type: Type.ARRAY, items: { type: Type.STRING } }, vibeDescription: { type: Type.STRING } } } }
          });
          const t = (res as any).text ?? (res as any).candidates?.[0]?.content?.parts?.[0]?.text;
          return JSON.parse(t || '{}');
        };
        try {
          const out = await run(TEXT_MODEL);
          return Response.json(out);
        } catch {
          const out = await run(FALLBACK_IMAGE_MODEL);
          return Response.json(out);
        }
      }

      case 'generateInsight': {
        const { userName, recentHistory, language, aiEnabled } = payload;
        if (!aiEnabled) return Response.json({ text: '情绪如潮水，皆是生命之美。' });
        const historyStr = recentHistory.slice(0, 5).map((h: any) => `${new Date(h.timestamp).toLocaleDateString()}: ${h.moodType} - ${h.note || ''}`).join('\n');
        const res = await ai.models.generateContent({
          model: TEXT_MODEL,
          contents: `Generate a warm, 1-2 sentence daily insight for ${userName}. History:\n${historyStr}. Language: ${language}. Simple, grounded. Max 40 words.`
        });
        const text = (res as any).text ?? (res as any).candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        return Response.json({ text: text.trim() });
      }

      case 'generateGrowthGoals': {
        const { mood, context, categories, language, aiEnabled } = payload;
        if (!aiEnabled) return Response.json({ insight: '给自己一点时间。', actions: ['在焦虑时，我会深呼吸 3 次。', '在睡前，我会回想一件今天的小确幸。', '在情绪低落时，我会出去走一走。'] });
        const cats = (categories || []).join(', ');
        const res = await ai.models.generateContent({
          model: TEXT_MODEL,
          contents: `Mood: ${mood}. Context: ${context}. Categories: ${cats}. Generate JSON: { insight: string, actions: string[] }. Each action: 在[情境]时，我会[小动作]。Language: ${language}. Actions: 3 items.`
        });
        const raw = (res as any).text ?? (res as any).candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
        const parsed = JSON.parse(raw.replace(/```json?|```/g, '').trim());
        return Response.json(parsed);
      }

      case 'analyzeMoodEntry': {
        const { mood, cause, note, image, language, aiEnabled } = payload;
        const moodVal = mood ?? payload.moodType;
        const noteVal = cause ?? note ?? '';
        if (!aiEnabled) return Response.json({ emotions: [moodVal], summary: noteVal });
        const parts: any[] = [{ text: `User feels ${moodVal} because: "${noteVal}". ${image ? 'User also provided an image.' : ''}\nTask: Identify 5 nuanced emotions and a compassionate 1-sentence summary. JSON: { emotions: string[], summary: string }. Language: ${language}.` }];
        if (image) {
          const d = image.replace(/^data:image\/\w+;base64,/, '');
          const mime = image.match(/^data:([^;]+);/)?.[1] || 'image/jpeg';
          parts.push({ inlineData: { mimeType: mime, data: d } });
        }
        const res = await ai.models.generateContent({ model: TEXT_MODEL, contents: { parts }, config: { responseMimeType: 'application/json', responseSchema: { type: Type.OBJECT, properties: { emotions: { type: Type.ARRAY, items: { type: Type.STRING } }, summary: { type: Type.STRING } } } } });
        const raw = (res as any).text ?? (res as any).candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
        return Response.json(JSON.parse(raw.replace(/```json?|```/g, '').trim()));
      }

      case 'getPhotoEmotions': {
        const { image, mood, language, aiEnabled } = payload;
        if (!aiEnabled || !image) return Response.json([]);
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const mime = image.match(/^data:([^;]+);/)?.[1] || 'image/jpeg';
        const prompt = `Analyze this image in the context of the user feeling "${mood}". Suggest 6 precise emotional adjectives. Return JSON array of strings in ${language}.`;
        const res = await ai.models.generateContent({
          model: TEXT_MODEL,
          contents: { parts: [{ text: prompt }, { inlineData: { mimeType: mime, data: base64Data } }] },
          config: { responseMimeType: 'application/json', responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } }
        });
        const raw = (res as any).text ?? (res as any).candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
        return Response.json(JSON.parse(raw.replace(/```json?|```/g, '').trim()));
      }

      case 'analyzeChatSession': {
        const { chatHistoryText, language, aiEnabled } = payload;
        if (!aiEnabled) return Response.json({ moodType: 'Calm', emotions: ['反思', '安静'], summary: '一段安静的对话。', advice: '花点时间深呼吸。' });
        const prompt = `Analyze this chat session. Chat:\n${chatHistoryText}\nTask: moodType (Pleasant/Stressful/Calm/Thrilled/Irritating), 3-5 emotions, 1-2 sentence summary, 1 advice. JSON. Language: ${language}.`;
        const res = await ai.models.generateContent({
          model: TEXT_MODEL,
          contents: prompt,
          config: { responseMimeType: 'application/json', responseSchema: { type: Type.OBJECT, properties: { moodType: { type: Type.STRING }, emotions: { type: Type.ARRAY, items: { type: Type.STRING } }, summary: { type: Type.STRING }, advice: { type: Type.STRING } } } }
        });
        const raw = (res as any).text ?? (res as any).candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
        return Response.json(JSON.parse(raw.replace(/```json?|```/g, '').trim()));
      }

      case 'chatSend': {
        const { systemInstruction, messages, language } = payload;
        const parts = messages.map((m: { role: string; text?: string; image?: string }) => {
          if (m.image) {
            const d = m.image.replace(/^data:image\/\w+;base64,/, '');
            const mime = m.image.match(/^data:([^;]+);/)?.[1] || 'image/jpeg';
            return { inlineData: { mimeType: mime, data: d } };
          }
          return { text: m.text || '' };
        }).flat();
        const res = await ai.models.generateContent({
          model: TEXT_MODEL,
          contents: { parts },
          config: { systemInstruction: `${systemInstruction}\nCRITICAL: Reply in ${language}. Max 40 words.` }
        });
        const text = (res as any).text ?? (res as any).candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        return Response.json({ text: text.trim() });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (e) {
    console.error('[api/gemini]', e);
    return Response.json({ error: String((e as Error).message) }, { status: 500 });
  }
}
