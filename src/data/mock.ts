export type Emotion = 'anger' | 'sadness' | 'joy' | 'fear' | 'confusion';

export interface Confession {
  id: string;
  text: string;
  emotion: Emotion;
  minted: boolean;
  createdAt: string;
  linkedIds: string[];
  pendingLinkIds: string[];
}

export interface Link {
  id: string;
  fromId: string;
  toId: string;
  status: 'pending' | 'confirmed';
}

export const MOCK_CONFESSIONS: Confession[] = [
  {
    id: 'c1',
    text: 'I cry in front of my screen at midnight, not wanting anyone to know. Only the glow of code keeps me company in the dark.',
    emotion: 'sadness',
    minted: true,
    createdAt: '2026-04-01T02:30:00Z',
    linkedIds: ['c3'],
    pendingLinkIds: [],
  },
  {
    id: 'c2',
    text: 'I pretended everything was fine at the meeting, but inside I was screaming. Nobody noticed.',
    emotion: 'anger',
    minted: false,
    createdAt: '2026-04-02T14:15:00Z',
    linkedIds: [],
    pendingLinkIds: ['c5'],
  },
  {
    id: 'c3',
    text: 'Sometimes I feel like a transparent ghost, walking through crowds but seen by no one.',
    emotion: 'sadness',
    minted: true,
    createdAt: '2026-04-03T08:00:00Z',
    linkedIds: ['c1'],
    pendingLinkIds: [],
  },
  {
    id: 'c4',
    text: 'Today a stranger smiled at me and I felt like the whole universe opened up. Small things matter so much.',
    emotion: 'joy',
    minted: true,
    createdAt: '2026-04-04T10:20:00Z',
    linkedIds: ['c8'],
    pendingLinkIds: [],
  },
  {
    id: 'c5',
    text: 'I\'m afraid I\'ll never be good enough. After every effort, the anxiety only deepens. It\'s a bottomless pit.',
    emotion: 'fear',
    minted: false,
    createdAt: '2026-04-05T23:45:00Z',
    linkedIds: [],
    pendingLinkIds: ['c2'],
  },
  {
    id: 'c6',
    text: 'I wrote a love letter and never sent it. It sits in my drawer, aging like wine — or maybe like regret.',
    emotion: 'sadness',
    minted: true,
    createdAt: '2026-04-06T16:00:00Z',
    linkedIds: ['c9'],
    pendingLinkIds: [],
  },
  {
    id: 'c7',
    text: 'Why do I always think of you at the worst possible times? The brain is the most disobedient organ.',
    emotion: 'confusion',
    minted: false,
    createdAt: '2026-04-07T01:10:00Z',
    linkedIds: [],
    pendingLinkIds: [],
  },
  {
    id: 'c8',
    text: 'Found a four-leaf clover today. Maybe luck is just paying attention to the small miracles around us.',
    emotion: 'joy',
    minted: true,
    createdAt: '2026-04-08T09:30:00Z',
    linkedIds: ['c4'],
    pendingLinkIds: [],
  },
  {
    id: 'c9',
    text: 'Having a secret crush is a one-person show. The only audience is yourself, yet it\'s more thrilling than any blockbuster.',
    emotion: 'joy',
    minted: false,
    createdAt: '2026-04-09T20:00:00Z',
    linkedIds: ['c6'],
    pendingLinkIds: [],
  },
  {
    id: 'c10',
    text: 'The world feels like it\'s spinning too fast and I can\'t find which way is up anymore. I just want to pause.',
    emotion: 'confusion',
    minted: false,
    createdAt: '2026-04-10T12:00:00Z',
    linkedIds: [],
    pendingLinkIds: ['c12'],
  },
  {
    id: 'c11',
    text: 'Today I finally found the courage to speak the truth. My voice was trembling, but my heart felt lighter than ever.',
    emotion: 'joy',
    minted: true,
    createdAt: '2026-04-11T15:30:00Z',
    linkedIds: [],
    pendingLinkIds: [],
  },
  {
    id: 'c12',
    text: 'I keep building walls, then wondering why I feel so alone. The architecture of self-sabotage is my specialty.',
    emotion: 'fear',
    minted: false,
    createdAt: '2026-04-12T22:00:00Z',
    linkedIds: [],
    pendingLinkIds: ['c10'],
  },
];

export const MOCK_LINKS: Link[] = [
  { id: 'l1', fromId: 'c1', toId: 'c3', status: 'confirmed' },
  { id: 'l2', fromId: 'c4', toId: 'c8', status: 'confirmed' },
  { id: 'l3', fromId: 'c6', toId: 'c9', status: 'confirmed' },
  { id: 'l4', fromId: 'c2', toId: 'c5', status: 'pending' },
  { id: 'l5', fromId: 'c10', toId: 'c12', status: 'pending' },
];

export function getRelatedConfessions(id: string): Confession[] {
  const confession = MOCK_CONFESSIONS.find(c => c.id === id);
  if (!confession) return [];
  return MOCK_CONFESSIONS.filter(
    c => c.id !== id && c.emotion === confession.emotion
  ).slice(0, 3);
}
