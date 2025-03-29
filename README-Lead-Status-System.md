# Lead Status System

This document explains the lead status system used in our real estate AI texting application.

## Overview

The lead status system tracks each lead's progress through the sales funnel, from initial contact to conversion. The AI assistant uses these statuses to determine appropriate messaging and follow-up intervals.

## Status Definitions

The system uses the following statuses:

1. **New** - A fresh lead that has been added to the system but has not yet responded.
2. **In Conversation** - The lead has responded and is actively engaging with the AI assistant.
3. **Qualified** - The lead has shown genuine interest and has shared information about their budget, timeline, or location preferences.
4. **Appointment Set** - A calendar appointment has been scheduled with the lead.
5. **Converted** - The lead has successfully completed an appointment and moved to an active client relationship.
6. **Inactive** - The lead hasn't responded in 7+ days or has explicitly stated they're not interested.

## Status Transitions

Leads move between statuses based on the following triggers:

- **New → In Conversation**: Automatically triggered when a lead responds to your initial message.
- **In Conversation → Qualified**: Manually set by reviewing conversations or triggered when the AI detects qualifying keywords.
- **Qualified → Appointment Set**: Automatically set when an appointment is scheduled.
- **Appointment Set → Converted**: Manually set after a successful appointment or meeting.
- **Any Status → Inactive**: Automatically set after 7 days of no response, or manually set.
- **Inactive → In Conversation**: Automatically triggered when an inactive lead responds.

## Follow-up Automation

Each status has a specific follow-up interval:

- **New**: 2 days
- **In Conversation**: 3 days
- **Qualified**: 5 days
- **Appointment Set**: 1 day
- **Converted**: 14 days
- **Inactive**: 30 days

## Automatic Qualification Detection

The system automatically detects potential qualification signals based on keywords in lead messages related to:

1. **Budget** - Words like "budget", "afford", "price", "mortgage", etc.
2. **Timeline** - Words like "timeline", "when", "soon", "moving", etc.
3. **Location** - Words like "area", "neighborhood", "school district", etc.

When two or more of these qualification areas are detected in a message, the AI will ask targeted follow-up questions to gather more qualification information.

## Manual Status Management

Agents can manually change a lead's status at any time through:

1. The lead list view
2. The lead detail view
3. The message thread view

## API Endpoints

The system includes the following API endpoints for status management:

- `POST /api/leads/status/:id` - Update a lead's status
- `POST /api/leads/mark-qualified/:id` - Mark a lead as qualified
- `POST /api/leads/process-inactive` - Process and mark inactive leads

## Daily Maintenance

A daily cron job automatically identifies and marks leads as inactive if they haven't responded in 7+ days. 