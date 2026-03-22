export type SynthmrClientOptions = {
  baseUrl: string;
  apiKey: string;
};

type Json = Record<string, unknown>;

export class SynthmrClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(options: SynthmrClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...(init?.headers ?? {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
    }
    return data as T;
  }

  async createStudy(input: {
    ideaText: string;
    geography?: string;
    industry?: string | null;
    pricePoints: number[];
    targetAudience?: Json | null;
  }) {
    return this.request<{ study: Json }>("/api/v1/studies", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async startRun(studyId: string, input?: { sampleSize?: number; populationMode?: "general" | "audience_specific"; populationSize?: number }) {
    return this.request<{ run: Json }>(`/api/v1/studies/${studyId}/runs`, {
      method: "POST",
      body: JSON.stringify(input ?? {}),
    });
  }

  async getRun(runId: string) {
    return this.request<Json>(`/api/v1/runs/${runId}`);
  }

  async getResults(runId: string) {
    return this.request<{ runId: string; results: Json }>(`/api/v1/runs/${runId}/results`);
  }

  async chatRun(runId: string, message: string) {
    return this.request<{ answer: string; citations?: string[]; structured?: Json }>(
      `/api/v1/runs/${runId}/chat`,
      {
        method: "POST",
        body: JSON.stringify({ message }),
      }
    );
  }
}
