export function getAuthToken(): string {
  if (typeof window === "undefined") return "";

  // 1. Check localStorage keys
  const localToken =
    localStorage.getItem("codebot_access_token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token");

  if (localToken && localToken.trim()) {
    return localToken.trim();
  }

  // 2. Fallback to cookies
  const match =
    document.cookie.match(/(?:^|; )codebot_access_token=([^;]*)/) ||
    document.cookie.match(/(?:^|; )guest_token=([^;]*)/);

  if (match && match[1]) {
    return decodeURIComponent(match[1]).trim();
  }

  return "";
}

export function setAuthToken(token: string): void {
  if (typeof window === "undefined" || !token) return;
  const clean = token.trim();
  localStorage.setItem("codebot_access_token", clean);
  localStorage.setItem("access_token", clean);
  localStorage.setItem("token", clean);
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("codebot_access_token");
  localStorage.removeItem("access_token");
  localStorage.removeItem("token");
}

export function getAuthHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Accept": "application/json",
    ...customHeaders,
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function refreshAuthToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      const token = data.access_token || data.token;
      if (token) {
        setAuthToken(token);
        return token;
      }
    }
  } catch {
    // Refresh failed
  }
  return null;
}

export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  let token = getAuthToken();

  // If no token stored locally, try silent refresh via session cookie
  if (!token) {
    token = (await refreshAuthToken()) || "";
  }

  const buildHeaders = (authToken: string): Headers => {
    const headers = new Headers(init?.headers);
    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }
    if (authToken && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${authToken}`);
    }
    return headers;
  };

  let response = await fetch(input, {
    ...init,
    headers: buildHeaders(token),
    credentials: "include",
  });

  // If 401 received, attempt refresh once and retry
  if (response.status === 401 && !String(input).includes("/api/auth/refresh")) {
    const newToken = await refreshAuthToken();
    if (newToken) {
      response = await fetch(input, {
        ...init,
        headers: buildHeaders(newToken),
        credentials: "include",
      });
    }
  }

  return response;
}

