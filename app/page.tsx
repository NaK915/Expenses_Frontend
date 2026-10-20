"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowDownLeft, ArrowUpRight, Check, ChevronRight, Leaf, LockKeyhole, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { ErrorNotice, LoadingState } from "./components/shell";
import { useAuth } from "./components/auth-provider";

export default function Home() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { user, loading, authenticate } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [router, user]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await authenticate(email, password, mode === "signup" ? name : undefined);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState label="Opening your space…" />;

  return (
      <main className="landing-page">
        <section className="landing-story">
          <div className="landing-brand"><span className="brand-icon"><Leaf size={20} /></span><span>commonplace<span className="brand-period">.</span></span></div>
          <div className="landing-story-copy">
            <div className="eyebrow eyebrow-light">A LITTLE LESS SETTLING UP</div>
            <h1>Good times.<br /><em>Clear tabs.</em></h1>
            <p>Keep the people part of sharing. We’ll keep the numbers straight.</p>
            <div className="landing-points">
              <span><UsersRound size={17} /> One place for every group</span>
              <span><Check size={17} /> Everyone knows where they stand</span>
            </div>
          </div>
          <div className="landing-ledger" aria-label="Example group activity">
            <div className="ledger-heading"><span>WEEKEND IN THE PINES</span><span>THIS WEEK</span></div>
            <div className="ledger-balance"><div><small>YOUR BALANCE</small><strong>You&apos;re all square</strong></div><span className="ledger-check"><Check size={20} /></span></div>
            <div className="ledger-row"><span className="ledger-avatar avatar-peach">M</span><span><strong>Maya paid</strong><small>Groceries · 4 people</small></span><span className="ledger-amount">$84.20</span></div>
            <div className="ledger-row"><span className="ledger-avatar avatar-yellow">J</span><span><strong>You paid</strong><small>Cabin · 4 people</small></span><span className="ledger-amount">$240.00</span></div>
            <div className="ledger-footer"><span><ArrowDownLeft size={14} /> 3 shared moments</span><span><ArrowUpRight size={14} /> $324.20 total</span></div>
          </div>
          <span className="landing-side-note">MADE FOR THE IN-BETWEEN</span>
        </section>
        <section className="landing-auth">
          <div className="auth-topline"><span><LockKeyhole size={14} /> PRIVATE BY DEFAULT</span><span>01 <i>/</i> 02</span></div>
          <div className="auth-panel">
            <div className="auth-tabs" role="tablist" aria-label="Account access">
              <button className={mode === "login" ? "selected" : ""} onClick={() => { setMode("login"); setError(""); }} role="tab" aria-selected={mode === "login"}>Log in</button>
              <button className={mode === "signup" ? "selected" : ""} onClick={() => { setMode("signup"); setError(""); }} role="tab" aria-selected={mode === "signup"}>Create account</button>
            </div>
            <div className="auth-heading"><span className="tiny-kicker">{mode === "login" ? "WELCOME BACK" : "START HERE"}</span><h2>{mode === "login" ? "Pick up where\nyou left off." : "Make room for\nbetter shared plans."}</h2><p>{mode === "login" ? "Your groups are waiting right where you left them." : "A little clarity goes a long way."}</p></div>
            {error && <ErrorNotice message={error} />}
            <form className="auth-form" onSubmit={submit}>
              {mode === "signup" && <label>Your name<input autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex Morgan" /></label>}
              <label>Email address<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
              <label>Password<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "signup" ? 6 : undefined} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === "signup" ? "At least 6 characters" : "Your password"} /></label>
              <button className="button button-primary auth-submit" type="submit" disabled={busy}>
                {busy ? "One moment…" : mode === "login" ? "Log in to your groups" : "Create your account"}<ChevronRight size={17} />
              </button>
            </form>
            <p className="auth-switch">{mode === "login" ? "New to Commonplace?" : "Already have an account?"}<button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}>{mode === "login" ? "Create an account" : "Log in"}</button></p>
          </div>
          <div className="auth-bottomline"><span>NO AWKWARD FOLLOW-UPS REQUIRED</span><span>COMMONPLACE © 2026</span></div>
        </section>
      </main>
  );
}
