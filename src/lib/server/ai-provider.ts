export interface AIDraftRequest {
  system: string;
  prompt: string;
  model?: string;
}

export interface AIProvider {
  readonly name: string;
  generate(request: AIDraftRequest): Promise<string>;
}

export class AIProviderUnavailableError extends Error {
  constructor(message = "AI generation is not configured or not included in your plan.") {
    super(message);
    this.name = "AIProviderUnavailableError";
  }
}

class OpenAICompatibleProvider implements AIProvider {
  readonly name = "openai-compatible";

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = "https://api.openai.com/v1",
    private readonly defaultModel = "gpt-4o-mini",
  ) {}

  async generate(request: AIDraftRequest): Promise<string> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: request.model || this.defaultModel,
        temperature: 0.4,
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.prompt },
        ],
      }),
    });
    if (!response.ok) throw new AIProviderUnavailableError("The configured AI provider could not generate a draft.");
    const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new AIProviderUnavailableError("The configured AI provider returned an invalid draft.");
    }
    return content.trim();
  }
}

export const getAIProvider = (input: {
  providerName?: string | null;
  apiKey?: string | null;
  publicConfig?: Record<string, unknown> | null;
}): AIProvider => {
  if (input.providerName !== "openai-compatible" || !input.apiKey) {
    throw new AIProviderUnavailableError();
  }
  const baseUrl = typeof input.publicConfig?.base_url === "string" ? input.publicConfig.base_url : undefined;
  const model = typeof input.publicConfig?.model === "string" ? input.publicConfig.model : undefined;
  return new OpenAICompatibleProvider(input.apiKey, baseUrl, model);
};
