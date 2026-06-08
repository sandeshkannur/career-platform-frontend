# Admin Console Changelog

## 2026-06-08

### Added

- **`src/components/AdminHeader.jsx`** — New shared header component for admin pages.
  - Props: `{ title, crumbs = [] }`
  - Renders: `[← Back]  Admin Console / {crumbs} / {title}  [Logout]`
  - Back navigates to the previous history entry (`navigate(-1)`).
  - "Admin Console" is a `Link` to `/admin` (CMS home anchor).
  - Logout reuses `useSession().logout` — no new auth logic introduced.
  - Height, padding, and type scale match the student dashboard header for visual parity.

### Changed

- **`src/pages/AdminHomePage.jsx`** — Flat button list replaced with five labelled sections.

  | Section | Items |
  |---|---|
  | Career Data Management | Career Clusters, Careers, Career Wizard, Key Skills, Mappings, Bulk Upload |
  | Expert Validation (SME) | SME Registry, SME Tokens |
  | Scoring Engine Configuration | Associated Qualities (AQs), Student Skills (26), Fit Band Thresholds, CPS Factor Weights |
  | Validation & Intelligence | Assessment Simulator, Career Proximity |
  | Monitoring & Compliance | Engine Health, Platform Analytics, DPDP Compliance, Audit Trail |

  - Sections rendered from a config array (`label` + `route` + `desc`); no hardcoded JSX per item.
  - One-line muted description (12 px, `#64748b`) added beneath every button.
  - **Label fix:** "Student Skills (24)" corrected to "Student Skills (26)".
  - SkeletonPage wrapper, `Welcome, {name}` subtitle, and Logout action preserved unchanged.

### Not changed

- `src/AppRoutes.jsx` — all routes left intact; no new routes added.
- No backend, scoring, student, or non-admin files were modified.
