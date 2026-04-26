# FieldPulse — Build Walkthrough

## Overview
Built a complete **offline-first Progressive Web App** for field service management with a Node.js/Express backend. The app works entirely offline and syncs data automatically when connected.

## Architecture

### Frontend (Vanilla HTML/CSS/JS PWA)
- **SPA Router**: Hash-based navigation with animated transitions
- **IndexedDB**: Local storage for submissions, photos, signatures, routes, and sync queue
- **Service Worker**: Cache-first for app shell, network-first for API calls
- **Sync Engine**: Outbox pattern — queues all mutations locally, drains when online
- **UUID Generation**: Client-side UUIDs for offline record creation

### Backend (Node.js/Express + SQLite)
- **Authentication**: JWT-based with bcrypt password hashing
- **Idempotent Sync**: All endpoints check for existing records to prevent duplicates
- **Transaction Support**: Route sync uses transactions for atomic point insertion
- **Sync Logging**: All inbound operations are logged for audit
- **50MB JSON limit**: Accommodates base64-encoded photos

## Design System

Dark slate + warm amber palette with topographic texture background. Custom CSS with 40+ design tokens, 15+ animation keyframes, and comprehensive component library.

| Element | Approach |
|---------|----------|
| Colors | Dark deep blues (#0f1419) + amber accent (#e8a838) |
| Typography | Plus Jakarta Sans via Google Fonts |
| Texture | CSS-only topographic contour lines |
| Components | Cards, forms, buttons, badges, gauges, toasts |
| Animations | Fade, slide, scale, pulse, ripple, shimmer |

## Pages Built

### Login / Registration
Split-panel layout with branding and animated form. Supports offline login with cached credentials.

![Login Page](C:/Users/searc/.gemini/antigravity/brain/ca416f08-cc11-4fa6-81c1-4eda9ef4b462/login_page_1777234089434.png)

### Dashboard
Quick action cards, stats row (submissions, today, photos, routes), sync gauge, and activity feed.

![Dashboard](C:/Users/searc/.gemini/antigravity/brain/ca416f08-cc11-4fa6-81c1-4eda9ef4b462/dashboard_after_submit_1777234277130.png)

### New Submission (Form Wizard)
4-step wizard: Customer Info → Service Details → Photos & Signature → Review & Submit. Progress indicator, GPS auto-capture, camera integration, signature pad.

![Submission Review](C:/Users/searc/.gemini/antigravity/brain/ca416f08-cc11-4fa6-81c1-4eda9ef4b462/submission_review_1777234258934.png)

### History
Filterable submission list with sync status badges (Synced/Pending/Failed). Click to view detail modal. Retry failed syncs.

![History](C:/Users/searc/.gemini/antigravity/brain/ca416f08-cc11-4fa6-81c1-4eda9ef4b462/history_page_1777234287520.png)

### Settings
Profile, sync configuration (auto-sync toggle, interval), storage usage with progress bar, data management, and logout.

![Settings](C:/Users/searc/.gemini/antigravity/brain/ca416f08-cc11-4fa6-81c1-4eda9ef4b462/settings_page_1777234298381.png)

### Routes
GPS route tracking with start/stop toggle, canvas-based visualization, haversine distance calculation, and route history.

### Photo & Signature (Capture)
Tabs for standalone photo capture (camera + file fallback) and signature collection with smooth bezier curve canvas drawing.

## App Recording

![App Flow Recording](C:/Users/searc/.gemini/antigravity/brain/ca416f08-cc11-4fa6-81c1-4eda9ef4b462/fieldpulse_full_test_1777233975751.webp)

## File Structure

```
Progressive/
├── public/
│   ├── index.html              # App shell
│   ├── manifest.json           # PWA manifest
│   ├── sw.js                   # Service Worker
│   ├── css/
│   │   ├── design-system.css   # Tokens, reset, animations
│   │   ├── components.css      # Core component styles
│   │   ├── components-ext.css  # Extended component styles
│   │   └── layout.css          # Layout & responsive
│   └── js/
│       ├── app.js              # Bootstrap
│       ├── router.js           # SPA router
│       ├── db.js               # IndexedDB wrapper
│       ├── sync.js             # Sync engine
│       ├── components/
│       │   ├── toast.js
│       │   ├── signature-pad.js
│       │   ├── photo-capture.js
│       │   └── connection-indicator.js
│       ├── views/
│       │   ├── login.js
│       │   ├── dashboard.js
│       │   ├── submissions.js
│       │   ├── capture.js
│       │   ├── routes.js
│       │   ├── history.js
│       │   └── settings.js
│       └── utils/
│           ├── uuid.js
│           └── gps.js
└── server/
    ├── package.json
    ├── index.js                # Express entry point
    ├── db/
    │   ├── database.js         # SQLite init
    │   └── schema.sql          # Schema definition
    ├── middleware/
    │   └── auth.js             # JWT middleware
    └── routes/
        ├── auth.js             # Register/Login
        ├── submissions.js      # CRUD + sync
        ├── photos.js           # Photo sync
        ├── signatures.js       # Signature sync
        ├── routes.js           # Route tracking sync
        └── sync.js             # Sync status
```

## Verification
- ✅ Server starts successfully on port 3000
- ✅ Database initializes with all tables
- ✅ User registration and JWT authentication working
- ✅ All 7 pages render correctly with animations
- ✅ Form wizard captures and stores data in IndexedDB
- ✅ Submissions sync to backend (shows "Synced" badge)
- ✅ Connection indicator reflects online/offline status
- ✅ Toast notifications appear for user actions
- ✅ Settings page shows accurate storage stats

## Running the App

```bash
cd server
npm install
node index.js
# Open http://localhost:3000
```
