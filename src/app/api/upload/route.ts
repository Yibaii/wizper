import { NextRequest, NextResponse } from 'next/server';
import { pinata } from '@/lib/pinata';

export async function POST(req: NextRequest) {
  try {
    const { svg, text, emotion, wizardId } = await req.json();

    if (!svg || !text || !emotion) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Step 1: Upload wizard SVG image to IPFS
    const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
    const svgFile = new File([svgBlob], `wizper-${wizardId}.svg`, {
      type: 'image/svg+xml',
    });

    const imageUpload = await pinata.upload.public.file(svgFile);
    const imageURI = `ipfs://${imageUpload.cid}`;

    // Step 2: Build NFT metadata (ERC-721 standard)
    const metadata = {
      name: `Wizper Spirit #${wizardId}`,
      description: `An anonymous expression transformed into a magical wizard spirit. Emotion: ${emotion}`,
      image: imageURI,
      attributes: [
        { trait_type: 'Emotion', value: emotion },
        { trait_type: 'Text Length', value: text.length },
        { trait_type: 'Created', value: new Date().toISOString() },
      ],
    };

    // Step 3: Upload metadata JSON to IPFS
    const metadataBlob = new Blob([JSON.stringify(metadata)], {
      type: 'application/json',
    });
    const metadataFile = new File(
      [metadataBlob],
      `wizper-${wizardId}-metadata.json`,
      { type: 'application/json' },
    );

    const metadataUpload = await pinata.upload.public.file(metadataFile);
    const tokenURI = `ipfs://${metadataUpload.cid}`;

    return NextResponse.json({
      tokenURI,
      imageURI,
      imageCid: imageUpload.cid,
      metadataCid: metadataUpload.cid,
    });
  } catch (err) {
    console.error('IPFS upload failed:', err);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 },
    );
  }
}
