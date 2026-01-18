# Verify Your Supabase Connection String

## The Problem
The hostname `db.vjysceloqtlaulznxzec.supabase.co` cannot be resolved. This usually means the project reference ID is incorrect.

## How to Get the CORRECT Connection String

### Step 1: Go to Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Click on your project: **"dole-official-business-form"**

### Step 2: Get Connection String
1. Click **"Settings"** (gear icon) in the left sidebar
2. Click **"Database"** in the settings menu
3. Scroll down to **"Connection string"** section
4. You'll see multiple tabs: **"URI"**, **"JDBC"**, **"Golang"**, etc.
5. Click on the **"URI"** tab
6. You'll see a connection string that looks like:
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
   OR
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

### Step 3: Check Project Reference ID
The project reference ID should be visible in multiple places:
1. In the connection string itself
2. In the URL when you're in the dashboard (check the browser address bar)
3. In Settings → General → Reference ID

### Step 4: Common Issues

**Issue 1: Using Connection Pooler Instead of Direct Connection**
- Supabase shows two types of connections:
  - **Direct connection**: `db.[PROJECT-REF].supabase.co:5432`
  - **Connection pooler**: `aws-0-[REGION].pooler.supabase.com:6543`
- For our use case, we need the **direct connection** (port 5432)
- Make sure you're copying from the correct tab

**Issue 2: Wrong Project Reference ID**
- The reference ID in your connection string might be different
- Double-check it matches what's shown in your Supabase dashboard

**Issue 3: Project in Different Region**
- Some regions might use different hostname formats
- Check your project's region in Settings → General

## What to Do Next

1. **Copy the EXACT connection string** from Supabase dashboard
2. **Replace `[YOUR-PASSWORD]`** with your password (URL-encoded: `*` = `%2A`)
3. **Update your `.env` file** with the correct connection string
4. **Test again** with `node check-env.js`

## Quick Check

In your Supabase dashboard URL, you should see something like:
```
https://supabase.com/dashboard/project/[PROJECT-REF]
```

The `[PROJECT-REF]` part should match what's in your connection string.
