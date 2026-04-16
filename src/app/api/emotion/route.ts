import { NextRequest, NextResponse } from 'next/server';
import type { Emotion } from '@/data/mock';

// English: j-hartmann/emotion-english-distilroberta-base (7 labels)
const EN_MODEL = 'j-hartmann/emotion-english-distilroberta-base';
const EN_LABEL_MAP: Record<string, Emotion> = {
  anger: 'anger',
  disgust: 'anger',
  fear: 'fear',
  joy: 'joy',
  sadness: 'sadness',
  surprise: 'joy',
  neutral: 'confusion',
};

// Chinese: Johnson8187/Chinese-Emotion (8 labels, traditional Chinese).
// The HF Inference Providers router returns LABEL_N (the config.json id2label
// is generic LABEL_0..7); the original README maps those to Chinese names in
// order. We accept both so the code survives either serving mode.
const ZH_MODEL = 'Johnson8187/Chinese-Emotion';
const ZH_LABEL_MAP: Record<string, Emotion> = {
  // Chinese names (kept for completeness if HF ever serves them)
  開心語調: 'joy',
  憤怒語調: 'anger',
  悲傷語調: 'sadness',
  厭惡語調: 'anger',
  關切語調: 'fear',
  驚奇語調: 'joy',
  疑問語調: 'confusion',
  平淡語氣: 'confusion',
  // LABEL_N aliases (current router behavior)
  LABEL_0: 'confusion', // 平淡
  LABEL_1: 'fear',      // 關切
  LABEL_2: 'joy',       // 開心
  LABEL_3: 'anger',     // 憤怒
  LABEL_4: 'sadness',   // 悲傷
  LABEL_5: 'confusion', // 疑問
  LABEL_6: 'joy',       // 驚奇
  LABEL_7: 'anger',     // 厭惡
};

type HFScore = { label: string; score: number };

// If the text contains any CJK characters, treat it as Chinese.
function isChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

async function classify(model: string, text: string): Promise<HFScore[] | null> {
  // HuggingFace retired the free `api-inference.huggingface.co` endpoint in
  // late 2024. The replacement is the Inference Providers router, which
  // keeps the same request/response shape.
  const resp = await fetch(
    `https://router.huggingface.co/hf-inference/models/${model}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text }),
    }
  );

  if (!resp.ok) {
    const body = await resp.text();
    console.warn(`[emotion] HF ${resp.status} from ${model}:`, body.slice(0, 300));
    return null;
  }

  const raw = await resp.json();

  if (!Array.isArray(raw)) {
    console.warn(`[emotion] HF non-array response from ${model}:`, raw);
    return null;
  }

  // HF text-classification returns either [[{...}]] or [{...}]
  return (Array.isArray(raw[0]) ? raw[0] : raw) as HFScore[];
}

export async function POST(req: NextRequest) {
  const { text } = await req.json();

  if (!text || typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ label: 'confusion', score: 0 });
  }

  const useZh = isChinese(text);
  const model = useZh ? ZH_MODEL : EN_MODEL;
  const map = useZh ? ZH_LABEL_MAP : EN_LABEL_MAP;

  try {
    const scores = await classify(model, text);
    if (!scores || !scores.length) {
      return NextResponse.json({ label: 'confusion', score: 0, lang: useZh ? 'zh' : 'en' });
    }

    const top = scores.reduce((a, b) => (a.score >= b.score ? a : b));
    const mapped: Emotion = map[top.label] ?? map[top.label.toLowerCase()] ?? 'confusion';

    return NextResponse.json({
      label: mapped,
      score: top.score,
      raw: top.label,
      lang: useZh ? 'zh' : 'en',
    });
  } catch (err) {
    console.error('[emotion] fetch failed:', err);
    return NextResponse.json({ label: 'confusion', score: 0 });
  }
}
