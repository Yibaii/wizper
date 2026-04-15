import type { Emotion } from '@/data/mock';

export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export const PALETTES = [
  { primary: '#00f5d4', secondary: '#00a693', glow: '#00f5d4', name: 'cyan' },
  { primary: '#b24bf3', secondary: '#8a2be2', glow: '#b24bf3', name: 'violet' },
  { primary: '#39ff14', secondary: '#2bc40e', glow: '#39ff14', name: 'green' },
  { primary: '#ff6b9d', secondary: '#cc4477', glow: '#ff6b9d', name: 'pink' },
  { primary: '#ffd700', secondary: '#ccaa00', glow: '#ffd700', name: 'gold' },
  { primary: '#00bfff', secondary: '#0099cc', glow: '#00bfff', name: 'blue' },
] as const;

export type Palette = (typeof PALETTES)[number];

export interface CreatureParams {
  palette: Palette;
  bodyType: number;
  eyeStyle: number;
  mouthStyle: number;
}

export function textToCreature(text: string): CreatureParams {
  const h = hashString(text);
  return {
    palette: PALETTES[h % PALETTES.length],
    bodyType: (h >> 3) % 8,
    eyeStyle: (h >> 6) % 4,
    mouthStyle: (h >> 8) % 4,
  };
}

export const EMOTION_LABELS: Record<Emotion, { en: string; icon: string }> = {
  anger: { en: 'Anger', icon: '🔥' },
  sadness: { en: 'Sadness', icon: '💧' },
  joy: { en: 'Joy', icon: '✨' },
  fear: { en: 'Fear', icon: '👁' },
  love: { en: 'Love', icon: '💜' },
  confusion: { en: 'Confusion', icon: '🌀' },
};

export function detectEmotion(text: string): Emotion {
  const lower = text.toLowerCase();
  const scores: Record<Emotion, number> = {
    anger: 0, sadness: 0, joy: 0, fear: 0, love: 0, confusion: 0,
  };

  const keywords: Record<Emotion, string[]> = {
    anger: [
      'angry', 'furious', 'rage', 'hate', 'scream', 'mad', 'frustrated',
      '生气', '愤怒', '烦', '恨', '讨厌', '暴怒', '发火', '气死', '受不了', '操', '妈的', '恼火', '憎恨', '怒', '火大', '崩溃',
    ],
    sadness: [
      'sad', 'cry', 'tears', 'lonely', 'miss', 'depressed', 'grief', 'alone',
      '难过', '伤心', '哭', '孤独', '寂寞', '想念', '思念', '抑郁', '悲伤', '心痛', '落泪', '眼泪', '失落', '沮丧', '痛苦', '遗憾', '可惜',
    ],
    joy: [
      'happy', 'smile', 'laugh', 'amazing', 'wonderful', 'joy', 'glad', 'bright', 'courage',
      '开心', '快乐', '高兴', '笑', '幸福', '太棒', '真好', '美好', '欢乐', '兴奋', '激动', '满足', '感恩', '赞', '哈哈', '嘻嘻', '耶', '喜悦', '勇气',
    ],
    fear: [
      'afraid', 'scared', 'fear', 'anxiety', 'worry', 'nervous', 'dread', 'panic',
      '害怕', '恐惧', '焦虑', '担心', '紧张', '不安', '慌', '恐慌', '吓', '胆怯', '惶恐', '忐忑', '心慌', '怕',
    ],
    love: [
      'love', 'heart', 'crush', 'letter', 'kiss', 'adore', 'romance', 'dear',
      '爱', '喜欢', '心动', '暗恋', '表白', '亲', '想你', '甜蜜', '温柔', '心爱', '深爱', '宝贝', '亲爱', '情书', '浪漫', '牵挂',
    ],
    confusion: [
      'confused', 'lost', 'why', 'spinning', 'understand', 'unsure', 'uncertain',
      '迷茫', '困惑', '不懂', '为什么', '搞不清', '纠结', '矛盾', '不确定', '迷失', '混乱', '茫然', '懵',
    ],
  };

  for (const [emotion, words] of Object.entries(keywords)) {
    for (const w of words) {
      if (lower.includes(w)) scores[emotion as Emotion] += 1;
    }
  }

  let best: Emotion = 'confusion';
  let max = 0;
  for (const [emotion, score] of Object.entries(scores)) {
    if (score > max) { max = score; best = emotion as Emotion; }
  }
  return best;
}
