"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    const client = createSupabaseBrowserClient();
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) setReady(true);
    });
    async function initialize() {
      try {
        const url = new URL(window.location.href);
        const hash = new URLSearchParams(url.hash.slice(1));
        const token = hash.get("access_token"), refresh = hash.get("refresh_token");
        let result;
        if (url.searchParams.get("code")) result = await client.auth.exchangeCodeForSession(url.searchParams.get("code")!);
        else if (token && refresh) result = await client.auth.setSession({ access_token: token, refresh_token: refresh });
        if (result?.error) throw result.error;
        const { data, error } = await client.auth.getUser();
        if (!error && data.user) setReady(true);
        else if (result) throw new Error("This reset link is invalid or expired. Request a new link below.");
        if (hash.get("error_description")) throw new Error(hash.get("error_description")!);
        window.history.replaceState({}, "", url.pathname);
      } catch (e) { setError(e instanceof Error ? e.message : "Could not verify reset link."); }
      finally { setChecking(false); }
    }
    void initialize();
    return () => subscription.unsubscribe();
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setMessage(""); setBusy(true);
    try {
      const client = createSupabaseBrowserClient();
      if (ready) {
        if (password.length < 12) throw new Error("Use at least 12 characters.");
        if (password !== confirm) throw new Error("Passwords do not match.");
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        await client.auth.signOut(); setDone(true); setPassword(""); setConfirm("");
        setMessage("Password updated. Sign in with your new password.");
      } else {
        const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/club-admin/reset-password` });
        if (error) throw error;
        setMessage("If this email has an account, a reset link will be sent. Check your inbox and spam folder.");
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Password reset failed."); }
    finally { setBusy(false); }
  }
  return <main className="grid min-h-screen place-items-center bg-hpcc-pale p-4"><form onSubmit={submit} className="card w-full max-w-md p-8"><h1 className="hpcc-display text-3xl font-bold">{ready ? "Set your new password" : "Reset your password"}</h1>{checking ? <p className="mt-4">Checking your reset link…</p> : !done && <>{ready ? <><label className="mt-6 block"><span className="label">New password</span><input type="password" autoComplete="new-password" minLength={12} value={password} onChange={e=>setPassword(e.target.value)} className="input mt-1" required/></label><label className="mt-4 block"><span className="label">Confirm password</span><input type="password" autoComplete="new-password" minLength={12} value={confirm} onChange={e=>setConfirm(e.target.value)} className="input mt-1" required/></label><p className="mt-2 text-sm text-stone-600">Use at least 12 characters.</p></> : <label className="mt-6 block"><span className="label">Account email</span><input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="input mt-1" required/></label>}<button disabled={busy} className="btn-primary mt-6 w-full">{busy ? "Please wait…" : ready ? "Save new password" : "Send reset link"}</button></>}{error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}{message && <p role="status" className="mt-4 text-sm text-green-800">{message}</p>}<Link href="/club-admin/login" className="mt-5 block text-center font-bold underline">Back to login</Link></form></main>;
}
