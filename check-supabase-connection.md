# Check Your Supabase Connection String

## Before Creating a New Database - Let's Verify First!

Your project is active and healthy, so the issue is likely just the connection string format.

## Quick Check Steps

### 1. Verify Project Reference ID

In your Supabase dashboard:
1. Look at the browser address bar - it should show something like:
   ```
   https://supabase.com/dashboard/project/[PROJECT-REF]
   ```
2. The `[PROJECT-REF]` part is your project reference ID
3. Compare it to what's in your connection string: `vjysceloqtlaulznxzec`

**Do they match?**

### 2. Get the Correct Connection String

1. Go to: **Settings → Database**
2. Scroll to **"Connection string"** section
3. You'll see multiple connection options:
   - **URI** (what we need)
   - **JDBC**
   - **Golang**
   - etc.
4. Click on **"URI"** tab
5. You should see something like:
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
   OR
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

### 3. Important: Use Direct Connection (Port 5432)

Supabase shows two types:
- **Connection Pooler** (port 6543) - for serverless/server apps
- **Direct Connection** (port 5432) - for traditional apps

**For your Node.js app, you can use EITHER, but let's try the Direct Connection first:**

Look for the connection string that has:
- `db.[PROJECT-REF].supabase.co:5432` ← This one

NOT:
- `pooler.supabase.com:6543` ← This is for connection pooling

### 4. Alternative: Try Connection Pooler

If the direct connection doesn't work, we can try the pooler. The format would be:
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

## What to Do

1. **First**: Copy the EXACT connection string from Supabase (URI tab)
2. **Share it with me** (you can mask the password part)
3. **Don't create a new database yet** - we can fix this!

## Common Issues

- Project reference ID mismatch
- Using pooler format instead of direct (or vice versa)
- Password encoding issue (already fixed)
- Region-specific hostname format

Let's verify the connection string first before creating a new database!
