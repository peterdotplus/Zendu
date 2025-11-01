export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const error: { status: number; statusText: string; body?: unknown } = {
      status: res.status,
      statusText: res.statusText,
    };
    try {
      error.body = await res.json();
    } catch {}
    throw error;
  }
  return (await res.json()) as T;
}
