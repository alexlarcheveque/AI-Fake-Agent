# AI Fake Agent

A modern lead management solution with AI-powered insights.

## Project Structure

The project is split into three main parts:

```
/frontend
  /landing      # Marketing site (www.aifakeagent.com)
  /app          # Core application (app.aifakeagent.com)
  /shared       # Shared components, hooks, and utilities
```

### Landing Page (www.aifakeagent.com)

The landing page is a static marketing site that:

- Showcases the product features
- Provides clear calls-to-action
- Links to the main application
- Optimized for SEO

### Core Application (app.aifakeagent.com)

The main application that includes:

- User authentication
- Dashboard
- Lead management
- Message center
- Settings

### Shared Resources

Common code shared between the landing page and core application:

- UI components
- Utility functions
- Type definitions
- Hooks

## Setup Instructions

### Landing Page

```bash
cd frontend/landing
npm install
npm start
```

### Core Application

```bash
cd frontend/app
npm install
npm start
```

## Environment Variables

### Landing Page

- `REACT_APP_APP_URL`: URL of the core application (e.g., https://app.aifakeagent.com)

### Core Application

- `REACT_APP_API_URL`: Backend API URL
- `REACT_APP_LANDING_URL`: URL of the landing page (e.g., https://www.aifakeagent.com)

## Deployment

The landing page and core application are deployed separately:

1. Landing Page: Deploy to www.aifakeagent.com
2. Core Application: Deploy to app.aifakeagent.com

## DNS Configuration

Set up the following DNS records:

```
www      → landing app (e.g., Vercel/Netlify)
app      → core app
```

Use CNAME or A records depending on your hosting provider.
