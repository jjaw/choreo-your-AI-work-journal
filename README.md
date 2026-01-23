# Choreo

> Your 3-Minute AI Work Journal: Voice → Summary + Tasks + Insights

**Hackathon Track:** Productivity & Work Habits  
**Awards Targeting:** Best in Category ($5,000) + Best Use of Opik ($5,000)  
**Live Demo:** Coming soon  
**Demo Video:** Coming soon

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

---

## The Problem

Knowledge workers end their days feeling busy but unclear about what they actually accomplished. They struggle to identify productivity patterns, don't know when they do their best work, and repeat inefficient habits because they lack data about their own work patterns.

**Traditional solutions are broken:**
- Manual time tracking is tedious (logging every task)
- Manual journaling rarely sticks (too much writing effort)
- Passive tracking (RescueTime) misses qualitative insights

---

## The Solution

**Choreo** is a voice-first AI work journal that requires only **3 minutes per day**:

1. **Record** a quick voice reflection at end-of-day
2. **AI generates** a structured summary (Wins / Energy Drains / Future Focus)
3. **AI extracts** completed tasks automatically
4. **Insights** reveal your productivity patterns over time
5. **Privacy-first:** Audio deleted immediately after transcription

**Why it works:**
- Minimal friction (just talk for 3 minutes)
- Hybrid approach: Voice captures emotional nuance, text output is scannable
- Actionable insights without tedious tracking
- Privacy-protected (no audio storage)

---

## Architecture
```
User records voice (3 min)
     ↓
Upload to Supabase Storage
     ↓
Gemini API processes:
  1. Transcription (5s)
  2. Summary generation (3s)
  3. Task extraction (3s)
     ↓
User validates summary + tasks
     ↓
Audio deleted, data saved
     ↓
Dashboard + Insights
```

---

## Tech Stack

**Frontend:**
- [Next.js 14](https://nextjs.org/) (TypeScript, App Router)
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- Web Audio API (browser-native recording)

**Backend:**
- Next.js API Routes (serverless)
- [Google Gemini 2.5 Flash-Lite](https://ai.google.dev/) (transcription, summary, tasks)
- [Opik TypeScript SDK](https://www.comet.com/site/products/opik/) (LLM observability)

**Infrastructure:**
- [Supabase](https://supabase.com/) (PostgreSQL, Auth, Storage)
- [Vercel](https://vercel.com/) (deployment)

**Why This Stack:**
- Single codebase (TypeScript end-to-end)
- Serverless
- Free tier covers hackathon needs
- Fast development (no coordination between frontend/backend)

---

## Key Features

### Core Features (MVP)
- [ ] Voice Recording (3-min limit, countdown timer, waveform visualization)
- [ ] AI Transcription (Gemini API, <5 seconds)
- [ ] AI Summary Generation (Wins / Energy Drains / Future Focus)
- [ ] AI Task Extraction (with categories & confidence scores)
- [ ] Human Validation (edit summary items, accept/reject tasks)
- [ ] Audio Deletion (privacy-first: deleted immediately after processing)
- [ ] Daily Dashboard (today's reflection + stats)
- [ ] Opik Integration (all LLM calls traced, human feedback logged)
- [ ] Demo Account (5 pre-seeded days showing patterns)

### Nice-to-Have Features
- [ ] Weekly insights page (patterns over 5-7 days)
- [ ] History view (list of past reflections)
- [ ] Mobile optimization

---

## Opik Integration

**Why Opik:**  
Without observability, we'd be deploying AI blind. Opik gives us data-driven confidence that our AI is improving. Thank you for being a major sponsor!

**What We'll Track:**
- All LLM calls (transcription, summary, task extraction)
- Human feedback (edits, acceptances, rejections)
- Performance metrics (latency, tokens, cost)
- A/B test results (prompt optimization)

---

## Privacy-First Approach

**What We Store:**
- Text transcriptions
- Summaries (Wins/Drains/Future Focus)
- Extracted tasks
- User email (for authentication)

**What We DON'T Store:**
- Audio recordings (deleted immediately after transcription)
- Voice biometrics (no voice analysis or fingerprinting)
- Third-party tracking (no analytics cookies)

**Why Privacy Matters:**
- Voice is biometric data
- Work reflections contain confidential info (client names, project details, frustrations)
- Users won't adopt if they don't trust the system

**Our Solution:**
- Audio deleted by default (no user choice = simplest privacy)
- Clear confirmation: "Audio deleted. Transcription saved."
- Row-Level Security (RLS) ensures users only access their own data

---

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- Supabase account (free tier)
- Google Gemini API key (free tier)
- Opik API key (free tier)

### Installation

1. **Clone the repository:**
```bash
   git clone https://github.com/yourusername/choreo.git
   cd choreo
```

2. **Install dependencies:**
```bash
   npm install
```

3. **Set up environment variables:**
```bash
   cp .env.example .env.local
```
   
   Edit `.env.local` with your credentials (see .env.example for details)

4. **Set up Supabase:**
   - Create a new project at [supabase.com](https://supabase.com)
   - Run the database schema (coming soon)
   - Enable email authentication
   - Create a storage bucket named `audio-recordings` (private)

5. **Run development server:**
```bash
   npm run dev
```
   
   Open [http://localhost:3000](http://localhost:3000)

---

## Hackathon Progress

### Current Status
- [x] Project setup
- [x] Repository created
- [ ] Voice recording component
- [ ] AI integration
- [ ] Validation UI
- [ ] Dashboard
- [ ] Opik integration
- [ ] Demo account
- [ ] Demo video

---

**Built for the Encode Club Commit To Change: An AI Agents Hackathon - January 2026**
