# Vanti Prediction Hub

Build the foundation of a virtual-money prediction market app called Vanti.

CRITICAL CONSTRAINT: This app uses VIRTUAL MONEY ONLY. There is no real money,

no deposits, no withdrawals, no payment processing. Every user starts with a

$10,000.00 virtual balance. Never integrate Stripe or any payment provider.

Build ONLY what is listed below. Do not build markets, trading, portfolio, or

social features yet — those come in later prompts. Do not create placeholder

pages for them beyond empty routed stubs.

=== BRAND ===

Name: Vanti

Feel: intelligent, fast, premium, data-driven. A modern fintech product —

NOT a casino, NOT a sportsbook, NOT a generic SaaS dashboard.

Colors:

- Light mode default, dark mode supported via a class-based toggle

- Backgrounds: white / near-white neutrals

- Text: near-black

- Borders: subtle warm gray

- Green ONLY for positive movement and YES

- Red ONLY for negative movement and NO

- One restrained accent color for interactive elements

- No gradients, no neon, no bright multi-color palettes

Typography:

- Inter (or system sans stack)

- Tabular numerals for all prices, balances, and percentages

- Large: balances, prices, probabilities

- Medium: titles, usernames, section headers

- Small: volume, timestamps, metadata

- Generous whitespace

Create these as Tailwind theme tokens and CSS variables. Every later component

must use these tokens, never hardcoded hex values.

=== DATABASE SCHEMA (Supabase) ===

Create these tables with proper foreign keys and indexes.

profiles

  id uuid PK references auth.users on delete cascade

  username text unique not null

  display_name text

  bio text

  avatar_url text

  balance numeric(14,2) not null default 10000.00

  is_admin boolean not null default false

  created_at timestamptz default now()

categories

  id uuid PK

  name text not null

  slug text unique not null

  icon text

markets

  id uuid PK

  question text not null

  description text

  category_id uuid references categories

  yes_price numeric(5,4) not null default 0.5000

  volume numeric(14,2) not null default 0

  trader_count integer not null default 0

  resolution_date timestamptz not null

  resolution_source text

  resolution_criteria text

  status text not null default 'active'   -- active | closed | resolved

  outcome text                            -- yes | no | null

  created_by uuid references profiles

  created_at timestamptz default now()

market_price_history

  id uuid PK

  market_id uuid references markets on delete cascade

  yes_price numeric(5,4) not null

  recorded_at timestamptz default now()

positions

  id uuid PK

  user_id uuid references profiles on delete cascade

  market_id uuid references markets on delete cascade

  side text not null                      -- yes | no

  contracts numeric(14,4) not null default 0

  avg_price numeric(5,4) not null

  unique (user_id, market_id, side)

trades

  id uuid PK

  user_id uuid references profiles on delete cascade

  market_id uuid references markets on delete cascade

  side text not null                      -- yes | no

  action text not null                    -- buy | sell

  contracts numeric(14,4) not null

  price numeric(5,4) not null

  total numeric(14,2) not null

  created_at timestamptz default now()

transactions

  id uuid PK

  user_id uuid references profiles on delete cascade

  type text not null      -- signup_grant | trade_buy | trade_sell | settlement

  amount numeric(14,2) not null    -- negative = debit

  balance_after numeric(14,2) not null

  trade_id uuid references trades

  created_at timestamptz default now()

follows

  follower_id uuid references profiles on delete cascade

  following_id uuid references profiles on delete cascade

  created_at timestamptz default now()

  primary key (follower_id, following_id)

watchlist

  user_id uuid references profiles on delete cascade

  market_id uuid references markets on delete cascade

  primary key (user_id, market_id)

Indexes on: markets(status, resolution_date), markets(category_id),

trades(user_id, created_at desc), trades(market_id, created_at desc),

positions(user_id), market_price_history(market_id, recorded_at),

profiles(username).

=== SECURITY — THIS IS NOT OPTIONAL ===

Enable Row Level Security on every table.

Users may SELECT their own rows and public data. Users may INSERT and UPDATE

ONLY their profile's display_name, bio, and avatar_url.

Users must have NO direct UPDATE permission on:

  profiles.balance

  profiles.is_admin

  positions (any column)

  trades (any column)

  transactions (any column)

  markets (any column)

These are modified exclusively by SECURITY DEFINER Postgres functions written

in later prompts. A user must never be able to alter their own balance from the

client. Write the RLS policies so this is enforced at the database level, not

in React.

Create a trigger on auth.users that inserts a profiles row with

balance = 10000.00 and logs a 'signup_grant' transaction.

=== AUTH ===

Email/password signup and login via Supabase Auth.

Signup collects a username (validate: unique, 3-20 chars, alphanumeric +

underscore). Protected routes redirect unauthenticated users to login.

=== NAVIGATION SHELL ===

Responsive app shell only — the pages inside are empty stubs for now.

Desktop: left sidebar (Vanti wordmark, Home, Discover, Markets, Portfolio,

Following), center content column, right rail (search, notifications icon,

avatar, virtual balance display).

Mobile: bottom tab bar (Home, Discover, Trade, Portfolio, Profile).

Show the user's virtual balance in the chrome, formatted as $10,000.00, pulled

live from profiles.

=== DELIVERABLE ===

Working signup and login, a profiles row created automatically with $10,000,

the full schema with RLS in place, and a responsive navigation shell with empty

routed pages. Nothing else.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://vanti-virtual-futures.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1993a560-2023-4804-94f9-890c5e845f36).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
