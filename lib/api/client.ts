export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:8000';
};

const API_BASE_URL = getApiBaseUrl();

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}/api/v1${endpoint}`;
  
  // Set credentials to include so HTTP-only cookies are sent automatically
  const defaultOptions: RequestInit = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);

    if (response.status === 401) {
      // Session expired or unauthenticated, redirect to login
      if (typeof window !== 'undefined') {
        // Clear auth cookies via the Next.js API logout route
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Request failed with status ${response.status}`);
    }

    // Handle empty or 204 No Content responses
    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  } catch (error: any) {
    console.error(`API Fetch error on ${endpoint}:`, error);
    throw error;
  }
}

// Client-side authentication helpers that hit Next.js route handlers
export const authClient = {
  async login(email: string, password: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Login failed');
    }
    return await res.json();
  },

  async logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
  },

  async me() {
    const res = await fetch('/api/auth/me');
    if (!res.ok) throw new Error('Not authenticated');
    return await res.json();
  }
};
