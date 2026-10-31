export type User = {
  id: string;
  name: string;
  email: string;
  preferred_currency: string;
  created_at: string;
};

export type Group = {
  id: string;
  name: string;
  description?: string | null;
  currency: string;
  member_ids: string[];
  created_at: string;
};

export type Transaction = {
  id: string;
  group_id: string;
  title: string;
  amount: number;
  transaction_type: "expense" | "reimbursement";
  paid_by: string;
  split_between: string[];
  split_type: "equal" | "amounts" | "parts";
  split_amounts: Record<string, number>;
  split_parts: Record<string, number>;
  to_user_id?: string | null;
  category?: string | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
};

export type BalanceEntry = {
  user_id: string;
  name: string;
  balance: number;
};

export type GroupDetail = {
  group: Group;
  members: User[];
  transactions: Transaction[];
};

type AuthResponse = {
  user: User;
  access_token: string;
  token_type: string;
};

const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
const tokenKey = "expense-split-token";

export function getToken() {
  return typeof window === "undefined" ? null : window.localStorage.getItem(tokenKey);
}

export function saveToken(token: string) {
  window.localStorage.setItem(tokenKey, token);
}

export function clearToken() {
  window.localStorage.removeItem(tokenKey);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${apiBase}${path}`, { ...options, headers });
  } catch {
    throw new Error(`Could not reach the API at ${apiBase}. Check that the backend is running.`);
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) message = payload.detail;
    } catch {
      // Keep the status message when the response has no JSON body.
    }
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function signIn(email: string, password: string) {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function signUp(name: string, email: string, password: string) {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export function getMe() {
  return request<User>("/auth/me");
}

export function updatePreferredCurrency(preferred_currency: string) {
  return request<User>("/users/me", {
    method: "PATCH",
    body: JSON.stringify({ preferred_currency }),
  });
}

export function getGroups() {
  return request<Group[]>("/groups");
}

export function getGroup(id: string) {
  return request<GroupDetail>(`/groups/${encodeURIComponent(id)}`);
}

export function getGroupBalances(id: string) {
  return request<{ group_id: string; group_name: string; members: BalanceEntry[] }>(
    `/groups/${encodeURIComponent(id)}/balances`,
  );
}

export function createGroup(name: string, description: string, currency: string) {
  return request<Group>("/groups", {
    method: "POST",
    body: JSON.stringify({ name, description: description || null, currency }),
  });
}

export function addMember(groupId: string, email: string) {
  return request<Group>(`/groups/${encodeURIComponent(groupId)}/members`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function leaveGroup(groupId: string) {
  return request<void>(`/groups/${encodeURIComponent(groupId)}/members/me`, {
    method: "DELETE",
  });
}

export type TransactionInput = {
  title: string;
  amount: number;
  transaction_type: "expense" | "reimbursement";
  split_between: string[];
  split_type: "equal" | "amounts" | "parts";
  split_amounts?: Record<string, number>;
  split_parts?: Record<string, number>;
  to_user_id?: string;
  category?: string;
  description?: string;
};

export function createTransaction(groupId: string, payload: TransactionInput) {
  return request<Transaction>(`/groups/${encodeURIComponent(groupId)}/transactions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateTransaction(id: string, payload: Partial<TransactionInput>) {
  return request<Transaction>(`/transactions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteTransaction(id: string) {
  return request<void>(`/transactions/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function getExchangeRate(base: string, quote: string) {
  return request<{ base: string; quote: string; rate: number; fetched_at: string }>(
    `/currencies/rates?base=${encodeURIComponent(base)}&quote=${encodeURIComponent(quote)}`,
  );
}