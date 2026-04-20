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

    // Step 2: Build NFT metadata (ERC-721 standard).
    // Full expression text is stored in IPFS metadata. This is the sole
    // source of truth for the text — nothing on-chain, no DB dependency.
    // Text is therefore permanent and public, but has no link to any wallet.
    const metadata = {
      name: `Wizper Wizard #${wizardId}`,
      description: text,
      image: imageURI,
      attributes: [
        { trait_type: 'Emotion', value: emotion },
        { trait_type: 'Created', value: new Date().toISOString() },
      ],
      // Custom namespaced field to make the expression easy for our own
      // app to consume without relying on parsing `description` (which
      // third-party marketplaces use as a free-form caption).
      wizper: {
        version: 1,
        text,
        emotion,
      },
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
