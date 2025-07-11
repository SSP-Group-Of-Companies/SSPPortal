# SSPPortal – Central Access System for Internal SSP Tools

**SSPPortal** is the centralized login and dashboard application for all internal tools at **SSP Truck Line Inc.**  
It serves as the entry point for department-specific apps such as DriveDock (Safety), DispatchSafe (Dispatch), and HRDock (HR), all under a unified domain.

---

## Project Structure

This monorepo currently includes:

- **Frontend** – Next.js 14 (App Router) + Tailwind CSS + TypeScript
- **Auth** – Microsoft Entra ID (SSO via OAuth/OpenID Connect)
- **RBAC** – Role-based access control via Entra ID groups
- **Session** – Secure HTTP-only cookie (`ssptoken`)
- **Subapp Routing** – Modular architecture (e.g., `/drivedock`, `/dispatchsafe`)

Backend shared services (like `/auth/me`) are planned.

---

## 🏗️ Current Status

| Component           | Stack/Details                        | Status     |
|---------------------|--------------------------------------|------------|
| **Frontend**        | Next.js + Tailwind + TypeScript      | ✅ Active  |
| **Auth**            | Microsoft SSO (Entra ID)             | ✅ Active  |
| **RBAC**            | Group-based access in Entra ID       | ✅ Active  |
| **Shared API**      | `/auth/me`, `/auth/logout`           | 🔄 Planned |
| **Subapp Proxying** | NGINX or Vercel edge config          | 🔄 Planned |

---

## Application Flow

User → portal.sspgroup.com
↓
Microsoft SSO Login (OAuth)
↓
JWT Token saved as ssptoken (secure cookie)
↓
User redirected to /dashboard
↓
Sidebar renders tools based on role
↓
Click tool (e.g., DriveDock) → navigates to /drivedock


---

## 🛡 Git Strategy

We follow GitHub Flow:

- `main` – production
- `dev` – development (staging)
- `feature/*` – feature branches
- `hotfix/*` – emergency fixes

---

## Contributors

| Name   | Role                          |
|--------|-------------------------------|
| Parv   | Department Lead / Designer    |
| Faruq  | Full-stack Developer          |
| Ridoy  | Full-stack Developer |

---

##  License

This project is internal and proprietary to **SSP Truck Line Inc.**  
© All rights reserved.



