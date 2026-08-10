# A-yos Admin Web App

The **A-yos Admin Web App** is a premium, high-performance SaaS dashboard designed to manage the A-yos platform ecosystem. It provides administrators with a centralized hub for monitoring revenue, managing users and workers, and reviewing system analytics.

## Tech Stack
- **Framework:** React 19 + Vite 8
- **Styling:** Tailwind CSS v4 (Vanilla configuration, premium design tokens)
- **Icons:** Lucide React
- **Routing:** React Router v7
- **Data Visualization:** Recharts
- **Backend:** Supabase (Auth, Data API, Realtime)

---

## Development Setup

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
   cd ayos-admin
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
