# RealNurture - AI-Powered Real Estate Agent Platform

RealNurture is an intelligent messaging and lead management platform designed specifically for real estate agents. It leverages AI (GPT-4) to automatically respond to leads, schedule appointments, track client preferences, and streamline the entire lead nurturing process.

## 🚀 Key Features

- **AI-Powered Messaging**: Automated responses to leads using GPT-4, trained on real estate knowledge
- **Lead Management**: Import, organize, and track real estate leads with detailed profiles
- **Smart Appointment Scheduling**: AI automatically detects appointment requests and creates calendar events
- **Search Criteria Tracking**: Automatically extracts and stores client property preferences from conversations
- **SMS Integration**: Two-way SMS communication via Twilio
- **Real-time Notifications**: Get notified of important lead activities and appointments
- **User Settings**: Customizable agent profiles and preferences for personalized AI responses

## Features I Want to Implement

- **AI-Powered Phone Calls**: Automated phone calls with voice agents providing value to the lead
- **Stripe Payment Portal**: Implement stripe payment for membership upgrading capability
- **Lead Marketplace**: An agent can buy their own leads from us that we get through Meta Ads

## 🏗️ Project Structure

This is a monorepo containing:

- **`/backend`** - Node.js/Express API server with TypeScript
- **`/frontend/app`** - React/TypeScript main application
- **`/frontend/landing`** - Marketing landing page
- **`/shared`** - Shared types and utilities

## 🛠️ Tech Stack

**Backend:**

- Node.js + Express + TypeScript
- Supabase (PostgreSQL database)
- OpenAI GPT-4 for AI responses
- Twilio for SMS messaging
- Socket.io for real-time features

**Frontend:**

- React 18 + TypeScript
- Vite for build tooling
- TailwindCSS for styling
- React Router for navigation

**Deployment:**

- Backend: Fly.io
- Frontend: Vercel
- Database: Supabase Cloud

## 🚀 Quick Start

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Set up environment variables:**

   - Copy `.env.example` to `.env` in both `/backend` and `/frontend/app`
   - Configure Supabase, OpenAI, and Twilio credentials

3. **Start development servers:**

   ```bash
   # Backend (port 3000)
   cd backend && npm run dev

   # Frontend (port 5173)
   cd frontend/app && npm run dev
   ```

## 📱 Core Workflows

1. **Lead Import**: Agents import leads via CSV or manual entry
2. **AI Conversations**: When leads text, AI responds based on agent's profile and lead context
3. **Appointment Detection**: AI recognizes appointment requests and auto-schedules them
4. **Search Criteria**: AI extracts property preferences (price, bedrooms, location) from conversations
5. **Notifications**: Agents get notified of important activities requiring attention

## 🔧 Development

See individual folder READMEs for detailed setup and development instructions:

- [Backend Documentation](./backend/README.md)
- [Frontend App Documentation](./frontend/app/README.md)
- [Landing Page Documentation](./frontend/landing/README.md)
