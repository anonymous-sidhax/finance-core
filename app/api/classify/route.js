import { NextResponse } from 'next/server';
import { classifierService } from '@/lib/classifier';

export async function POST(req) {
  try {
    const body = await req.json();
    const { description } = body;

    if (!description) {
      return NextResponse.json({ error: 'Missing description' }, { status: 400 });
    }

    // Ask the service to guess the category
    const prediction = await classifierService.classify(description);

    return NextResponse.json({ 
      description,
      prediction 
    });

  } catch (error) {
    console.error("Classification error:", error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}