# Fix: IPv4 Compatibility Issue

## The Problem

Your Supabase connection shows: **"Not IPv4 compatible"**

This means:
- The Direct connection (port 5432) only works with IPv6 networks
- Your local network and Vercel use IPv4
- That's why you're getting `ENOTFOUND` errors

## The Solution: Use Session Pooler

You need to use the **Session Pooler** connection instead of Direct connection.

## How to Get Session Pooler Connection String

1. In Supabase Dashboard → Settings → Database
2. Scroll to "Connection string" section
3. Click "Connection String" tab (you're already there)
4. Change the dropdowns:
   - **Type**: Keep as "URI"
   - **Source**: Keep as "Primary Database"  
   - **Method**: Change from "Direct connection" to **"Session pooler"** or **"Transaction pooler"**
5. Copy the new connection string

It should look like:
```
postgresql://postgres.vjysceloqtlaulznxzec:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

## Update Your .env File

1. Open your `.env` file
2. Replace the `DATABASE_URL` line with the Session Pooler connection string
3. Make sure to URL-encode the password: `*` = `%2A`

**Example:**
```env
DATABASE_URL=postgresql://postgres.vjysceloqtlaulznxzec:%2A1DOLEadmin%2A@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
ADMIN_PASSWORD=*1DOLEadmin*
PORT=3000
```

## Important Notes

- **Session Pooler** (port 6543) - Works with IPv4 ✅
- **Transaction Pooler** (port 6543) - Also works with IPv4 ✅
- **Direct Connection** (port 5432) - IPv6 only ❌

For Vercel deployment, you MUST use the pooler connection.

## After Updating

1. Save your `.env` file
2. Test: `node check-env.js`
3. Test connection: `npm start`
4. You should see: "Connected to PostgreSQL database" ✅
