import { describe, expect, it, vi } from "vitest";
import { createNvidiaClient, DEFAULT_NVIDIA_MODEL, NVIDIA_BASE_URL, NvidiaClient, NvidiaClientError, type FetchLike } from "./nvidia.js";

function completion(content = "A grounded reply") {
  return { ok: true, status: 200, json: vi.fn().mockResolvedValue({ choices: [{ message: { content } }] }) } as unknown as Response;
}

async function failureCategory(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    expect(error).toBeInstanceOf(NvidiaClientError);
    return (error as NvidiaClientError).category;
  }
  throw new Error("Expected NVIDIA request to fail");
}

describe("NvidiaClient", () => {
  it("uses the configured hosted endpoint and model", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(completion());
    const client = new NvidiaClient({ apiKey: "test-key", model: "test-model", baseUrl: "https://nvidia.test/v1/", fetchImpl: fetchImpl as FetchLike });

    await expect(client.complete([{ role: "user", content: "Find homes" }])).resolves.toBe("A grounded reply");
    expect(fetchImpl).toHaveBeenCalledWith("https://nvidia.test/v1/chat/completions", expect.objectContaining({
      headers: expect.objectContaining({ authorization: "Bearer test-key" }),
      body: expect.stringContaining('"model":"test-model"'),
    }));
  });

  it("uses the default model and leaves the client unavailable without a key", () => {
    expect(new NvidiaClient({ apiKey: "test-key" }).model).toBe(DEFAULT_NVIDIA_MODEL);
    expect(createNvidiaClient({})).toBeUndefined();
    expect(() => new NvidiaClient({})).toThrow(NvidiaClientError);
    expect(NVIDIA_BASE_URL).toBe("https://integrate.api.nvidia.com/v1");
  });

  it("retries a transient rate-limit response once", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce({ ok: false, status: 429, json: vi.fn() }).mockResolvedValueOnce(completion("Recovered"));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const client = new NvidiaClient({ apiKey: "test-key", fetchImpl: fetchImpl as FetchLike, sleep });

    await expect(client.complete([{ role: "user", content: "Find homes" }])).resolves.toBe("Recovered");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("does not retry invalid upstream requests", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 400, json: vi.fn() });
    const client = new NvidiaClient({ apiKey: "test-key", fetchImpl: fetchImpl as FetchLike });

    await expect(failureCategory(() => client.complete([{ role: "user", content: "Find homes" }]))).resolves.toBe("REQUEST");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("categorizes upstream, network, malformed, and empty responses safely", async () => {
    const upstream = new NvidiaClient({ apiKey: "test-key", retries: 0, fetchImpl: vi.fn().mockResolvedValue({ ok: false, status: 500, json: vi.fn() }) as FetchLike });
    const network = new NvidiaClient({ apiKey: "test-key", retries: 0, fetchImpl: vi.fn().mockRejectedValue(new Error("offline")) as FetchLike });
    const malformed = new NvidiaClient({ apiKey: "test-key", retries: 0, fetchImpl: vi.fn().mockResolvedValue({ ok: true, status: 200, json: vi.fn().mockResolvedValue({ choices: [] }) }) as FetchLike });
    const empty = new NvidiaClient({ apiKey: "test-key", retries: 0, fetchImpl: vi.fn().mockResolvedValue(completion("   ")) as FetchLike });

    await expect(failureCategory(() => upstream.complete([]))).resolves.toBe("UPSTREAM");
    await expect(failureCategory(() => network.complete([]))).resolves.toBe("NETWORK");
    await expect(failureCategory(() => malformed.complete([]))).resolves.toBe("MALFORMED");
    await expect(failureCategory(() => empty.complete([]))).resolves.toBe("MALFORMED");
  });

  it("turns an aborted request into a timeout without exposing transport details", async () => {
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    }));
    const client = new NvidiaClient({ apiKey: "test-key", retries: 0, timeoutMs: 1, fetchImpl: fetchImpl as FetchLike });

    await expect(failureCategory(() => client.complete([]))).resolves.toBe("TIMEOUT");
  });
});
