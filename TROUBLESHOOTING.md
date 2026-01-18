# Troubleshooting ENOTFOUND Error

## The Error
```
Error: getaddrinfo ENOTFOUND db.vjysceloqtlaulznxzec.supabase.co
```

This means the hostname cannot be resolved. Here are the possible causes and solutions:

## Possible Causes & Solutions

### 1. Supabase Project Not Fully Provisioned ⏰

**Problem:** Supabase projects take 2-3 minutes to fully provision. The database might not be ready yet.

**Solution:**
1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Check if your project status shows "Active" (not "Setting up" or "Paused")
3. Wait a few more minutes if it's still provisioning
4. Try again after the project is fully active

### 2. Wrong Connection String Format 🔗

**Problem:** The connection string might be incorrect or the project reference ID is wrong.

**Solution:**
1. Go to Supabase Dashboard → Settings → Database
2. Scroll to "Connection string" section
3. Make sure you're copying from the **"URI"** tab (not "Session mode" or "Transaction mode")
4. The format should be:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
5. Verify your project reference ID matches: `vjysceloqtlaulznxzec`

### 3. Password URL Encoding Issue 🔐

**Problem:** Special characters in password (`*`) need to be URL-encoded.

**Solution:**
Your password `*1DOLEadmin*` must be encoded as `%2A1DOLEadmin%2A` in the connection string.

**Correct format:**
```
DATABASE_URL=postgresql://postgres:%2A1DOLEadmin%2A@db.vjysceloqtlaulznxzec.supabase.co:5432/postgres
```

**NOT:**
```
DATABASE_URL=postgresql://postgres:*1DOLEadmin*@db.vjysceloqtlaulznxzec.supabase.co:5432/postgres
```

### 4. .env File Format Issues 📝

**Problem:** The `.env` file might have formatting issues preventing it from loading.

**Solution:**
1. Open `env-template.txt` in your project
2. Copy ALL 3 lines exactly
3. Open your `.env` file
4. Delete everything
5. Paste the 3 lines
6. Make sure:
   - NO quotes around values
   - NO spaces around `=`
   - NO trailing spaces
   - Each line ends properly

### 5. Network/DNS Issues 🌐

**Problem:** Your network might be blocking the connection or DNS isn't resolving.

**Solution:**
1. Try pinging the hostname:
   ```bash
   ping db.vjysceloqtlaulznxzec.supabase.co
   ```
2. If ping fails, check your internet connection
3. Try using a different network (mobile hotspot, etc.)
4. Check if your firewall is blocking the connection

### 6. Verify Supabase Project Status ✅

**Steps to verify:**
1. Go to https://supabase.com/dashboard
2. Click on your project
3. Check the project status (should be "Active")
4. Go to Settings → Database
5. Verify the connection string matches what you have in `.env`
6. Check if there are any warnings or errors in the dashboard

## Quick Test Steps

1. **Verify .env is loading:**
   ```bash
   node check-env.js
   ```
   Should show: `✅ DATABASE_URL is set`

2. **Test connection manually:**
   ```bash
   node -e "require('dotenv').config(); const {Pool} = require('pg'); const pool = new Pool({connectionString: process.env.DATABASE_URL, ssl: {rejectUnauthorized: false}}); pool.query('SELECT NOW()').then(r => {console.log('✅ Connected!', r.rows[0]); pool.end();}).catch(e => {console.error('❌ Error:', e.message); pool.end();});"
   ```

3. **Check Supabase dashboard:**
   - Project should be "Active"
   - No error messages
   - Connection string should be available

## Most Common Fix

**90% of the time, the issue is:**
1. Password not URL-encoded in DATABASE_URL
2. Supabase project still provisioning (wait 2-3 minutes)
3. Wrong project reference ID in connection string

**Try this first:**
1. Double-check your connection string in Supabase dashboard
2. Make sure password is URL-encoded: `*` → `%2A`
3. Wait a few minutes if project was just created
4. Restart your server: `npm start`
