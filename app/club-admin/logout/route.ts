import {clearAdminActivity} from "@/lib/adminSession";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function POST(req:Request){await clearAdminActivity();const supabase=await createSupabaseServerClient();await supabase.auth.signOut({scope:'local'});return NextResponse.redirect(new URL('/club-admin/login',req.url),{status:303});}
