import { ipcMain } from "electron";
import type { IpcResult, OllamaModel } from "../../shared/types";
import { wrap } from "./wrap";

const DEFAULT_BASE_URL = "http://localhost:11434";

interface OllamaTagsResponse {
  models?: { name?: string; details?: { family?: string; parameter_size?: string } }[];
}

export function registerOllamaHandlers(): void {
  ipcMain.handle(
    "ollama:list-models",
    async (_event, baseUrl: string | null): Promise<IpcResult<OllamaModel[]>> =>
      wrap(() => listModels(baseUrl)),
  );

  ipcMain.handle(
    "ollama:probe-model",
    async (
      _event,
      baseUrl: string | null,
      model: string,
    ): Promise<IpcResult<{ dimensions: number }>> => wrap(() => probeModel(baseUrl, model)),
  );
}

async function listModels(baseUrl: string | null): Promise<OllamaModel[]> {
  const base = (baseUrl?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const response = await fetchWithTimeout(`${base}/api/tags`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Ollama tags returned ${response.status}: ${await response.text()}`);
  }
  const json = (await response.json()) as OllamaTagsResponse;
  const models = json.models ?? [];
  return models
    .filter((m): m is { name: string; details?: { family?: string; parameter_size?: string } } =>
      typeof m.name === "string",
    )
    .map((m) => ({
      name: m.name,
      details: [m.details?.family, m.details?.parameter_size].filter(Boolean).join(" "),
      embeddingDimensions: null,
    }));
}

/**
 * Run a one-token embed call against `model` and report the returned
 * vector length. Use case: schema editor showing the dimension next to
 * a picked model so the operator can spot column/dim mismatches before
 * saving.
 */
async function probeModel(
  baseUrl: string | null,
  model: string,
): Promise<{ dimensions: number }> {
  const base = (baseUrl?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const response = await fetchWithTimeout(`${base}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt: "x" }),
  });
  if (!response.ok) {
    throw new Error(`Ollama embed probe returned ${response.status}: ${await response.text()}`);
  }
  const json = (await response.json()) as {
    embedding?: number[];
    embeddings?: number[][];
  };
  const vec = json.embedding ?? json.embeddings?.[0];
  if (!Array.isArray(vec)) {
    throw new Error("Ollama returned no embedding vector");
  }
  return { dimensions: vec.length };
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    throw new Error(
      `Ollama request to ${url} failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  } finally {
    clearTimeout(timer);
  }
}
