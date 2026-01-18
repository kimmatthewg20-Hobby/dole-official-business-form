# Complete Migration Plan: SQLite to Supabase + Vercel Deployment

This guide will walk you through migrating your Official Business Form application from SQLite to Supabase (PostgreSQL) and deploying it to Vercel. All steps use free tiers.

---

## 📋 Overview

**What we're doing:**
1. Set up Supabase database (free tier)
2. Create database tables in Supabase
3. Update code to use Supabase instead of SQLite
4. Push code to GitHub
5. Deploy to Vercel (free tier)
6. Configure environment variables
7. Test the deployment

**Time estimate:** 2-3 hours (first time)

---

## 🗂️ Part 1: Setting Up Supabase Database

### Step 1.1: Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"Sign in"** if you already have an account
3. Click **"New Project"**
4. Fill in the details:
   - **Name**: `official-business-form` (or any name you prefer)
   - **Database Password**: Create a strong password (save this somewhere safe!)
   - **Region**: Choose the closest region to you
   - **Pricing Plan**: Select **Free** tier
5. Click **"Create new project"**
6. Wait 2-3 minutes for the project to be created

### Step 1.2: Get Your Database Connection Details

1. Once your project is ready, go to **Settings** (gear icon in left sidebar)
2. Click **"Database"** in the settings menu
3. Scroll down to **"Connection string"** section
4. Find **"URI"** - this is your connection string
5. Click the **"Copy"** button next to it
6. **Save this somewhere safe** - you'll need it later
   - It looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`
7. Also note down:
   - **Host**: `db.xxxxx.supabase.co` (from the connection string)
   - **Database name**: `postgres`
   - **Port**: `5432`
   - **User**: `postgres`
   - **Password**: The one you created

### Step 1.3: Create Database Tables in Supabase

1. In your Supabase dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Copy and paste the following SQL code (this creates all your tables):

```sql
-- Create official_business table
CREATE TABLE IF NOT EXISTS official_business (
  id SERIAL PRIMARY KEY,
  date_created TEXT,
  office TEXT,
  division TEXT,
  date_of_ob TEXT,
  dates_of_ob TEXT,
  location_from TEXT,
  location_to TEXT,
  departure_time TEXT,
  return_time TEXT,
  purpose TEXT,
  approved_by TEXT,
  approved_by_position TEXT,
  timestamp TEXT
);

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  ob_id INTEGER REFERENCES official_business(id) ON DELETE CASCADE,
  name TEXT,
  position TEXT
);

-- Create employees_directory table
CREATE TABLE IF NOT EXISTS employees_directory (
  id SERIAL PRIMARY KEY,
  employee_id TEXT,
  firstname TEXT,
  middle_name TEXT,
  last_name TEXT,
  full_name TEXT,
  position TEXT,
  assigned_unit TEXT
);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  office TEXT,
  office_head TEXT,
  office_head_position TEXT,
  location_from TEXT,
  division_options TEXT,
  assistant_regional_director TEXT DEFAULT 'ATTY. NEPOMUCENO A. LEAÑO II, CPA',
  admin_password TEXT
);
```

4. Click **"Run"** button (or press Ctrl+Enter / Cmd+Enter)
5. You should see a success message: "Success. No rows returned"

### Step 1.4: Verify Tables Were Created

1. Click **"Table Editor"** in the left sidebar
2. You should see 4 tables:
   - `employees`
   - `employees_directory`
   - `official_business`
   - `settings`
3. If you see all 4 tables, you're good to go! ✅

---

## 💻 Part 2: Update Your Code

### Step 2.1: Install Supabase Client Library

You'll need to add the PostgreSQL client library to your project. We'll use `pg` (node-postgres) which is the standard PostgreSQL client for Node.js.

**Note:** We'll do this in the next steps when we update the code.

### Step 2.2: Update package.json

The `package.json` needs to be updated to:
- Remove `sqlite3` dependency
- Add `pg` (PostgreSQL client) dependency
- Add `dotenv` for environment variables (optional but recommended)

### Step 2.3: Create Database Connection Module

We'll create a new file to handle database connections using Supabase/PostgreSQL.

### Step 2.4: Update server.js

We'll replace all SQLite database calls with PostgreSQL queries. The main changes:
- Replace `sqlite3` with `pg`
- Update all SQL queries to PostgreSQL syntax (mostly the same, but some differences)
- Change `AUTOINCREMENT` to `SERIAL`
- Update transaction handling
- Change callback-based code to async/await or promises

---

## 📦 Part 3: Push Code to GitHub

### Step 3.1: Initialize Git Repository (if not already done)

1. Open Terminal (Mac) or Command Prompt (Windows)
2. Navigate to your project folder:
   ```bash
   cd "/Users/kimmatthew/Desktop/IT WORKS/Official Business Form - Filing - GitHub/Official Business Form - Filing - GitHub"
   ```

3. Check if git is already initialized:
   ```bash
   git status
   ```

4. If you see an error, initialize git:
   ```bash
   git init
   ```

### Step 3.2: Create .gitignore File

Create a `.gitignore` file to exclude sensitive files:

```
node_modules/
.env
.env.local
database.db
database.db.bak
*.log
.DS_Store
```

### Step 3.3: Create GitHub Repository

1. Go to [github.com](https://github.com) and sign in
2. Click the **"+"** icon in the top right
3. Click **"New repository"**
4. Fill in:
   - **Repository name**: `official-business-form` (or your preferred name)
   - **Description**: "Official Business Form Application"
   - **Visibility**: Choose **Public** (free) or **Private**
   - **DO NOT** check "Initialize with README" (we already have files)
5. Click **"Create repository"**

### Step 3.4: Push Code to GitHub

1. In your terminal, run these commands (replace `YOUR_USERNAME` with your GitHub username):

```bash
# Add all files
git add .

# Commit the files
git commit -m "Initial commit - Official Business Form"

# Add GitHub repository as remote (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/official-business-form.git

# Push to GitHub
git branch -M main
git push -u origin main
```

2. You'll be prompted for your GitHub username and password (or use a Personal Access Token)

---

## 🚀 Part 4: Deploy to Vercel

### Step 4.1: Connect GitHub to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **"Sign Up"** or **"Log In"**
3. Choose **"Continue with GitHub"**
4. Authorize Vercel to access your GitHub account

### Step 4.2: Import Your Project

1. In Vercel dashboard, click **"Add New..."** → **"Project"**
2. Find your repository (`official-business-form`) in the list
3. Click **"Import"** next to it

### Step 4.3: Configure Project Settings

1. **Project Name**: Keep default or change it
2. **Framework Preset**: Select **"Other"** (or "Express" if available)
3. **Root Directory**: Leave as `./` (default)
4. **Build Command**: Leave empty or set to `npm install` (Vercel auto-detects)
5. **Output Directory**: Leave empty
6. **Install Command**: Leave as `npm install` (default)
7. **Development Command**: Leave empty

### Step 4.4: Add Environment Variables

**IMPORTANT:** Before clicking "Deploy", add your environment variables:

1. Click **"Environment Variables"** section
2. Add these variables:

   **Variable Name:** `DATABASE_URL`
   **Value:** Your Supabase connection string (the URI you copied earlier)
   - Example: `postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres`

   **Variable Name:** `ADMIN_PASSWORD`
   **Value:** Your admin password (e.g., `*1CNPOadmin*` or whatever you want)

   **Variable Name:** `PORT`
   **Value:** `3000` (Vercel will override this, but good to have)

3. Click **"Deploy"**

### Step 4.5: Wait for Deployment

1. Vercel will:
   - Install dependencies
   - Build your project
   - Deploy it
2. This takes 2-5 minutes
3. You'll see a success message with your website URL when done!

### Step 4.6: Test Your Deployment

1. Click on the provided URL (e.g., `https://your-project.vercel.app`)
2. Test the application:
   - Try submitting a form
   - Check if data is saved in Supabase (go to Table Editor in Supabase)
   - Try admin login
   - Test printing a form

---

## 🔧 Part 5: Post-Deployment Configuration

### Step 5.1: Update Vercel Settings (if needed)

1. In Vercel dashboard, go to your project
2. Click **"Settings"**
3. Under **"Build & Development Settings"**:
   - Verify **"Output Directory"** is empty
   - **"Install Command"**: `npm install`
   - **"Build Command"**: Leave empty (or `npm run build` if you add one)
   - **"Development Command"**: Leave empty
   - **"Start Command"**: Leave empty (Vercel auto-detects)

### Step 5.2: Configure Custom Domain (Optional)

1. In Vercel project settings, go to **"Domains"**
2. Add your custom domain if you have one
3. Follow Vercel's instructions to configure DNS

---

## 📝 Part 6: Migrating Existing Data (Optional)

If you have existing data in your SQLite database that you want to migrate:

### Step 6.1: Export Data from SQLite

1. Use the existing export endpoint: `/api/export-data`
2. Or manually export from your SQLite database

### Step 6.2: Import Data to Supabase

1. Go to Supabase **"Table Editor"**
2. Manually insert data, or
3. Use the SQL Editor to run INSERT statements, or
4. Use Supabase's import feature (if available)

---

## ⚠️ Important Notes

### Free Tier Limitations

**Supabase Free Tier:**
- 500 MB database storage
- 2 GB bandwidth per month
- 50,000 monthly active users
- 2 million database requests per month

**Vercel Free Tier:**
- 100 GB bandwidth per month
- Unlimited requests
- Automatic HTTPS
- Global CDN

### Security Best Practices

1. **Never commit `.env` files** - They contain sensitive passwords
2. **Use environment variables** in Vercel for all secrets
3. **Rotate passwords** periodically
4. **Enable Row Level Security (RLS)** in Supabase for production (advanced)

### Troubleshooting

**If deployment fails:**
- Check Vercel build logs for errors
- Verify all environment variables are set
- Ensure `package.json` has correct dependencies
- Check that database connection string is correct

**If database connection fails:**
- Verify Supabase project is active
- Check connection string format
- Ensure password is correct
- Check if IP restrictions are enabled in Supabase (disable for Vercel)

**If forms don't save:**
- Check Supabase Table Editor to see if tables exist
- Verify environment variables in Vercel
- Check Vercel function logs

---

## ✅ Checklist

Before you start:
- [ ] Supabase account created
- [ ] Vercel account created
- [ ] GitHub account created
- [ ] Code is ready to migrate

After Part 1 (Supabase Setup):
- [ ] Supabase project created
- [ ] Database connection string saved
- [ ] All 4 tables created successfully
- [ ] Tables visible in Table Editor

After Part 2 (Code Updates):
- [ ] `package.json` updated with `pg` dependency
- [ ] `server.js` updated to use PostgreSQL
- [ ] Code tested locally (if possible)

After Part 3 (GitHub):
- [ ] Repository created on GitHub
- [ ] Code pushed to GitHub
- [ ] Code visible on GitHub

After Part 4 (Vercel):
- [ ] Project imported to Vercel
- [ ] Environment variables added
- [ ] Deployment successful
- [ ] Website accessible via Vercel URL
- [ ] Forms can be submitted
- [ ] Data appears in Supabase

---

## 🎯 Next Steps After Migration

1. **Test thoroughly** - Submit forms, check data in Supabase
2. **Update README.md** - Document the new setup
3. **Set up monitoring** - Use Vercel Analytics (free tier available)
4. **Backup strategy** - Export data regularly from Supabase
5. **Performance optimization** - Monitor database queries

---

## 📞 Need Help?

If you encounter issues:
1. Check Vercel deployment logs
2. Check Supabase logs (in dashboard)
3. Review error messages carefully
4. Verify all environment variables are correct
5. Ensure all dependencies are installed

---

**Ready to start?** Begin with Part 1: Setting Up Supabase Database!
