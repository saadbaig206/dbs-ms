export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    if (process.env.NEXT_PUBLIC_API_URL && (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1'))) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
    return '';
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return process.env.NEXT_PUBLIC_API_URL || '';
};

const API_BASE_URL = getApiBaseUrl();

const getToken = (): string => {
  if (typeof window === 'undefined') return '';
  const local = localStorage.getItem('access_token');
  if (local) return local;
  const match = document.cookie.match(/(?:^|; )access_token=([^;]*)/);
  return match ? match[1] : '';
};

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}/api/v1${endpoint}`;
  const token = getToken();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };

  const defaultOptions: RequestInit = {
    credentials: 'include',
    signal: controller.signal,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);
    clearTimeout(timeoutId);

    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        authClient.logout();
        if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
          window.location.href = '/login?logout=1';
        }
      }
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Request failed with status ${response.status}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error(`API Fetch error on ${endpoint}:`, error);
    throw error;
  }
}

// Client-side authentication helpers hitting FastAPI /api/v1/auth directly
export const authClient = {
  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || data.error || 'Invalid email or password');
    }

    const data = await res.json();

    if (typeof window !== 'undefined') {
      const isSecure = window.location.protocol === 'https:';
      const secureFlag = isSecure ? '; Secure' : '';
      const maxAge = 60 * 60 * 24 * 8; // 8 days
      document.cookie = `access_token=${data.access_token}; path=/; max-age=${maxAge}; SameSite=Lax${secureFlag}`;
      document.cookie = `refresh_token=${data.refresh_token}; path=/; max-age=${maxAge}; SameSite=Lax${secureFlag}`;
      document.cookie = `user_role=${data.role}; path=/; max-age=${maxAge}; SameSite=Lax${secureFlag}`;
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user_role', data.role);
    }

    return data;
  },

  async logout() {
    if (typeof window !== 'undefined') {
      const pastDate = 'expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;';
      document.cookie = `access_token=; max-age=0; ${pastDate}`;
      document.cookie = `refresh_token=; max-age=0; ${pastDate}`;
      document.cookie = `user_role=; max-age=0; ${pastDate}`;
      document.cookie = `access_token=; max-age=0; ${pastDate} SameSite=Lax`;
      document.cookie = `refresh_token=; max-age=0; ${pastDate} SameSite=Lax`;
      document.cookie = `user_role=; max-age=0; ${pastDate} SameSite=Lax`;
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_role');
      localStorage.clear();
    }
  },

  async me() {
    const token = getToken();

    const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      credentials: 'include',
    });

    if (!res.ok) throw new Error('Not authenticated');
    return await res.json();
  }
};
