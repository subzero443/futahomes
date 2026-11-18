export type SessionContext = 'user' | 'agent' | 'admin';

const csrfTokens = new Map<SessionContext, string>();
const sessionContextKey = 'futa-homes-session-context';

export function embeddedRoute(search: string): string {
  return search.startsWith('?/') ? search.slice(1) : '';
}

export function getSessionContext(pathname = window.location.pathname, search = window.location.search): SessionContext {
  const route = pathname === '/auth-loginfutahomes' ? embeddedRoute(search) : pathname;
  const roleMatch = route.match(/^\/(user|agent|admin)(?:\/|$)/);
  if (roleMatch) {
    const context = roleMatch[1] as SessionContext;
    window.sessionStorage.setItem(sessionContextKey, context);
    return context;
  }
  if (route === '/login' || route === '/register') {
    window.sessionStorage.setItem(sessionContextKey, 'user');
    return 'user';
  }
  const rememberedContext = window.sessionStorage.getItem(sessionContextKey);
  return rememberedContext === 'agent' || rememberedContext === 'admin' ? rememberedContext : 'user';
}

export function setCsrf(value: string, context: SessionContext = getSessionContext()) {
  csrfTokens.set(context, value);
}

export async function prepareSessionContext(context: SessionContext) {
  if (csrfTokens.get(context)) return;
  const session = await api<{ csrf: string }>('session', { sessionContext: context });
  setCsrf(session.csrf, context);
}

export async function api<T = unknown>(route: string, init: {
  method?: 'GET' | 'POST';
  data?: unknown;
  form?: FormData;
  params?: Record<string, string | number | undefined>;
  sessionContext?: SessionContext;
} = {}): Promise<T> {
  const params = new URLSearchParams({ route });
  for (const [key, val] of Object.entries(init.params || {})) {
    if (val !== undefined) params.set(key, String(val));
  }
  const method = init.method || (init.data !== undefined || init.form ? 'POST' : 'GET');
  const context = init.sessionContext || getSessionContext();
  const headers: Record<string, string> = { 'X-FUTA-Session': context };
  if (method !== 'GET') headers['X-CSRF-Token'] = csrfTokens.get(context) || '';
  if (!init.form && method !== 'GET') headers['Content-Type'] = 'application/json';
  const response = await fetch(`/api?${params}`, {
    method,
    credentials: 'same-origin',
    headers,
    body: init.form || (method !== 'GET' ? JSON.stringify(init.data || {}) : undefined),
  });
  const text = await response.text();
  let result: { error?: string };
  try {
    result = JSON.parse(text) as { error?: string };
  } catch {
    throw Error('Server response is not JSON. Is XAMPP Apache running?');
  }
  if (!response.ok) throw Error(result.error || `HTTP ${response.status}`);
  return result as T;
}

export async function apiFile(
  route: string,
  params: Record<string, string | number | undefined> = {},
  sessionContext: SessionContext = getSessionContext(),
): Promise<Blob> {
  const query = new URLSearchParams({ route });
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query.set(key, String(value));
  }
  const response = await fetch(`/api?${query}`, {
    credentials: 'same-origin',
    headers: { 'X-FUTA-Session': sessionContext },
  });
  if (!response.ok) {
    const text = await response.text();
    let message: string;
    try {
      const result = JSON.parse(text) as { error?: string };
      message = result.error || `HTTP ${response.status}`;
    } catch {
      message = `Could not load the document (HTTP ${response.status}).`;
    }
    throw Error(message);
  }
  return response.blob();
}

export const naira=(x:number|string)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(Number(x)||0);
export const prettyDate=(x?:string)=>x?new Date(x.replace(' ','T')).toLocaleDateString('en-NG',{month:'short',day:'numeric',year:'numeric'}):'—';
export const mediaUrl=(path?:string)=>path||'/demo/placeholder.svg';
