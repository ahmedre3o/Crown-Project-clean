# AI Assistant – System Knowledge

The Crown Services ERP AI assistant uses a **system knowledge** file so it only answers from real features and flows, and does not invent endpoints or UI.

## Where it lives

- **Backend:** `backend/systemKnowledge.ts` — constant `SYSTEM_KNOWLEDGE` (string) injected into the system prompt on every chat request.

## How to update when you add features

1. **Open** `backend/systemKnowledge.ts`.
2. **Add or edit a section** (use markdown `##` headings) that describes:
   - The feature in one or two sentences.
   - The **exact** API path(s), e.g. `GET /api/admin/analytics/summary?from=&to=`.
   - The **exact** UI path (e.g. Sidebar label and route), in both Arabic and English when relevant, e.g. `التقارير / Reports → /store-admin/reports`.
   - Short, numbered steps the user can follow (e.g. “1. Open Sidebar > Reports. 2. Set date range…”).
3. **Do not** add endpoints or UI that do not exist in the codebase.
4. **Keep** wording concise so the model uses it reliably; avoid long paragraphs.

## What the assistant uses

- **System knowledge:** Content of `SYSTEM_KNOWLEDGE` (roles, notifications, online orders, reservations, dashboard, reports, slow-moving stock, etc.).
- **Live context:** Sent with each message from the frontend: `userId`, `shopId`, `pathname`, `lang`. Optional: reports date range, source, bucket when on the reports page.
- **Response language:** Forced from the request `lang` (`ar` or `en`); the assistant must answer only in that language.

## Testing

After editing `systemKnowledge.ts`, restart the backend and ask the assistant something that depends on the new or changed section. Prefer questions that require a concrete path or endpoint (e.g. “How do I export a report to PDF?”) and check that the answer matches the docs and the app.
