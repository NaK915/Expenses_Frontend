# Commonplace frontend

Next.js frontend for the Expense Split API.

## Run locally

1. Start the backend from `../backend` using its documented setup. The API should be reachable at `http://localhost:8000`.
2. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_URL` if the backend uses another address.
3. Install dependencies and start the frontend:

	```bash
	npm install
	npm run dev
	```

Open `http://localhost:3000`.

## Included screens

- Landing, sign-in, and account registration
- Dashboard with group spending and per-group net balances
- Group activity, expense create/edit/delete, balances, and adding members by email
- Personal profile with a preferred display currency (defaults to INR) and create-group entry point
- Fixed group currency selected at group creation, with converted estimates shown alongside group-currency figures
- Equal, specific-amount, and weighted-parts expense splits

Authentication uses a bearer token stored in browser local storage. The API base URL defaults to `http://localhost:8000` and can be changed with `NEXT_PUBLIC_API_URL`.

## Backend gaps

The current backend does not provide endpoints for deleting a group, removing another member, or editing profile details. The related group-management controls are shown as unavailable; they do not report success or send unsupported requests. Leaving a group is supported.

Exchange conversions are estimates from the backend exchange-rate endpoint. Group totals, allocations, and settlements stay in the group's currency. Dashboard aggregate totals use the profile currency; if a rate is unavailable the summary says so rather than combining unconverted values.
