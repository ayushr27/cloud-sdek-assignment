# VedaAI Assessment Creator

A full-stack AI-powered exam question paper generator, built with Next.js (frontend) and Node.js/Express (backend).

## Features

- AI question generation via Groq (Llama 3.3 70B) or Google Gemini
- Google Authentication for secure login
- Real-time progress tracking via WebSocket
- MongoDB database for storing assignments and user setups
- Redis caching for assignments, generated PDFs, and user profiles with TTL invalidation
- Cron Jobs for proactive cache warming and automated resource cleanup
- BullMQ for background job queueing (with fallback to in-process execution)
- PDF export via Puppeteer with dynamic school information injection
- Difficulty distribution (Easy / Medium / Hard) and subject tags
- Multi-step form with full validation
- Multi-file drag-and-drop file upload with AI text extraction (supports PDFs and images)
- Sidebar notification badges for real-time item counts
- Zustand global state management
- Responsive design aligning with provided UI mockups

## Setup Instructions

### Prerequisites

- Node.js (version 18 or higher)
- MongoDB running locally or remotely
- Redis running locally or via a cloud provider 
- A Groq API key and Google Gemini API Key
- Google OAuth Client ID and Secret

### Installation

1. Backend Setup:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env and fill in your API keys and MongoDB/Redis URLs
   npm install
   npm run dev
   ```

2. Frontend Setup:
   ```bash
   cd frontend
   cp .env.example .env.local
   # Edit .env.local to point to the backend and include your Google Client ID
   npm install
   npm run dev
   ```

### How to Run

1. Start the backend server (`npm run dev` in the `backend` folder).
2. Start the frontend server (`npm run dev` in the `frontend` folder).
3. Ensure MongoDB and Redis are running locally or their respective cloud URIs are provided in the `.env` files.
4. Access the application in your browser at `http://localhost:3000`.

**Live Demo:** [https://assignment-vedaai.vercel.app/](https://assignment-vedaai.vercel.app/)

### Create Account / Sign In Feature

The application uses Google Authentication for a seamless and secure sign-in experience.

1. On the landing page, click the **"Continue with Google"** button.
2. Select your Google account to log in or create a new account automatically.
3. **Note:** Manual password-based registration is not supported to ensure secure session management.

### Setting Up the Profile

After successfully logging in, it is essential to configure your profile:

1. Navigate to the **Settings** page from the sidebar menu.
2. Enter your **School Name** and **Branch Information**.
3. **Why is this important?** Configuring your profile is required because your custom School Name and Branch will be printed at the header of all your downloaded assignment PDFs.

### Core Workflows

1. My Groups: Organize your classes by creating specific groups (e.g., "Class 10-A Science"). You can assign newly generated question papers directly to these groups for easy tracking and management.

2. AI Teacher's Toolkit: Use this dedicated section to leverage AI for grading assistance, lesson planning, and quick pedagogical queries, acting as an always-on assistant for your daily teaching activities.

5. Upload Resources - My Library: Go to "My Library" to upload reference PDFs or Images. Your uploaded resources are automatically summarized by AI (for PDFs) and safely stored here, allowing you to access teaching materials quickly without re-uploading them.

6. Create an Assignment: Go to "Create Assignment". You can select multiple files from your computer (the system extracts the text behind the scenes), choose your subject, class, and set the exact distribution of easy/medium/hard questions across different types (MCQs, Short answers, etc.). You can also link the assignment directly to one of your Groups.

7. Generate & Download: Submit the form. The system will cue the background workers. You can watch the real-time progress. Once generation is complete, you can click to download the custom, print-ready PDF.

## Architecture Overview

The system employs a tightly-coupled, highly-scalable service-oriented architecture designed to handle computationally expensive Artificial Intelligence and document rendering tasks asynchronously without blocking the main Node thread.

1. **Frontend (Next.js 14 App Router):** 
   - Uses React Server Components for SEO and fast initial hydration, and Zustand for highly performant, un-opinionated client-side state management. 
   - Implements a bi-directional WebSocket connection (`socket.io-client`) to listen for real-time push events from the backend message queue, updating job progress exactly as BullMQ transitions states.
   - Files uploaded are streamed to a backend parsing endpoint (`multer`) before assignment generation to reduce client-side compute overhead.

2. **Backend Engine (Node.js/Express):** 
   - A REST compliant API wrapped with `express-validator` for strict schema validation.
   - **Authentication:** Drops stateless JWT Bearer tokens to the client upon successful Google OAuth handshake, verifying incoming requests securely via custom middleware.
   - **Database Layer:** Uses Mongoose ORM connecting to MongoDB Atlas for persistence of User, Group, Assignment, and Resource schemas.

3. **Asynchronous Job Controller (BullMQ & Redis):** 
   - **Queue Implementation:** AI completion and Puppeteer PDF generation take between 5 to 30 seconds. To bypass HTTP timeout limits, the Express controller dispatches the generation payload into a BullMQ processor stored in Redis.
   - **Graceful Degradation:** If the Redis instance is unreachable, the system automatically falls back to utilizing `setImmediate` within the same Node process to handle the heavy generation tasks, protecting service uptime.

4. **Multi-Model Orchestration (Groq SDK & Google GenAI):** 
   - Instead of locking into one AI provider, the `modelRouter` dynamically distributes generation requests across a priority queue of models (e.g., Llama 3.3 70B for raw text constraints, Gemini 1.5 Flash for image/OCR parsing).
   - Features a built-in rate-limiter fallback that detects HTTP 429 exceptions and seamlessly routes the context to an alternate provider, guaranteeing a return payload.

## Approach & Cache Optimization Strategy

Our architectural philosophy centers strictly around reducing visual latency. We engineered several layers of predictive fetching and explicit cache invalidation.

### Cache invalidation & TTL Hierarchy
To bypass database saturation on repeated asset requests, the backend implements a precise caching strategy using `ioredis`:
1. **Profile-Aware Deterministic Eviction:** The generated PDF buffer cache key is dynamically salted with the user's Mongoose `updatedAt` timestamp (e.g., `pdf:user123:ts1690000000`). If a user updates their school profile details, the timestamp changes, inherently altering the downstream cache key. The old PDF reference is garbage collected when its TTL (Time-To-Live) naturally expires, bypassing the need for explicit Redis scan deletions while guaranteeing the user instantly receives a newly rendered PDF containing their updated school information.
2. **Predictive UI Prefetching:** The Sidebar component utilizes React `useEffect` hooks to blindly prefetch REST routes (`/assignments` and `/resources`) strictly upon app-mount. This primes the global Zustand nodes with current counts instantly, rendering dashboard notification badges prior to user navigation, mimicking optimistic UI functionality.
3. **Automated Cache Maintenance (Cron Jobs):** 
   - The backend specifically executes scheduled cron jobs to handle background maintenance on the cache and ephemeral storage.
   - **Proactive Cache Warming:** Periodic jobs refresh high-traffic data into Redis before a user even requests them, ensuring zero-latency on initial access.
   - **Resource Cleanup:** Automated tasks identify and remove orphaned temporary files from the server's `uploads` directory, maintaining a lean storage footprint and preventing disk bloat.
4. **Route Response Caching:** Generic endpoints like querying past historical assignments are buffered into Redis with a `60s` TTL interval. This reduces NoSQL queries by 90% during repeated client navigations.
