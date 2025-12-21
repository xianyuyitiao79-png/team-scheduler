# Team Scheduler (MVP)

A simple, stable, and mobile-friendly Shift Scheduling App for small teams (5-20 people).
Built with React, Vite, Tailwind CSS, and Supabase.

## Features

- **Authentication**: Email Magic Link login via Supabase.
- **Role-Based Access**: Admins manage members/templates/shifts; Members view schedules.
- **Scheduling**: Drag-and-drop style (click-to-add) weekly view.
- **Conflict Detection**: Visual alerts for overlapping shifts.
- **Publishing Workflow**: Drafts vs. Published shifts.
- **Export**: Download schedule as PNG.
- **PWA**: Installable on mobile devices.

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Deployment**: Vercel

## Setup & Deployment

### 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Copy the content of `supabase_schema.sql` (in this repo) and run it.
   - This creates tables: `profiles`, `shift_templates`, `shifts`, `settings`.
   - Sets up Row Level Security (RLS) policies.
   - Creates a Trigger to automatically create a `Profile` when a user signs up.
4. Go to **Project Settings > API** and copy:
   - Project URL
   - `anon` public key

### 2. Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env.local` file:
   ```env
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```
3. Run the dev server:
   ```bash
   npm run dev
   ```

### 3. Vercel Deployment

1. Push this code to GitHub.
2. Import the project in Vercel.
3. Add the Environment Variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in Vercel Project Settings.
4. Deploy!

## Usage Guide

### First Login (Admin)
The first user to sign up is NOT automatically an Admin (by default security rules).
**To make yourself an Admin:**
1. Sign up / Login via the App.
2. Go to Supabase Dashboard > Table Editor > `profiles`.
3. Find your user row and change `role` from `member` to `admin`.
4. Refresh the App. You will now see "Members" and "Templates" tabs.

### Scheduling Flow
1. **Create Templates**: Go to "Templates" and define standard shifts (e.g., "Morning 9-5").
2. **Schedule**: Go to "Schedule". Click a cell to add a shift using a template.
3. **Drafts**: Shifts are yellow (Draft) initially. Members cannot see them.
4. **Publish**: Click "Publish Week" to make them visible (Blue) to members.

### Exporting
- Click the "Export" button on the Schedule page to download a PNG image of the current view.
