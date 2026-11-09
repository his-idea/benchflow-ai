# AI provider guide

## The interface

`server/src/providers/ai-provider.interface.ts`

```ts
interface AIProvider {
  readonly name: string;
  complete(request: AICompletionRequest): Promise<AICompletionResult>;
}
```

A request carries the trusted `system` prompt, the fenced `user` content, the structured
`context` it was built from, the raw `message`, an `AbortSignal`, and the `task` (`chat` or
`plan`). A result is raw text plus optional token usage. Providers **never** decide what reaches
the user: `assistant.service.ts` validates every response first.

Providers throw `AIProviderError` with a `kind` (`timeout`, `auth`, `rate_limited`,
`unavailable`) and optional HTTP `status`, never the SDK's message, which could echo request
details. The service maps any provider failure to `503 ASSISTANT_UNAVAILABLE` and logs only the
kind and status.

## Selecting a provider

`AI_PROVIDER=mock` (default) or `AI_PROVIDER=azure-openai`, read once at startup by
`providers/index.ts`. The server also reports the active provider at `GET /api/v1/health`.

## MockAIProvider

Deterministic and credential-free. It composes answers **only from the supplied context**, so
the whole app works offline. Intent is chosen by keyword, in this order:

1. Policy words (voucher, certification, enrol, privacy, bench, hours, ...) **and** retrieved
   knowledge snippets: answers from the approved snippets.
2. Plan words: explains that a draft can be generated, with likely courses.
3. "next / learn / focus": the suggested next skill and its top course.
4. "course / recommend / match my profile": top three courses with reasons.
5. Any retrieved knowledge: answers from it.
6. Otherwise an honest "I don't have approved information" reply with no references.

Keywords are word-bounded, so "Who will win the football match?" is *not* treated as a course
question. For the `plan` task it describes the deterministic draft.

## AzureOpenAIProvider

`providers/azure-openai.provider.ts`, built on the official `openai` package (`AzureOpenAI`
client). It sends:

- `model`: your **deployment name** (`AZURE_OPENAI_DEPLOYMENT`)
- `messages`: the system and user prompts
- `response_format`: strict JSON schema (`ASSISTANT_OUTPUT_JSON_SCHEMA`) with fields `answer`,
  `recommendedCourseIds`, `suggestedActions`, `sourceIds`
- `max_completion_tokens`: 800

The client is configured with a timeout (`AI_TIMEOUT_MS`) and one SDK retry; the service adds its
own hard timeout and abort. HTTP 401/403 map to `auth`, 429 to `rate_limited`, aborts to
`timeout`, anything else to `unavailable`.

### What has and has not been verified

Unit tests exercise this provider against an **injected fake client**: request shape, error
mapping, and that errors never leak the API key. It has **not** been run against a real Azure
OpenAI endpoint (no credentials were available). Run the checks below with your own deployment
before relying on it. If your deployment does not support strict `json_schema` output, the
service's validator still rejects malformed output, but you may need to adjust `response_format`.

### Adding credentials safely

1. Confirm the app works with `AI_PROVIDER=mock`.
2. `cp server/.env.example server/.env` (the real file is git-ignored).
3. Set, in `server/.env` only:
   ```
   AI_PROVIDER=azure-openai
   AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com
   AZURE_OPENAI_API_KEY=<key>
   AZURE_OPENAI_DEPLOYMENT=<deployment name>
   AZURE_OPENAI_API_VERSION=<api version your resource supports>
   ```
4. Start the server. If a variable is missing or still a placeholder, startup fails with a message
   naming the variable (never its value).
5. Check `GET /api/v1/health` reports `"aiProvider":"azure-openai"`, then ask the assistant a
   question and run `POST /assistant/generate-plan`.
6. For deployed environments use Azure Key Vault or a managed identity instead of a key.
   (Managed-identity token auth is not implemented in this MVP; add it in
   `azure-openai.provider.ts` using the SDK's Azure AD token provider support.)

Never put these values in anything under `client/`.

## Output validation (applies to every provider)

`modules/assistant/output-validator.ts` accepts a response only if all of these hold:

- It parses as JSON (a fenced code block is tolerated) and matches the schema.
- Every `recommendedCourseIds` entry is a course that was supplied in the context.
- Every `sourceIds` entry is a source that was supplied in the context.
- Every recommended course is also cited as `course:<id>` in `sourceIds`.
- `suggestedActions` are filtered to the five allowed actions.

An empty `sourceIds` is valid and is how an honest "I can't answer that" is expressed.
Otherwise the response is replaced by the fallback message and `fallback: true`.

## Prompt construction

- `context-builder.ts` decides what the model may know. It never includes the user's name,
  never includes personalised scores when `includeProfile` is false, and always includes the
  course cited for the next-skill suggestion.
- `prompt-builder.ts` holds the trusted system instructions and fences `<context>` and
  `<user_message>`, stripping any look-alike delimiter from untrusted text.
- Both are pure functions with their own tests.

## Adding another provider

1. Implement `AIProvider` in `server/src/providers/`.
2. Throw `AIProviderError` for failures; return raw text.
3. Add its name to the `AI_PROVIDER` enum in `config/env.ts`, validate its settings in the same
   `superRefine`, and branch in `providers/index.ts`.
4. Test it with an injected fake client, like `azure-provider.test.ts`.
