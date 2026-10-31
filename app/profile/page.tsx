"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Mail, Plus, ShieldCheck, UsersRound } from "lucide-react";
import { CURRENCIES } from "@/lib/currency";
import { getGroups, type Group } from "@/lib/api";
import { AppShell, ErrorNotice, LoadingState } from "../components/shell";
import { CreateGroupDialog } from "../components/create-group-dialog";
import { useAuth } from "../components/auth-provider";

export default function ProfilePage() {
  const { user, loading: authLoading, setPreferredCurrency } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [currencyBusy, setCurrencyBusy] = useState(false);
  const [currencyMessage, setCurrencyMessage] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, router, user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    getGroups()
      .then((result) => { if (active) setGroups(result); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Could not load your groups."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  if (authLoading || (!user && loading)) return <LoadingState />;

  const initials = user?.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase() ?? "";
  const joined = user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "Recently";

  async function changeCurrency(currency: string) {
    setCurrencyBusy(true);
    setCurrencyMessage("");
    try {
      await setPreferredCurrency(currency);
      setCurrencyMessage("Preference saved.");
    } catch (reason) {
      setCurrencyMessage(reason instanceof Error ? reason.message : "Could not save this preference.");
    } finally {
      setCurrencyBusy(false);
    }
  }

  return <AppShell title="Your profile" eyebrow="THE PERSON BEHIND THE PLANS" action={<button className="button button-primary" onClick={() => setShowCreate(true)}><Plus size={17} /> New group</button>}>
    {error && <ErrorNotice message={error} />}
    <div className="profile-layout">
      <section className="profile-primary">
        <div className="profile-hero">
          <div className="profile-avatar-large">{initials}</div>
          <div><span className="tiny-kicker">COMMONPLACE MEMBER</span><h2>{user?.name}</h2><p>Keeping good company since {joined}.</p></div>
        </div>
        <div className="profile-details">
          <div className="profile-detail-row"><span className="profile-detail-icon"><Mail size={17} /></span><div><small>EMAIL ADDRESS</small><strong>{user?.email}</strong></div></div>
          <div className="profile-detail-row"><span className="profile-detail-icon"><CalendarDays size={17} /></span><div><small>MEMBER SINCE</small><strong>{joined}</strong></div></div>
          <div className="profile-detail-row"><span className="profile-detail-icon"><UsersRound size={17} /></span><div><small>YOUR GROUPS</small><strong>{loading ? "Loading…" : `${groups.length} ${groups.length === 1 ? "group" : "groups"}`}</strong></div></div>
          <label className="profile-currency-row"><span className="profile-detail-icon">₹</span><span><small>YOUR DISPLAY CURRENCY</small><select disabled={currencyBusy} value={user?.preferred_currency ?? "INR"} onChange={(event) => void changeCurrency(event.target.value)}>{CURRENCIES.map((currency) => <option key={currency.code} value={currency.code}>{currency.code} · {currency.name}</option>)}</select></span></label>
        </div>
        <div className="profile-readonly"><ShieldCheck size={18} /><span>{currencyMessage || "Group expenses stay in each group’s currency; your summaries use this preference."}</span></div>
      </section>
      <aside className="profile-aside">
        <div className="profile-aside-top"><span className="tiny-kicker">YOUR COMMONPLACE</span><span className="profile-aside-icon"><UsersRound size={21} /></span></div>
        <strong>{loading ? "—" : groups.length.toString().padStart(2, "0")}</strong>
        <p>spaces for the people you share life with</p>
        <button className="text-action" onClick={() => setShowCreate(true)}>Make a new group <span>↗</span></button>
      </aside>
    </div>
    <div className="profile-lower-note"><span>SMALL GROUPS, BIG PLANS.</span><span>YOUR ACCOUNT IS PRIVATE.</span></div>
    {showCreate && <CreateGroupDialog onClose={() => setShowCreate(false)} />}
  </AppShell>;
}