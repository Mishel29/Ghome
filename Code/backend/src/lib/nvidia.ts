export const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
export const DEFAULT_NVIDIA_MODEL = "nvidia/nemotron-3-super-120b-a12b";

export type NvidiaChatMessage = { role: "system" | "user" | "assistant"; content: string };
export type NvidiaFailureCategory = "AUTH" | "REQUEST" | "RATE_LIMIT" | "UPSTREAM" | "NETWORK" | "TIMEOUT" | "MALFORMED" | "UNAVAILABLE";
export type FetchLike = typeof fetch;

export class NvidiaClientError extends Error {
  constructor(public readonly category: NvidiaFailureCategory) {
    super("NVIDIA request could not be completed");
  }
}

type NvidiaClientOptions = {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
  retries?: number;
  fetchImpl?: FetchLike;
  sleep?: (milliseconds: number) => Promise<void>;
};

type CompletionOptions = { json?: boolean; maxTokens?: number };

const wait = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

function failureForStatus(status: number): NvidiaFailureCategory {
  if (status === 401 || status === 403) return "AUTH";
  if (status === 429) return "RATE_LIMIT";
  if (status >= 500) return "UPSTREAM";
  return "REQUEST";
}

function isTransient(category: NvidiaFailureCategory) {
  return category === "RATE_LIMIT" || category === "UPSTREAM" || category === "NETWORK" || category === "TIMEOUT";
}

function responseContent(payload: unknown) {
  if (!payload || typeof payload !== "object") return undefined;
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return undefined;
  const content = (choices[0] as { message?: { content?: unknown } }).message?.content;
  return typeof content === "string" && content.trim() ? content.trim() : undefined;
}

export class NvidiaClient {
  readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly fetchImpl: FetchLike;
  private readonly sleep: (milliseconds: number) => Promise<void>;

  constructor(options: NvidiaClientOptions) {
    if (!options.apiKey?.trim()) throw new NvidiaClientError("UNAVAILABLE");
    this.apiKey = options.apiKey.trim();
    this.model = options.model?.trim() || DEFAULT_NVIDIA_MODEL;
    this.baseUrl = (options.baseUrl?.trim() || NVIDIA_BASE_URL).replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs ?? 12_000;
    this.retries = Math.min(Math.max(options.retries ?? 1, 0), 2);
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.sleep = options.sleep ?? wait;
  }

  async complete(messages: NvidiaChatMessage[], options: CompletionOptions = {}) {
    let failure: NvidiaClientError | undefined;
    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
          body: JSON.stringify({
            model: this.model,
            messages,
            temperature: 0.2,
            top_p: 1,
            max_tokens: options.maxTokens ?? 600,
            stream: false,
            ...(options.json ? { response_format: { type: "json_object" } } : {}),
          }),
          signal: controller.signal,
        });
        if (!response.ok) throw new NvidiaClientError(failureForStatus(response.status));
        const content = responseContent(await response.json());
        if (!content) throw new NvidiaClientError("MALFORMED");
        return content;
      } catch (error) {
        failure = error instanceof NvidiaClientError
          ? error
          : error instanceof DOMException && error.name === "AbortError"
            ? new NvidiaClientError("TIMEOUT")
            : new NvidiaClientError("NETWORK");
        if (!isTransient(failure.category) || attempt === this.retries) throw failure;
        await this.sleep(150 * (attempt + 1));
      } finally {
        clearTimeout(timer);
      }
    }
    throw failure ?? new NvidiaClientError("NETWORK");
  }
}

export function createNvidiaClient(env: Record<string, string | undefined> = process.env, options: Omit<NvidiaClientOptions, "apiKey" | "model"> = {}) {
  if (!env.NVIDIA_API_KEY?.trim()) return undefined;
  return new NvidiaClient({ apiKey: env.NVIDIA_API_KEY, model: env.NVIDIA_MODEL, ...options });
}
