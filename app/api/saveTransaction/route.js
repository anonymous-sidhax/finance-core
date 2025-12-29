import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { classifierService } from '@/lib/classifier';

export async function POST(req) {
  try {
    const body = await req.json();
    const { description, category, sub_category } = body;

    // 1. Save the correct data to Supabase
    const { data, error } = await supabase
      .from('transactions')
      .insert([
        { description, category, sub_category }
      ])
      .select();

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    // 2. Retrain the model immediately
    // The next time you call /classify, it will use this new knowledge.
    await classifierService.train();

    return NextResponse.json({ 
      message: 'Transaction saved and AI retrained', 
      data 
    });

  } catch (error) {
    return NextResponse.json({ error: 'Failed to save transaction' }, { status: 500 });
  }
}