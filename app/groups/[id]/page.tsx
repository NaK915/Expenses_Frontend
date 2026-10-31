"use client";

import { Suspense, useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, CalendarDays, CircleHelp, MoreHorizontal, Plus, ReceiptText, UserRoundMinus, UsersRound, X } from "lucide-react";
import { addMember, createTransaction, deleteTransaction, getExchangeRate, getGroup, getGroupBalances, leaveGroup, updateTransaction, type BalanceEntry, type GroupDetail, type Transaction, type TransactionInput, type User } from "@/lib/api";
import { AppShell, EmptyState, ErrorNotice, LoadingState } from "../../components/shell";
import { useAuth } from "../../components/auth-provider";
import { formatCurrency } from "@/lib/currency";

type DialogProps = { onClose: () => void };

function TransactionDialog({ group, members, user, transaction, onClose, onSaved }: DialogProps & {
  group: GroupDetail["group"];
  members: User[];
  user: User;
  transaction?: Transaction;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(transaction?.title ?? "");
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");
  const [category, setCategory] = useState(transaction?.category ?? "");
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [splits, setSplits] = useState<string[]>(transaction?.split_between ?? members.map((member) => member.id));
  const [splitType, setSplitType] = useState<"equal" | "amounts" | "parts">(transaction?.split_type ?? "equal");
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>(Object.fromEntries(Object.entries(transaction?.split_amounts ?? {}).map(([id, value]) => [id, String(value)])));
  const [splitParts, setSplitParts] = useState<Record<string, string>>(Object.fromEntries(Object.entries(transaction?.split_parts ?? {}).map(([id, value]) => [id, String(value)])));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const selectedMembers = members.filter((member) => splits.includes(member.id));
  const amountCents = Math.round((Number(amount) || 0) * 100);
  const memberShares = (() => {
    if (splitType === "amounts") return Object.fromEntries(selectedMembers.map((member) => [member.id, Math.round((Number(splitAmounts[member.id]) || 0) * 100) / 100]));
    const weights = selectedMembers.map((member) => splitType === "parts" ? Number(splitParts[member.id]) || 0 : 1);
    const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
    if (!weightTotal || !amountCents) return Object.fromEntries(selectedMembers.map((member) => [member.id, 0]));
    const raw = selectedMembers.map((member, index) => amountCents * weights[index] / weightTotal);
    const cents = raw.map(Math.floor);
    const remainderOrder = raw.map((value, index) => ({ index, remainder: value - cents[index] })).sort((a, b) => b.remainder - a.remainder || a.index - b.index);
    for (const { index } of remainderOrder.slice(0, amountCents - cents.reduce((sum, value) => sum + value, 0))) cents[index] += 1;
    return Object.fromEntries(selectedMembers.map((member, index) => [member.id, cents[index] / 100]));
  })();
  const allocatedTotal = Object.values(memberShares).reduce((sum, value) => sum + value, 0);
  const splitIsValid = selectedMembers.length > 0 && (splitType !== "amounts" || Math.abs(allocatedTotal - (Number(amount) || 0)) < 0.005) && (splitType !== "parts" || selectedMembers.every((member) => (Number(splitParts[member.id]) || 0) > 0));

  function toggleMember(memberId: string) {
    const included = splits.includes(memberId);
    setSplits((current) => included ? current.filter((id) => id !== memberId) : [...current, memberId]);
    if (!included && splitType === "parts") setSplitParts((current) => ({ ...current, [memberId]: current[memberId] || "1" }));
    if (!included && splitType === "amounts") setSplitAmounts((current) => ({ ...current, [memberId]: current[memberId] || "0" }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const payload: Partial<TransactionInput> = {
      title: title.trim(),
      amount: Number(amount),
      split_between: splits,
      split_type: splitType,
      split_amounts: splitType === "amounts" ? Object.fromEntries(splits.map((id) => [id, Number(splitAmounts[id]) || 0])) : {},
      split_parts: splitType === "parts" ? Object.fromEntries(splits.map((id) => [id, Number(splitParts[id]) || 0])) : {},
      category: category.trim() || undefined,
      description: description.trim() || undefined,
    };
    try {
      if (transaction) await updateTransaction(transaction.id, payload);
      else await createTransaction(group.id, { ...payload, transaction_type: "expense", split_between: splits, title: title.trim(), amount: Number(amount), split_type: splitType });
      onSaved();
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save this expense.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="dialog-panel dialog-wide" role="dialog" aria-modal="true" aria-labelledby="transaction-dialog-title">
      <button className="icon-button dialog-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
      <span className="tiny-kicker">{transaction ? "UPDATE THE DETAILS" : "ADD TO THE SHARED TAB"}</span>
      <h2 id="transaction-dialog-title">{transaction ? "Edit expense" : "Add an expense"}</h2>
      {error && <ErrorNotice message={error} />}
      <form className="stacked-form" onSubmit={submit}>
        <label>What was it for?<input autoFocus required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Dinner at the little place" /></label>
        <div className="form-two-up"><label>Amount · {group.currency}<input type="number" min="0.01" step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></label><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Suggest automatically</option><option>Food & drink</option><option>Transport</option><option>Stay</option><option>Groceries</option><option>Activities</option><option>Shopping</option><option>Bills & utilities</option><option>Health</option><option>Other</option></select></label></div>
        <fieldset className="split-picker"><legend>How should it be split? <span>{selectedMembers.length} selected</span></legend>
          <div className="split-mode-control" role="group" aria-label="Split method">
            <button type="button" className={splitType === "equal" ? "active" : ""} onClick={() => setSplitType("equal")}>Equally</button>
            <button type="button" className={splitType === "amounts" ? "active" : ""} onClick={() => setSplitType("amounts")}>By amount</button>
            <button type="button" className={splitType === "parts" ? "active" : ""} onClick={() => { setSplitType("parts"); setSplitParts((current) => Object.fromEntries([...new Set([...Object.keys(current), ...splits])].map((id) => [id, current[id] || "1"]))); }}>By parts</button>
          </div>
          <div className="split-member-list">{members.map((member, index) => {
            const included = splits.includes(member.id);
            const parts = Number(splitParts[member.id]) || 0;
            return <div className={`split-member-row ${!included ? "split-member-excluded" : ""}`} key={member.id}>
              <label className="split-member-person"><input type="checkbox" checked={included} onChange={() => toggleMember(member.id)} /><span className={`avatar avatar-small avatar-${index % 3}`}>{member.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span><span className="split-member-name">{member.id === user.id ? "You" : member.name}</span></label>
              {splitType === "amounts" ? <label className="split-member-value"><span className="sr-only">Amount for {member.name}</span><input aria-label={`Amount for ${member.name}`} type="number" min="0" step="0.01" disabled={!included} value={splitAmounts[member.id] ?? ""} onChange={(event) => setSplitAmounts((current) => ({ ...current, [member.id]: event.target.value }))} placeholder="0.00" /><small>{group.currency}</small></label> : splitType === "parts" ? <label className="split-member-value split-parts-value"><span className="sr-only">Parts for {member.name}</span><input aria-label={`Parts for ${member.name}`} type="number" min="0.01" step="0.01" disabled={!included} value={splitParts[member.id] ?? "1"} onChange={(event) => setSplitParts((current) => ({ ...current, [member.id]: event.target.value }))} /><small>{parts || 0} parts · {formatCurrency(memberShares[member.id] ?? 0, group.currency)}</small></label> : <span className="split-share-preview">{included ? formatCurrency(memberShares[member.id] ?? 0, group.currency) : "Not included"}</span>}
            </div>;
          })}</div>
          {splitType === "amounts" && <div className={`split-total-row ${splitIsValid ? "" : "split-total-invalid"}`}><span>Allocated · {selectedMembers.length} people</span><strong>{formatCurrency(allocatedTotal, group.currency)} / {formatCurrency(Number(amount) || 0, group.currency)}</strong></div>}
        </fieldset>
        <label>Description <span className="optional-label">OPTIONAL · USED FOR CATEGORY SUGGESTION</span><textarea rows={2} maxLength={400} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What was this expense for?" /></label>
        <button className="button button-primary" disabled={busy || !splitIsValid}>{busy ? "Saving…" : transaction ? "Save changes" : "Add expense"}</button>
      </form>
    </section>
  </div>;
}

function MemberDialog({ groupId, onClose, onSaved }: DialogProps & { groupId: string; onSaved: () => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await addMember(groupId, email.trim());
      onSaved();
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not add this person.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="dialog-panel" role="dialog" aria-modal="true" aria-labelledby="member-dialog-title">
      <button className="icon-button dialog-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
      <span className="tiny-kicker">MORE IS MERRIER</span><h2 id="member-dialog-title">Add someone</h2>
      <p className="dialog-intro">They’ll need an account first. Add the email they used to sign up.</p>
      {error && <ErrorNotice message={error} />}
      <form className="stacked-form" onSubmit={submit}><label>Email address<input autoFocus type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="friend@example.com" /></label><button className="button button-primary" disabled={busy}>{busy ? "Adding…" : "Add to group"}</button></form>
    </section>
  </div>;
}

function GroupPageContent() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [balances, setBalances] = useState<BalanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [transaction, setTransaction] = useState<Transaction | undefined>();
  const [showTransaction, setShowTransaction] = useState(false);
  const [showMember, setShowMember] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<{ base: string; quote: string; rate: number; fetched_at: string } | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    const [nextDetail, balanceData] = await Promise.all([getGroup(id), getGroupBalances(id)]);
    setDetail(nextDetail);
    setBalances(balanceData.members);
  }, [id]);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, router, user]);

  useEffect(() => {
    if (!user || !id) return;
    let active = true;
    Promise.all([getGroup(id), getGroupBalances(id)])
      .then(([nextDetail, balanceData]) => {
        if (active) { setDetail(nextDetail); setBalances(balanceData.members); }
      })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Could not load this group."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, user]);

  useEffect(() => {
    if (!detail || !user || detail.group.currency === user.preferred_currency) return;
    const base = detail.group.currency;
    const quote = user.preferred_currency;
    getExchangeRate(base, quote).then(setExchangeRate).catch(() => setExchangeRate(null));
  }, [detail, user]);

  async function reload() {
    try { await refresh(); setError(""); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not refresh this group."); }
  }

  async function removeExpense(item: Transaction) {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
    try { await deleteTransaction(item.id); await reload(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not delete this expense."); }
  }

  async function exitGroup() {
    if (!detail || !window.confirm(`Leave ${detail.group.name}? You will lose access to this group's activity.`)) return;
    try { await leaveGroup(detail.group.id); router.replace("/dashboard"); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not leave this group."); }
  }

  if (authLoading || (!user && loading) || loading) return <LoadingState label="Opening your group…" />;
  if (!detail) return <AppShell title="Group unavailable" eyebrow="YOUR GROUPS"><ErrorNotice message={error || "This group could not be found."} /><button className="button button-secondary" onClick={() => router.push("/dashboard")}><ArrowLeft size={16} /> Back to groups</button></AppShell>;

  const userBalance = balances.find((entry) => entry.user_id === user?.id)?.balance ?? 0;
  const groupCurrency = detail.group.currency;
  const personalCurrency = user?.preferred_currency ?? "INR";
  const rate = groupCurrency === personalCurrency ? 1 : exchangeRate?.base === groupCurrency && exchangeRate.quote === personalCurrency ? exchangeRate.rate : null;
  const converted = (amount: number) => rate === null ? null : amount * rate;
  const conversionCaption = rate === null ? `1 ${groupCurrency} conversion unavailable` : `${groupCurrency} to ${personalCurrency} · updated ${exchangeRate?.fetched_at ? new Date(exchangeRate.fetched_at).toLocaleString() : "now"}`;
  const expenses = detail.transactions.filter((item) => item.transaction_type === "expense");
  const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);
  const paidByYou = expenses.filter((item) => item.paid_by === user?.id).reduce((sum, item) => sum + item.amount, 0);
  const memberName = (memberId: string) => detail.members.find((member) => member.id === memberId)?.name ?? "A group member";

  return <AppShell title={detail.group.name} eyebrow="GROUP SPACE" action={<button className="button button-primary" onClick={() => { setTransaction(undefined); setShowTransaction(true); }}><Plus size={17} /> Add expense</button>}>
    {error && <ErrorNotice message={error} />}
    <div className="group-cover-row"><div className="group-cover-copy"><span className="group-cover-icon"><UsersRound size={22} /></span><div><strong>{detail.group.description || "Good plans, shared clearly."}</strong><small>{detail.members.length} people · {groupCurrency} group currency · started {new Date(detail.group.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</small></div></div><button className="button button-secondary button-small" onClick={() => setShowMember(true)}><Plus size={15} /> Add people</button></div>
    <section className="group-metrics" aria-label="Group spending summary">
      <div className="group-metric group-metric-lead"><span className="metric-label">TOTAL SPENT</span>{groupCurrency !== personalCurrency && converted(totalSpent) !== null ? <><strong>{formatCurrency(converted(totalSpent)!, personalCurrency)}</strong><small className="currency-secondary">Group: {formatCurrency(totalSpent, groupCurrency)}</small></> : <strong>{formatCurrency(totalSpent, groupCurrency)}</strong>}<small>across {expenses.length} {expenses.length === 1 ? "expense" : "expenses"}</small></div>
      <div className="group-metric"><span className="metric-label">YOU PAID</span>{groupCurrency !== personalCurrency && converted(paidByYou) !== null ? <><strong>{formatCurrency(converted(paidByYou)!, personalCurrency)}</strong><small className="currency-secondary">Group: {formatCurrency(paidByYou, groupCurrency)}</small></> : <strong>{formatCurrency(paidByYou, groupCurrency)}</strong>}<small>your contributions</small></div>
      <div className="group-metric"><span className="metric-label">{userBalance < -0.009 ? "YOU OWE" : userBalance > 0.009 ? "OWED TO YOU" : "YOUR BALANCE"}</span>{Math.abs(userBalance) < 0.01 ? <strong>All square</strong> : groupCurrency !== personalCurrency && converted(Math.abs(userBalance)) !== null ? <><strong className={userBalance > 0.009 ? "positive-text" : "negative-text"}>{formatCurrency(converted(Math.abs(userBalance))!, personalCurrency)}</strong><small className="currency-secondary">Group: {formatCurrency(Math.abs(userBalance), groupCurrency)}</small></> : <strong className={userBalance > 0.009 ? "positive-text" : userBalance < -0.009 ? "negative-text" : ""}>{formatCurrency(Math.abs(userBalance), groupCurrency)}</strong>}<small>{userBalance < -0.009 ? "your share, net of payments" : userBalance > 0.009 ? "coming back your way" : "nothing outstanding"}</small></div>
      <div className="group-metric group-metric-members"><span className="metric-label">IN THIS GROUP</span><div className="avatar-stack">{detail.members.slice(0, 5).map((member, index) => <span key={member.id} title={member.name} className={`avatar avatar-${index % 3}`}>{member.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span>)}</div><small>{detail.members.length} members</small></div>
    </section>

    <div className="group-content-grid">
      <section className="expenses-section">
        <div className="section-heading section-heading-tight"><div><span className="tiny-kicker">THE PAPER TRAIL</span><h2>Expenses <span>{detail.transactions.length.toString().padStart(2, "0")}</span></h2></div><div className="expenses-filter"><CalendarDays size={15} /><span>All activity</span></div></div>
        {detail.transactions.length === 0 ? <EmptyState title="A clean slate" message="When someone adds an expense, it will show up here." action={<button className="button button-primary" onClick={() => { setTransaction(undefined); setShowTransaction(true); }}><Plus size={16} /> Add first expense</button>} /> : <div className="expense-list">
          {detail.transactions.map((item) => <article className="expense-row" key={item.id}>
            <span className={`expense-icon ${item.transaction_type === "reimbursement" ? "expense-icon-reimbursement" : ""}`}>{item.transaction_type === "reimbursement" ? <ArrowDownLeft size={18} /> : <ReceiptText size={18} />}</span>
            <div className="expense-description"><strong>{item.title}</strong><span>{item.category || (item.transaction_type === "reimbursement" ? "Reimbursement" : "Shared expense")} · {item.paid_by === user?.id ? "You paid" : `${memberName(item.paid_by)} paid`}</span>{item.description && <small className="expense-description-detail">{item.description}</small>}</div>
            <div className="expense-split"><span>{item.split_between.length} {item.split_between.length === 1 ? "person" : "people"}</span><small>{new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</small></div>
            <div className="expense-amount">{groupCurrency !== personalCurrency && converted(item.amount) !== null ? <><strong>{formatCurrency(converted(item.amount)!, personalCurrency)}</strong><small className="currency-secondary">Group: {formatCurrency(item.amount, groupCurrency)}</small></> : <strong>{formatCurrency(item.amount, groupCurrency)}</strong>}</div>
            {item.paid_by === user?.id && <div className="expense-actions"><button className="icon-button" aria-label={`Edit ${item.title}`} title="Edit expense" onClick={() => { setTransaction(item); setShowTransaction(true); }}><MoreHorizontal size={18} /></button><button className="icon-button icon-button-danger" aria-label={`Delete ${item.title}`} title="Delete expense" onClick={() => void removeExpense(item)}><X size={17} /></button></div>}
          </article>)}
        </div>}
      </section>

      <aside className="group-side-panel">
        <section className="side-panel-section"><div className="side-panel-heading"><div><span className="tiny-kicker">AT A GLANCE</span><h3>Who&apos;s up?</h3></div><span title="Positive means owed to you; negative means you owe." aria-label="Balance information"><CircleHelp size={16} /></span></div>
          <div className="balance-list">{balances.map((entry) => <div className="balance-row" key={entry.user_id}><span className={`avatar avatar-small avatar-${entry.user_id === user?.id ? "green" : "0"}`}>{entry.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span><span className="balance-person">{entry.user_id === user?.id ? "You" : entry.name}</span><span className="balance-values">{Math.abs(entry.balance) < 0.01 ? <strong>Settled</strong> : groupCurrency !== personalCurrency && converted(Math.abs(entry.balance)) !== null ? <><strong className={entry.balance > 0 ? "positive-text" : "negative-text"}>{entry.balance > 0 ? "+" : "−"}{formatCurrency(converted(Math.abs(entry.balance))!, personalCurrency)}</strong><small className="currency-secondary">Group: {formatCurrency(Math.abs(entry.balance), groupCurrency)}</small></> : <strong className={entry.balance > 0.009 ? "positive-text" : entry.balance < -0.009 ? "negative-text" : ""}>{entry.balance > 0 ? "+" : entry.balance < 0 ? "−" : ""}{formatCurrency(Math.abs(entry.balance), groupCurrency)}</strong>}</span></div>)}</div>
        </section>
        <section className="side-panel-section member-panel-section"><div className="side-panel-heading"><div><span className="tiny-kicker">THE PEOPLE</span><h3>Members <span>{detail.members.length}</span></h3></div><button className="icon-button" onClick={() => setShowMember(true)} title="Add member" aria-label="Add member"><Plus size={17} /></button></div>
          <div className="member-list">{detail.members.map((member, index) => <div className="member-row" key={member.id}><span className={`avatar avatar-small avatar-${member.id === user?.id ? "green" : index % 3}`}>{member.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span><span className="member-name">{member.id === user?.id ? `${member.name} (you)` : member.name}</span><button className="icon-button disabled-icon" disabled title="Removing another member is not available in the backend yet" aria-label={`Remove ${member.name}`}><UserRoundMinus size={16} /></button></div>)}</div>
        </section>
        <section className="group-management"><span className="tiny-kicker">GROUP MANAGEMENT</span><button className="management-row" onClick={() => void exitGroup()}><ArrowUpRight size={16} /><span>Leave this group</span></button><button className="management-row management-unavailable" disabled title="Group deletion is not available in the backend yet"><X size={16} /><span>Delete group</span><small>Unavailable</small></button></section>
      </aside>
    </div>
    {groupCurrency !== personalCurrency && <p className="conversion-footnote">{conversionCaption}. Converted values are estimates; balances and settlements remain in {groupCurrency}.</p>}
    {showTransaction && user && <TransactionDialog group={detail.group} members={detail.members} user={user} transaction={transaction} onClose={() => setShowTransaction(false)} onSaved={() => void reload()} />}
    {showMember && <MemberDialog groupId={detail.group.id} onClose={() => setShowMember(false)} onSaved={() => void reload()} />}
  </AppShell>;
}

export default function GroupPage() {
  return <Suspense fallback={<LoadingState label="Opening your group…" />}><GroupPageContent /></Suspense>;
}