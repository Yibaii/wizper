import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  const resp = await fetch(
    'https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-emotion',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text }),
    }
  );
  const result = await resp.json();
  return NextResponse.json(result);
}
