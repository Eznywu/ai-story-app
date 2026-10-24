import { Agent, EnvHttpProxyAgent, ProxyAgent, type Dispatcher } from "undici";

function readFirstEnv(names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function getOpenAiBaseUrl(): string | undefined {
  return readFirstEnv(["OPENAI_BASE_URL", "OPENAI_API_BASE_URL"]);
}

export function getGeminiBaseUrl(): string | undefined {
  return readFirstEnv(["GEMINI_BASE_URL"]);
}

function explicitProxyUrl(): string | undefined {
  return readFirstEnv(["POSTER_HTTP_PROXY", "AI_HTTP_PROXY"]);
}

function proxyEnvConfig() {
  const allProxy = readFirstEnv(["ALL_PROXY", "all_proxy"]);
  return {
    httpProxy: readFirstEnv(["HTTP_PROXY", "http_proxy"]) ?? allProxy,
    httpsProxy: readFirstEnv(["HTTPS_PROXY", "https_proxy"]) ?? allProxy,
    noProxy: readFirstEnv(["NO_PROXY", "no_proxy"]),
  };
}

export function posterProxyConfigured(): boolean {
  const explicit = explicitProxyUrl();
  if (explicit) return true;
  const envConfig = proxyEnvConfig();
  return Boolean(envConfig.httpProxy || envConfig.httpsProxy || envConfig.noProxy);
}

export function posterProxyMode(): "explicit" | "env" | "direct" {
  if (explicitProxyUrl()) return "explicit";
  return posterProxyConfigured() ? "env" : "direct";
}

const dispatcherCache = new Map<string, Dispatcher>();

export function getPosterHttpDispatcher(timeoutMs: number): Dispatcher {
  const explicit = explicitProxyUrl();
  const envConfig = proxyEnvConfig();
  const key = JSON.stringify({
    timeoutMs,
    explicit,
    ...envConfig,
  });
  const cached = dispatcherCache.get(key);
  if (cached) return cached;

  let dispatcher: Dispatcher;
  if (explicit) {
    dispatcher = new ProxyAgent({
      uri: explicit,
      connectTimeout: timeoutMs,
      headersTimeout: timeoutMs,
      bodyTimeout: timeoutMs,
    });
  } else if (envConfig.httpProxy || envConfig.httpsProxy || envConfig.noProxy) {
    dispatcher = new EnvHttpProxyAgent({
      ...envConfig,
      connectTimeout: timeoutMs,
      headersTimeout: timeoutMs,
      bodyTimeout: timeoutMs,
    });
  } else {
    dispatcher = new Agent({
      connectTimeout: timeoutMs,
      headersTimeout: timeoutMs,
      bodyTimeout: timeoutMs,
    });
  }

  dispatcherCache.set(key, dispatcher);
  return dispatcher;
}
