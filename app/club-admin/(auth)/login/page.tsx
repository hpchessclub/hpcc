"use client";
import Link from "next/link";
import { useEffect,useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AdminLoginPage(){
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const router=useRouter();
  const [notice,setNotice]=useState("");
  useEffect(()=>{const reason=new URLSearchParams(window.location.search).get('reason');if(reason==='session_expired')setNotice('Your session expired after inactivity. Please sign in again.');if(reason==='password_changed')setNotice('Password changed. Please sign in with your new password.');},[]);
  async function submit(e:React.FormEvent){
    e.preventDefault(); setLoading(true); setError("");
    const supabase=createSupabaseBrowserClient();
    const {error}=await supabase.auth.signInWithPassword({email,password});
    setLoading(false);
    if(error) return setError(error.message);
    const session=await fetch('/api/admin/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'login'})});
    if(!session.ok){await supabase.auth.signOut();return setError('Admin access unavailable. Check your account role or sign in again.');}
    router.push("/club-admin/dashboard"); router.refresh();
  }
  return <main className="grid min-h-screen place-items-center bg-hpcc-pale p-4"><form onSubmit={submit} className="card w-full max-w-md p-8"><img src="/logo.png" alt="Howick-Pakuranga" className="mx-auto h-24 w-24 rounded-full"/><h1 className="mt-5 text-center text-3xl font-extrabold">Club Admin Login</h1><p className="mt-2 text-center text-sm text-slate-600">Private access for authorised admin, super admin and content users only.</p><p className="mt-3 text-center text-xs text-stone-600">Sessions end after 10 minutes of inactivity. Sign in again after a password change.</p><label className="mt-6 block"><span className="label">Email</span><input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="input mt-1" required/></label><label className="mt-4 block"><span className="label">Password</span><input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="input mt-1" required/></label>{notice&&<p role="status" className="mt-4 text-sm text-hpcc-navy">{notice}</p>}{error && <p className="mt-4 text-sm font-bold text-red-700">{error}</p>}<button disabled={loading} className="btn-primary mt-6 w-full">{loading?"Signing in...":"Sign in"}</button><Link href="/club-admin/reset-password" className="mt-4 block text-center text-sm font-bold underline">Forgot password?</Link><div className="mt-5 text-center text-sm"><span className="text-slate-600">No credentials?</span> <Link href="/club-admin/signup" className="font-bold text-hpcc-blue">Request admin access</Link></div><p className="mt-4 text-center text-xs text-slate-500">Sign-up creates a pending account only. Super Admin must approve and assign role access.</p></form></main>
}
