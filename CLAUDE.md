# Career Platform Frontend — CLAUDE.md

## Stack

| Layer | Library / Version |
|---|---|
| Framework | React 19 + Vite 6 |
| Routing | React Router DOM 7 |
| Styling | Tailwind CSS 4 + PostCSS |
| State | React Context API only (no Redux/Zustand) |
| i18n | Custom JSON-based (no i18next) |
| Notifications | Sonner 2 |
| Testing | Playwright (E2E only) |
| Linting | ESLint 9 flat config |

---

## Scripts

```bash
npm run dev              # Vite dev server → http://localhost:5173
npm run build            # Production build → dist/
npm run lint             # ESLint check
npm run preview          # Preview built app
npm run test:e2e         # All Playwright E2E tests
npm run test:e2e:ui      # Playwright interactive mode
npm run test:e2e:smoke   # Smoke test only (e2e/smoke.spec.ts)
npm run test:e2e:report  # View last HTML report
```

## Environment

```
VITE_API_BASE_URL=https://api.mapyourcarey.in   # backend base; omit to use proxy mode
```

All client-visible vars must be `VITE_` prefixed.

---

## Project Layout

```
src/
├── main.jsx              # Entry point — ReactDOM.createRoot
├── App.jsx               # Toaster + AuthGate + AppRoutes
├── AppRoutes.jsx         # All routes (lazy-loaded)
├── AuthGate.jsx          # Session bootstrap + SessionProvider
├── apiClient.js          # HTTP helpers (apiGet/Post/Put/Delete/Patch)
├── auth.js               # Token helpers (getToken/setToken/clearToken)
├── session/
│   └── SessionContext.jsx
├── hooks/
│   ├── useSession.js     # bootstrap, login(), logout()
│   └── useContent.js     # t() wrapper for LanguageProvider
├── locales/
│   ├── LanguageProvider.jsx
│   ├── AdminLanguageProvider.jsx
│   ├── en.json / kn.json              # Student translations
│   └── admin.en.json / admin.kn.json  # Admin translations
├── pages/                # Route-level components (lazy-loaded)
│   ├── admin/            # 14+ admin pages
│   └── student/          # 6+ student pages
├── components/           # Shared UI (ProtectedRoute, ErrorBoundary, etc.)
├── ui/                   # Primitive UI atoms (Button, Card, Input, Page…)
├── layouts/
│   └── DashboardLayout.jsx
├── content/              # Static content data (fitBands, resultsBlocks…)
├── lib/                  # Utility modules (offlineQueue, replayQueue…)
└── toast.js              # Sonner toast helpers
e2e/                      # Playwright specs (*.spec.ts)
```

---

## Routing

- **Public:** `/`, `/login`, `/signup`, `/pricing`, `/guardian/verify`
- **Student (protected):** `/student/*`
- **Admin (protected):** `/admin/*`
- **Fallback:** `*` → `NotFound`

All page components are lazy-loaded. Protected routes use `<ProtectedRoute allowRoles={["student"|"admin"]}>`.

---

## Auth & Session

```js
// hooks/useSession.js
const { sessionUser, bootstrapping, login, logout } = useSession();

// session/SessionContext.jsx
const session = useSessionContext(); // session.role, session.email…
```

- Token stored in `sessionStorage` via `auth.js`.
- On 401: auto-refresh via `POST /v1/auth/refresh` (HttpOnly cookie), then retry once.
- On 401 at `/v1/auth/me`: hard logout.
- `/me` calls are de-duped (in-memory in-flight promise cache).

---

## API Client

```js
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from './apiClient';

const data   = await apiGet('/v1/endpoint');
const result = await apiPost('/v1/endpoint', { field: 'value' });
```

- Auto-injects `Authorization: Bearer <token>` and `Content-Type: application/json`.
- For question endpoints, auto-appends `?lang=en|kn` if not present.
- Errors thrown with `.status` and `.data` properties.
- Pass `FormData` to skip JSON serialization.

---

## i18n / Localization

**Languages:** English (`en`), Kannada (`kn`)

```js
// In any component:
import { useContent } from '../hooks/useContent';
const { t } = useContent();

t('key.path', 'Fallback text')            // basic
t('key.path', 'Hello {{name}}', { name }) // with template vars
```

- Language stored in `localStorage` key `career_platform_language`.
- Admin pages: wrap in `AdminLanguageProvider` and use `admin.{en,kn}.json`.
- Template syntax in JSON values: `{{ varName }}`.
- `LanguageSwitcher.jsx` is the UI toggle component.

---

## Styling

**Framework:** Tailwind CSS 4 (Vite plugin: `@tailwindcss/vite`).

**Design tokens** (defined in `src/index.css`, use via CSS variables or Tailwind):

| Token | Value |
|---|---|
| `--bg-app` | `#f6f7f9` |
| `--bg-card` | `#ffffff` |
| `--text-primary` | `#0f172a` |
| `--text-muted` | `#475569` |
| `--brand-primary` | `#0b1f3a` |
| `--border` | `#e2e8f0` |

No custom Tailwind theme extensions — all default utilities available.

---

## Common Patterns

```jsx
// Protected route
<ProtectedRoute allowRoles={["admin"]}>
  <AdminPage />
</ProtectedRoute>

// Toast
import { toast } from './toast';
toast.success('Saved!');
toast.error('Something went wrong.');

// Lazy page
const MyPage = React.lazy(() => import('./pages/MyPage'));
```

---

## Key Architectural Notes

1. **No Redux/Zustand** — session + language via React Context only.
2. **All page components are code-split** via `React.lazy()`.
3. **Dual i18n providers** — `LanguageProvider` for student, `AdminLanguageProvider` for admin.
4. **HttpOnly cookie** holds the refresh token; access token lives in `sessionStorage`.
5. **ESLint flat config** (`eslint.config.js`) — no `.eslintrc` files.
6. **Playwright only** — no Jest/Vitest unit tests exist yet.

---

## Git

- Always push to `dev`: `git push origin HEAD:dev`
- `main` is protected; use PRs to merge.
