# API reference

Base URL: `http://localhost:3000/api/v1` (the Angular dev server proxies `/api` to it).
All bodies are JSON. Unknown fields in request bodies are rejected (`400`).

## Identity (development only)

The API uses a **mock identity**: the signed-in user is always the synthetic employee, and the
role comes from the `x-mock-role` header (`employee` or `admin`), defaulting to
`MOCK_DEFAULT_ROLE`. The server refuses to start with mock auth when `NODE_ENV=production`.
See `docs/security.md` for the Entra ID replacement.

## Errors

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "The request contains invalid data.",
             "requestId": "842486cb-0e7f-47e0-8f66-d262cf7793cf",
             "details": [{ "path": "weeklyHours", "message": "Too big: expected number to be <=40" }] } }
```

`details` is present only for validation errors.

| Status | `code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Bad body, query, or malformed JSON |
| 401 | `UNAUTHORIZED` | Unknown mock role |
| 403 | `FORBIDDEN` | Role not allowed (admin-only route) |
| 404 | `NOT_FOUND` | Unknown route or resource, or someone else's resource |
| 409 | `CONFLICT` | Duplicate plan item; deleting a course that is in a plan |
| 413 | `PAYLOAD_TOO_LARGE` | Body over 16 KB |
| 429 | `RATE_LIMITED` | Assistant limit (`Retry-After` header set) |
| 503 | `ASSISTANT_UNAVAILABLE` | AI provider failed or timed out |
| 500 | `INTERNAL_ERROR` | Unexpected failure (details are logged, not returned) |

Every response includes an `x-request-id` header. Send your own (8-64 chars of `A-Za-z0-9._-`)
to correlate requests.

## Endpoints

| Method and path | Role | Purpose |
|---|---|---|
| `GET /health` | none | Liveness and active AI provider |
| `GET /profile/me` | any | Signed-in user's profile |
| `PATCH /profile/me` | any | Update `targetRole`, `interests`, `weeklyHours` (0-40), `preferredLearningStyle`, `skills` (replaces the list; levels 0-5) |
| `GET /skills` | any | Reference data: `{ skills, roles }` |
| `GET /courses` | any | Course list. Employees see only `active`; admins may add `status` |
| `GET /courses/:id` | any | One course (non-active only for admins) |
| `POST /courses` | admin | Create (id is a unique slug of the title) |
| `PATCH /courses/:id` | admin | Partial update |
| `DELETE /courses/:id` | admin | Delete; `409` if any plan contains it (retire it instead) |
| `GET /recommendations/courses` | any | Ranked courses with score, breakdown, reasons, plus `nextSkill` |
| `GET /recommendations/courses/:courseId` | any | One course's recommendation and explanation |
| `GET /learning-plans/current` | any | `{ plan: PlanView \| null }` |
| `POST /learning-plans` | any | Create a plan; archives the previous one |
| `POST /learning-plans/:id/items` | any | Add a course (`409` if present) |
| `PATCH /learning-plans/:id/items/:itemId` | any | Change `status`, `targetWeek` (1-4), or `sequence` (reorders) |
| `DELETE /learning-plans/:id/items/:itemId` | any | Remove an item; returns the plan |
| `POST /assistant/messages` | any | Ask the assistant (rate limited) |
| `POST /assistant/generate-plan` | any | Deterministic draft plus an assistant description (rate limited) |
| `POST /feedback` | any | `{ targetType: "recommendation" \| "assistant", targetId, helpful, comment? }` |
| `GET /demand` | admin | List demand signals: `{ items }` |
| `POST /demand` | admin | Create a signal |
| `PATCH /demand/:id` | admin | Partial update |
| `DELETE /demand/:id` | admin | Delete |

### Course list and recommendation query parameters

`search`, `level` (`beginner` \| `intermediate` \| `advanced`), `skill` (skill id),
`minDuration`, `maxDuration` (hours), `status` (admin, `/courses` only),
`sort` (`relevance` \| `title` \| `duration`; `/recommendations` defaults to `relevance`,
`/courses` to `title`), `page` (default 1), `pageSize` (default 24, max 100).
Search matches title, description, provider, skill ids, and skill names, case-insensitively.
Responses are `{ items, total, page, pageSize }`; `/recommendations/courses` adds
`nextSkill`, `modelVersion`, `generatedAt`, and `disclaimer`.

### Recommendation item

```json
{ "course": { "id": "docker-for-developers", "title": "Docker for Developers", "...": "..." },
  "score": 72,
  "breakdown": [{ "factor": "roleAlignment", "label": "Target-role skill alignment",
                  "weight": 0.35, "raw": 0.5, "points": 17.5 }, "..."],
  "reasons": ["Builds skills a Full-Stack Engineer often uses: Docker."] }
```

`score` is **course relevance**, a recommendation aid. It is not a performance rating and must
never be used for staffing, promotion, or employment decisions.

### Assistant

`POST /assistant/messages`

```json
{ "conversationId": "optional", "message": "What should I learn next?",
  "context": { "includeProfile": true, "includeCurrentPlan": true } }
```

```json
{ "conversationId": "…",
  "message": { "id": "…", "role": "assistant", "text": "Consider focusing on Docker next. …",
               "suggestedActions": ["View course", "Generate plan"], "createdAt": "…" },
  "recommendedCourseIds": ["docker-for-developers"],
  "grounding": [{ "sourceId": "course:docker-for-developers", "type": "course",
                  "id": "docker-for-developers", "title": "Docker for Developers" }],
  "fallback": false }
```

- `suggestedActions` is limited to: `View course`, `Generate plan`, `Open plan`, `Update profile`,
  `Browse courses`.
- `fallback: true` means the model output was rejected as malformed or ungrounded; `grounding`
  is empty and the text is a safe generic message.
- An unknown or foreign `conversationId` is ignored (new conversation) or `404` respectively.

`POST /assistant/generate-plan` accepts `{ "conversationId"?: "…" }` and returns the same shape
plus `draft`: `{ title, weeklyHours, totalHours, items: [{ courseId, courseTitle, durationHours,
sequence, targetWeek }], notes }`. Nothing is saved until the client calls `POST /learning-plans`.

## Sample requests

```bash
B=http://localhost:3000/api/v1

curl $B/health
curl $B/profile/me
curl -X PATCH $B/profile/me -H 'Content-Type: application/json' -d '{"weeklyHours":10}'
curl "$B/recommendations/courses?sort=title&pageSize=3"
curl -X POST $B/assistant/messages -H 'Content-Type: application/json' \
     -d '{"message":"What should I learn next?"}'
curl -X POST $B/assistant/generate-plan -H 'Content-Type: application/json' -d '{}'

# Admin-only routes need the mock role header
curl -X POST $B/courses -H 'Content-Type: application/json' -H 'x-mock-role: admin' \
     -d '{"title":"GraphQL Basics","provider":"Synthetic Learning Hub","description":"Learn schemas, queries and resolvers.","skillTags":["rest-api-design"],"level":"beginner","durationHours":4,"status":"active"}'
```

## Additions beyond the original blueprint

`GET /skills`, `GET /recommendations/courses/:courseId`, `DELETE /learning-plans/:id/items/:itemId`
(listed in the build brief), the `{ plan: null }` response shape, validation `details`, and the
`x-mock-role` header. They exist to support the profile form, course detail page, and "no plan
yet" state without special-casing errors.
