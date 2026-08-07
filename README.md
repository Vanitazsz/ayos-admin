# A-yos Admin Web App

The **A-yos Admin Web App** is a premium, high-performance SaaS dashboard designed to manage the A-yos platform ecosystem. It provides administrators with a centralized hub for monitoring revenue, managing users and workers, and reviewing system analytics.

## 🚀 Tech Stack
- **Framework:** React 19 + Vite 8
- **Styling:** Tailwind CSS v4 (Vanilla configuration, premium design tokens)
- **Icons:** Lucide React
- **Routing:** React Router v7
- **Data Visualization:** Recharts
- **Backend:** Supabase (Auth, Data API, Realtime)

## ✨ Premium Features
- **Dynamic Live Dashboard:** Simulated real-time activity feed on the dashboard.
- **Global Command Palette:** Instantly navigate anywhere using `Ctrl + K` (or `Cmd + K`).
- **Toast Notifications:** Sleek, global sliding notifications for success/error feedback.
- **Skeleton Loading:** Shimmering placeholder components provide perceived performance improvements during data fetching.
- **Responsive Navigation:** A collapsible sidebar that gracefully transitions into a sliding drawer on mobile devices.

---

## 🛠️ Admin Workflow Guide

The application follows a structured workflow for administrative tasks, ensuring secure access and efficient management.

### 1. Authentication Flow
- **Access:** All administrative operations are secured behind the `/login` route.
- **State Management:** The `AuthContext` handles session states. Upon successful login, the administrator is redirected to the protected dashboard area via the `ProtectedRoute` wrapper.

### 2. Main Navigation & Organization
The platform is organized into logical groups to prevent visual clutter:
- **Core Operations:** Dashboard, Users, Workers, Bookings.
- **Financial & Quality:** Payments, Reviews, Support.
- **System & Administration:** Reports, Analytics, Notifications, Audit Logs.
- **Settings:** Platform Settings, Profile Management, and Trash.

### 3. Worker Management Workflow
- **Verification:** Admins can view pending worker approvals, inspect their professional profiles, and approve or reject them.
- **Actions:** Using the action menus in the Workers table, admins can view detailed profiles (via a slide-out Drawer), suspend active workers, or permanently delete accounts.

### 4. Global Quick Actions
- Pressing `Ctrl + K` triggers the global search palette, allowing administrators to rapidly jump from any page to another (e.g., from reading Audit Logs straight to modifying Platform Settings).

---

## 💻 Development Setup

This is a standalone app and does not depend on any workspace or monorepo.

### Prerequisites
- Node.js (v18+)
- pnpm (v11)

### Environment
1. Copy `.env.example` to `.env` and fill in the Supabase URL and publishable key:
   ```bash
   Copy-Item .env.example .env
   ```
   > The publishable key is client-safe; never place a service-role or secret key here.

### Running Locally
1. Navigate to the project directory:
   ```bash
   cd admin
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start the development server:
   ```bash
   pnpm dev
   ```
4. Build for production:
   ```bash
   pnpm build
   ```

### Other Scripts
| Command                  | Purpose                                     |
| ------------------------ | ------------------------------------------- |
| `pnpm dev`               | Start the Vite development server           |
| `pnpm build`             | Create a production build                   |
| `pnpm preview`           | Preview the production build locally        |
| `pnpm lint`              | Run oxlint checks                           |
| `pnpm check:no-mocks`    | Verify no production mock data has regressed |

*Designed and engineered as a state-of-the-art enterprise administrative tool.*
