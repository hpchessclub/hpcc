import {clearAdminActivity} from "@/lib/adminSession";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function POST(){ await clearAdminActivity(); const supabase=await createSupabaseServerClient(); await supabase.auth.signOut(); return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"), { status: 303 }); }
