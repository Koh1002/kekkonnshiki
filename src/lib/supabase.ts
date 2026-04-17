"use client";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// クライアントサイド: anon key のみ。書き込みは API ルート経由。
export const supabase = createClient(url, anon, {
  realtime: { params: { eventsPerSecond: 10 } },
  auth: { persistSession: false },
});
