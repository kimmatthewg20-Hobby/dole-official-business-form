# Fix Your .env File

## The Problem
Your `.env` file exists but isn't being loaded. This is usually due to formatting issues.

## The Solution

### Option 1: Copy the Correct Format (Recommended)

1. Open the file `.env.correct` in your project folder
2. Copy ALL its contents
3. Open your `.env` file
4. Delete everything in `.env`
5. Paste the contents from `.env.correct`
6. Save the file
7. Make sure there are NO extra spaces, quotes, or special characters
8. Make sure each line ends properly (no trailing spaces)

### Option 2: Manual Fix

Your `.env` file should look EXACTLY like this (no quotes, no extra spaces):

```
DATABASE_URL=postgresql://postgres:%2A1DOLEadmin%2A@db.vjysceloqtlaulznxzec.supabase.co:5432/postgres
ADMIN_PASSWORD=*1DOLEadmin*
PORT=3000
```

**Important Rules:**
- ✅ NO quotes around values
- ✅ NO spaces around the `=` sign
- ✅ NO trailing spaces at end of lines
- ✅ Each variable on its own line
- ✅ Password in DATABASE_URL must be URL-encoded: `*` = `%2A`

### Common Mistakes to Avoid:

❌ **WRONG:**
```
DATABASE_URL="postgresql://postgres:password@host:5432/postgres"
DATABASE_URL = postgresql://postgres:password@host:5432/postgres
DATABASE_URL=postgresql://postgres:*1DOLEadmin*@db.vjysceloqtlaulznxzec.supabase.co:5432/postgres
```

✅ **CORRECT:**
```
DATABASE_URL=postgresql://postgres:%2A1DOLEadmin%2A@db.vjysceloqtlaulznxzec.supabase.co:5432/postgres
```

### After Fixing:

1. Save the `.env` file
2. Run: `node check-env.js` to verify it's working
3. You should see: `✅ DATABASE_URL is set`
4. Then run: `npm start`

### Still Not Working?

If it still doesn't work after fixing the format:
1. Delete the `.env` file
2. Create a new one with the exact content from `.env.correct`
3. Make sure you're saving it in the project root folder (same folder as `server.js`)
