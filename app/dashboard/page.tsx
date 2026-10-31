"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Plus, UsersRound } from "lucide-react";
import { getExchangeRate, getGroup, getGroupBalances, getGroups, type BalanceEntry, type Group, type GroupDetail } from "@/lib/api";
import { AppShell, EmptyState, ErrorNotice, LoadingState } from "../components/shell";
import { CreateGroupDialog } from "../components/create-group-dialog";
import { useAuth } from "../components/auth-provider";
import { formatCurrency } from "@/lib/currency";

type GroupOverview = { group: Group; detail: GroupDetail; balances: BalanceEntry[]; rate: number | null };

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<GroupOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, router, user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    getGroups()
      .then(async (groups) => Promise.all(groups.map(async (group) => {
        const [detail, balanceData] = await Promise.all([getGroup(group.id), getGroupBalances(group.id)]);
        const rate = group.currency === user.preferred_currency ? 1 : await getExchangeRate(group.currency, user.preferred_currency).then((result) => result.rate).catch(() => null);
        return { group, detail, balances: balanceData.members, rate };
      })))
      .then((loaded) => { if (active) setItems(loaded); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Could not load your groups."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  const netBalance = items.reduce((sum, item) => sum + ((item.balances.find((balance) => balance.user_id === user?.id)?.balance ?? 0) * (item.rate ?? 0)), 0);
  const owedToYou = items.reduce((sum, item) => sum + Math.max(0, (item.balances.find((balance) => balance.user_id === user?.id)?.balance ?? 0) * (item.rate ?? 0)), 0);
  const youOwe = items.reduce((sum, item) => sum + Math.max(0, -(item.balances.find((balance) => balance.user_id === user?.id)?.balance ?? 0) * (item.rate ?? 0)), 0);
  const totalSpent = items.reduce((sum, item) => sum + item.detail.transactions.filter((transaction) => transaction.transaction_type === "expense").reduce((total, transaction) => total + transaction.amount, 0) * (item.rate ?? 0), 0);
  const ratesAvailable = items.every((item) => item.rate !== null);
  const personalCurrency = user?.preferred_currency ?? "INR";

  if (authLoading || (!user && loading)) return <LoadingState />;

  return (
    <AppShell title={`Hello, ${user?.name.split(" ")[0] ?? "there"}.`} eyebrow="THE GROUP OVERVIEW" action={<button className="button button-primary" onClick={() => setShowCreate(true)}><Plus size={17} /> New group</button>}>
      {error && <ErrorNotice message={error} />}
      <section className="overview-strip" aria-label="Your totals">
        <div className="overview-main"><span className="metric-label">YOUR NET POSITION · {personalCurrency}</span><strong className={netBalance > 0.009 ? "positive-text" : netBalance < -0.009 ? "negative-text" : ""}>{!ratesAvailable ? "Rates unavailable" : Math.abs(netBalance) < 0.01 ? "All square" : `${netBalance > 0 ? "+" : "−"}${formatCurrency(Math.abs(netBalance), personalCurrency)}`}</strong><small>{!ratesAvailable ? "could not convert every group" : netBalance > 0.009 ? "coming back your way" : netBalance < -0.009 ? "across all groups" : "nothing outstanding"}</small></div>
        <div className="overview-stat"><span className="metric-icon metric-icon-green"><ArrowDownLeft size={18} /></span><div><span className="metric-label">OWED TO YOU · {personalCurrency}</span><strong>{ratesAvailable ? formatCurrency(owedToYou, personalCurrency) : "Unavailable"}</strong></div></div>
        <div className="overview-stat"><span className="metric-icon metric-icon-coral"><ArrowUpRight size={18} /></span><div><span className="metric-label">YOU OWE · {personalCurrency}</span><strong>{ratesAvailable ? formatCurrency(youOwe, personalCurrency) : "Unavailable"}</strong></div></div>
        <div className="overview-stat"><span className="metric-icon metric-icon-yellow"><UsersRound size={18} /></span><div><span className="metric-label">SHARED SPEND · {personalCurrency}</span><strong>{ratesAvailable ? formatCurrency(totalSpent, personalCurrency) : "Unavailable"}</strong></div></div>
      </section>

      <div className="section-heading"><div><span className="tiny-kicker">ALL TOGETHER</span><h2>Your groups <span>{items.length.toString().padStart(2, "0")}</span></h2></div><span className="section-caption">A clearer picture, one group at a time.</span></div>
      {loading ? <LoadingState label="Gathering your groups…" /> : items.length === 0 ? (
        <EmptyState title="Your first group starts here" message="Make a space for the people you share plans, meals, trips, or rent with." action={<button className="button button-primary" onClick={() => setShowCreate(true)}><Plus size={17} /> Create a group</button>} />
      ) : (
        <div className="group-grid">
          {items.map(({ group, detail, balances, rate }, index) => {
            const balance = balances.find((entry) => entry.user_id === user?.id)?.balance ?? 0;
            const spent = detail.transactions.filter((transaction) => transaction.transaction_type === "expense").reduce((sum, transaction) => sum + transaction.amount, 0);
            const members = detail.members.slice(0, 4);
            return <Link href={`/groups/${encodeURIComponent(group.id)}`} className={`group-card group-card-${index % 3}`} key={group.id}>
              <div className="group-card-top"><span className="group-mark"><UsersRound size={19} /></span><ArrowRight className="group-card-arrow" size={18} /></div>
              <h3>{group.name}</h3>
              <p className="group-description">{group.description || `${detail.members.length} people keeping things together`}</p>
              <div className="group-card-bottom"><div className="avatar-stack" aria-label={`${detail.members.length} members`}>{members.map((member, memberIndex) => <span key={member.id} className={`avatar avatar-${memberIndex % 3}`}>{member.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span>)}{detail.members.length > 4 && <span className="avatar avatar-more">+{detail.members.length - 4}</span>}</div><span className="group-member-count"><UsersRound size={13} /> {detail.members.length}</span></div>
              <div className="group-card-stats"><span><small>TOTAL SPENT</small>{group.currency !== personalCurrency && rate !== null ? <><strong>{formatCurrency(spent * rate, personalCurrency)}</strong><small className="currency-secondary">Group: {formatCurrency(spent, group.currency)}</small></> : <><strong>{formatCurrency(spent, group.currency)}</strong>{group.currency !== personalCurrency && <small className="currency-secondary">Conversion unavailable</small>}</>}</span><span className="group-card-balance"><small>YOUR BALANCE</small>{Math.abs(balance) < 0.01 ? <strong>All square</strong> : group.currency !== personalCurrency && rate !== null ? <><strong className={balance > 0.009 ? "positive-text" : "negative-text"}>{balance > 0 ? "+" : "−"}{formatCurrency(Math.abs(balance) * rate, personalCurrency)}</strong><small className="currency-secondary">Group: {formatCurrency(Math.abs(balance), group.currency)}</small></> : <><strong className={balance > 0.009 ? "positive-text" : balance < -0.009 ? "negative-text" : ""}>{balance > 0 ? "+" : balance < 0 ? "−" : ""}{formatCurrency(Math.abs(balance), group.currency)}</strong>{group.currency !== personalCurrency && <small className="currency-secondary">Conversion unavailable</small>}</>}</span></div>
            </Link>;
          })}
        </div>
      )}
      {showCreate && <CreateGroupDialog onClose={() => setShowCreate(false)} />}
    </AppShell>
  );
}