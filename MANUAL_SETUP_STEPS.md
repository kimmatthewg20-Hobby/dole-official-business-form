# Step-by-Step Manual Setup Instructions

## ✅ Code Conversion Complete!

All code has been automatically converted from SQLite to PostgreSQL/Supabase. Now you need to complete these manual steps.

---

## 📋 Part 1: Set Up Supabase Database

### Step 1.1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"Sign in"** if you already have an account
3. Click **"New Project"** button
4. Fill in the project details:
   - **Name**: `official-business-form` (or any name you prefer: `dole-official-business-form`) 
   - **Database Password**: 
     - Create a STRONG password (save this somewhere safe!)
     - Example: `MySecurePass123!@#` : My password `*1DOLEadmin*`
     - ⚠️ **IMPORTANT**: Write this down - you'll need it!
   - **Region**: Choose the closest region to you (e.g., "Southeast Asia (Singapore)")
   - **Pricing Plan**: Select **Free** tier
5. Click **"Create new project"**
6. Wait 2-3 minutes for the project to be created (you'll see a loading screen)

### Step 1.2: Get Your Database Connection String

1. Once your project is ready, you'll see the Supabase dashboard
2. Click on **"Settings"** (gear icon) in the left sidebar
3. Click **"Database"** in the settings menu
4. Scroll down to the **"Connection string"** section
5. Find the **"URI"** tab (it should be selected by default) : `vjysceloqtlaulznxzec`
6. You'll see a connection string that looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres

   `postgresql://postgres:*1DOLEadmin*@db.vjysceloqtlaulznxzec.supabase.co:5432/postgres`

   ```
7. **Replace `[YOUR-PASSWORD]`** with the password you created in Step 1.1
   - Example: `postgresql://postgres:MySecurePass123!@#@db.xxxxx.supabase.co:5432/postgres`
8. Click the **"Copy"** button next to the connection string
9. **Save this connection string somewhere safe** - you'll need it later!

### Step 1.3: Create Database Tables

1. In your Supabase dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New query"** button (top right)
3. Open the file `supabase_migration.sql` from your project folder
4. Copy ALL the SQL code from that file
5. Paste it into the SQL Editor in Supabase
6. Click **"Run"** button (or press `Ctrl+Enter` / `Cmd+Enter`)
7. You should see: **"Success. No rows returned"** - this means it worked!
8. Click **"Table Editor"** in the left sidebar to verify
9. You should see 4 tables:
   - ✅ `employees`
   - ✅ `employees_directory`
   - ✅ `official_business`
   - ✅ `settings`

**If you see all 4 tables, you're done with Supabase setup!** ✅

---

## 📦 Part 2: Install Dependencies

### Step 2.1: Open Terminal

1. On Mac: Press `Cmd + Space`, type "Terminal", press Enter
2. On Windows: Press `Win + R`, type "cmd", press Enter

### Step 2.2: Navigate to Your Project

```bash
cd "/Users/kimmatthew/Desktop/IT WORKS/Official Business Form - Filing - GitHub/Official Business Form - Filing - GitHub"
```

### Step 2.3: Install Node Packages

```bash
npm install
```

Wait for it to finish (this may take 1-2 minutes).

---

## 🔐 Part 3: Create Environment Variables File

### Step 3.1: Create .env File

1. In your project folder, create a new file named `.env` (with the dot at the beginning)
2. Open the `.env` file in a text editor
3. Add these lines (replace with YOUR actual values):

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
ADMIN_PASSWORD=*1CNPOadmin*
PORT=3000
```

**Important:**
- Replace `YOUR_PASSWORD` with the password you created in Supabase (Step 1.1)
- Replace `db.xxxxx.supabase.co` with your actual Supabase host (from Step 1.2)
- **⚠️ SPECIAL CHARACTERS**: If your password contains special characters like `*`, `@`, `#`, etc., you MUST URL-encode them:
  - `*` becomes `%2A`
  - `@` becomes `%40`
  - `#` becomes `%23`
  - `!` becomes `%21`
- Keep the `ADMIN_PASSWORD` as is, or change it to your preferred admin password

**Example with special characters:**
If your password is `*1DOLEadmin*`, encode it as `%2A1DOLEadmin%2A`:
```env
DATABASE_URL=postgresql://postgres:%2A1DOLEadmin%2A@db.vjysceloqtlaulznxzec.supabase.co:5432/postgres
ADMIN_PASSWORD=*1DOLEadmin*
PORT=3000
```

**Example without special characters:**
```env
DATABASE_URL=postgresql://postgres:MySecurePass123@db.abcdefghijk.supabase.co:5432/postgres
ADMIN_PASSWORD=*1CNPOadmin*
PORT=3000
```

4. Save the file

---

## 🧪 Part 4: Test Locally (Optional but Recommended)

### Step 4.1: Start the Server

In your terminal (still in the project folder), run:

```bash
npm start
```

You should see:
```
Connected to PostgreSQL database
Database tables initialized successfully
Server running on port 3000
```

### Step 4.2: Test the Application

1. Open your web browser
2. Go to: `http://localhost:3000`
3. Try submitting a test form
4. Check if data appears in Supabase:
   - Go to Supabase dashboard
   - Click "Table Editor"
   - Check the `official_business` table - you should see your test entry

### Step 4.3: Stop the Server

Press `Ctrl+C` in the terminal to stop the server.

---

## 📤 Part 5: Push Code to GitHub

### Step 5.1: Initialize Git (if not already done)

In your terminal, run:

```bash
git init
```

### Step 5.2: Add All Files

```bash
git add .
```

### Step 5.3: Create First Commit

```bash
git commit -m "Migrated from SQLite to Supabase PostgreSQL"
```

### Step 5.4: Create GitHub Repository

1. Go to [https://github.com](https://github.com) and sign in
2. Click the **"+"** icon in the top right corner
3. Click **"New repository"**
4. Fill in:
   - **Repository name**: `official-business-form` (or your preferred name)
   - **Description**: "Official Business Form Application with Supabase"
   - **Visibility**: Choose **Public** (free) or **Private**
   - **DO NOT** check "Initialize with README" (we already have files)
5. Click **"Create repository"**

### Step 5.5: Connect and Push to GitHub

GitHub will show you commands. Use these (replace `YOUR_USERNAME` with your GitHub username):

```bash
git remote add origin https://github.com/YOUR_USERNAME/official-business-form.git
git branch -M main
git push -u origin main
```

**Note:** You may be asked for your GitHub username and password. If you have 2FA enabled, use a Personal Access Token instead of password.

---

## 🚀 Part 6: Deploy to Vercel

### Step 6.1: Sign Up/Login to Vercel

1. Go to [https://vercel.com](https://vercel.com)
2. Click **"Sign Up"** or **"Log In"**
3. Choose **"Continue with GitHub"**
4. Authorize Vercel to access your GitHub account

### Step 6.2: Import Your Project

1. In Vercel dashboard, click **"Add New..."** → **"Project"**
2. You should see your GitHub repositories listed
3. Find `official-business-form` (or your repository name)
4. Click **"Import"** next to it

### Step 6.3: Configure Project Settings

1. **Project Name**: Keep default or change it
2. **Framework Preset**: Select **"Other"**
3. **Root Directory**: Leave as `./` (default)
4. **Build Command**: Leave empty (Vercel will auto-detect)
5. **Output Directory**: Leave empty
6. **Install Command**: Leave as `npm install` (default)

### Step 6.4: Add Environment Variables

**⚠️ CRITICAL STEP - DO NOT SKIP!**

Before clicking "Deploy", you MUST add environment variables:

1. Click **"Environment Variables"** section (expand it)
2. Add these variables one by one:

   **Variable 1:**
   - **Name**: `DATABASE_URL`
   - **Value**: Your Supabase connection string (from Step 1.2)
   - Click **"Add"**

   **Variable 2:**
   - **Name**: `ADMIN_PASSWORD`
   - **Value**: `*1CNPOadmin*` (or your preferred admin password)
   - Click **"Add"**

   **Variable 3:**
   - **Name**: `PORT`
   - **Value**: `3000`
   - Click **"Add"**

3. Make sure all 3 variables are listed before proceeding

### Step 6.5: Deploy

1. Click **"Deploy"** button
2. Wait 2-5 minutes for deployment
3. You'll see build logs - watch for any errors
4. When done, you'll see: **"Congratulations! Your project has been deployed."**
5. Click on the provided URL (e.g., `https://your-project.vercel.app`)

---

## ✅ Part 7: Verify Deployment

### Step 7.1: Test Your Live Website

1. Open the Vercel URL in your browser
2. Try submitting a test form
3. Check if it saves correctly

### Step 7.2: Verify Data in Supabase

1. Go to Supabase dashboard
2. Click **"Table Editor"**
3. Check the `official_business` table
4. You should see your test entry!

### Step 7.3: Test Admin Login

1. Go to: `https://your-project.vercel.app/admin`
2. Try logging in with password: `*1CNPOadmin*` (or your custom password)
3. Verify you can access the admin panel

---

## 🎉 Success Checklist

- [ ] Supabase project created
- [ ] Database tables created (4 tables visible)
- [ ] Connection string saved
- [ ] `.env` file created with correct values
- [ ] Dependencies installed (`npm install` successful)
- [ ] Code pushed to GitHub
- [ ] Vercel project created
- [ ] Environment variables added in Vercel
- [ ] Deployment successful
- [ ] Website accessible via Vercel URL
- [ ] Form submission works
- [ ] Data appears in Supabase
- [ ] Admin login works

---

## 🆘 Troubleshooting

### Problem: "Cannot connect to database"
**Solution:** 
- Check your `DATABASE_URL` in Vercel environment variables
- Make sure password is correct (no extra spaces)
- Verify Supabase project is active

### Problem: "Table does not exist"
**Solution:**
- Go to Supabase SQL Editor
- Run the `supabase_migration.sql` script again
- Check Table Editor to verify tables exist

### Problem: "Deployment failed"
**Solution:**
- Check Vercel build logs for errors
- Verify all environment variables are set
- Make sure `package.json` has correct dependencies

### Problem: "Forms don't save"
**Solution:**
- Check Vercel function logs
- Verify `DATABASE_URL` is correct
- Check Supabase Table Editor to see if data is there

---

## 📞 Need Help?

If you encounter issues:
1. Check error messages carefully
2. Verify all environment variables are correct
3. Check Supabase dashboard for database status
4. Review Vercel deployment logs

**You're all set!** Your application is now running on Supabase and Vercel! 🎊
