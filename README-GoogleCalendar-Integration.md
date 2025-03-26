# Google Calendar Integration for RealLeads

This document explains how the Google Calendar integration works and how to configure it for your RealLeads application.

## Overview

The Google Calendar integration allows you to:

1. Automatically create calendar events for appointments detected in AI-generated messages
2. Send calendar invitations to leads with email addresses
3. View and manage appointments in your Google Calendar
4. Track event status and links in your dashboard

## Configuration

### 1. Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the Google Calendar API for your project

### 2. Create a Service Account

1. In your Google Cloud project, go to "IAM & Admin" > "Service Accounts"
2. Create a new service account
3. Give it a name and description related to your application
4. Grant the service account the "Calendar API" > "Calendar Editor" role
5. Create and download a JSON key for the service account

### 3. Set Up a Google Calendar

1. Go to [Google Calendar](https://calendar.google.com/)
2. Create a new calendar specifically for your appointments
3. In the calendar settings, share the calendar with the service account email address you created
4. Give the service account "Make changes to events" permissions
5. Copy the Calendar ID (it looks like an email address)

### 4. Configure Your Application

1. Open the service account JSON key file you downloaded
2. Add the following to your `.env` file:
   ```
   GOOGLE_CLIENT_EMAIL=your_service_account_email@project.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
   GOOGLE_CALENDAR_ID=your_calendar_id@group.calendar.google.com
   ```

   Note: For the private key, copy the entire key from the JSON file, including all newlines. Make sure to put it in quotes and replace actual newlines with `\n`.

3. Restart your application:
   ```
   npm run dev
   ```

## Using the Appointment Features

### AI-Detected Appointments

When your AI assistant detects an appointment request in a conversation (format: "NEW APPOINTMENT SET: MM/DD/YYYY at HH:MM AM/PM"), the system will:

1. Create an appointment record in your database
2. Create a Google Calendar event for the appointment
3. If the lead has an email address, they will receive a calendar invitation

### Manual Appointment Creation

You can also create appointments manually:

1. Click "Show Appointments" in any lead conversation
2. Click "Schedule Appointment"
3. Fill in the appointment details
4. Submit the form

### Appointment Management

All appointments can be viewed and managed:

1. In the lead conversation view
2. On the dashboard (upcoming appointments)
3. Directly in your Google Calendar

## How It Works

The system uses both your local database and Google Calendar's API:

1. Appointments are stored in your database for record-keeping
2. Google Calendar's API is used to create and manage events
3. Leads with email addresses receive calendar invitations
4. Event links allow you to quickly access the event in Google Calendar

## Troubleshooting

If you encounter issues:

1. Check that your Google Cloud project has the Calendar API enabled
2. Ensure your service account has the correct permissions on your calendar
3. Verify that your GOOGLE_PRIVATE_KEY is correctly formatted with `\n` for newlines
4. Check server logs for detailed error messages

For more assistance, contact support. 