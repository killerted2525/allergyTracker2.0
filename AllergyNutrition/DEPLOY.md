# 🚀 Deploy AllergyTracker to GitHub & Render

Complete deployment guide for your MacBook.

---

## 📋 Prerequisites

- MacBook with Terminal access ✅
- GitHub account (free)
- Render account (free) at [render.com](https://render.com)

---

## Part 1: Deploy to GitHub

### Step 1: Install Git (if needed)

```bash
# Check if git is installed
git --version

# If not installed, install via Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install git
```

### Step 2: Create GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `allergy-tracker`
3. Description: "Food allergy management calendar app"
4. Choose **Public** or **Private**
5. **Do NOT** initialize with README
6. Click **Create repository**

### Step 3: Push Code to GitHub

Open Terminal in your project folder and run:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit - AllergyTracker app"

# Add GitHub remote (replace YOUR-USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR-USERNAME/allergy-tracker.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**✅ Your code is now on GitHub!**

---

## Part 2: Deploy to Render

### Step 4: Create Neon Database (Free)

1. Go to [neon.tech](https://neon.tech)
2. Sign up/login (free account)
3. Click **Create Project**
4. Name: `allergy-tracker-db`
5. Region: Choose closest to you
6. Click **Create Project**
7. **Copy the connection string** (starts with `postgresql://`)
   - It looks like: `postgresql://user:password@host/database`
   - **Save this for Step 6!**

### Step 5: Create Render Web Service

1. Go to [render.com](https://render.com)
2. Sign up/login
3. Click **New +** → **Web Service**
4. Connect your GitHub account
5. Select your `allergy-tracker` repository
6. Configure:
   - **Name:** `allergy-tracker`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build && npm run db:push`
   - **Start Command:** `npm start`
   - **Instance Type:** Free

### Step 6: Add Environment Variables

Still on Render setup page:

1. Scroll to **Environment Variables**
2. Click **Add Environment Variable** and add BOTH:
   
   **First variable:**
   - **Key:** `DATABASE_URL`
   - **Value:** [Paste your Neon connection string from Step 4]
   
   **Second variable:**
   - **Key:** `SESSION_SECRET`
   - **Value:** [Any random string, e.g., `my-super-secret-key-12345`]
   
3. Click **Create Web Service**

**⏳ Render will now build and deploy your app (takes 2-5 minutes)**

The build process automatically sets up your database, so no manual steps needed!

**🎉 Your app is now live!**

---

## 📱 Access Your App

Your app URL: `https://allergy-tracker.onrender.com`

- **First load** may take 30-60 seconds (free tier sleeps when inactive)
- **Subsequent loads** are instant
- **Database** persists all your data permanently

---

## 🔄 How to Update Your App

When you make changes:

```bash
# In your project folder
git add .
git commit -m "Description of changes"
git push

# Render automatically rebuilds and deploys!
```

---

## 🆘 Troubleshooting

### App won't start
- Check Render logs: Dashboard → Your Service → Logs
- Verify BOTH `DATABASE_URL` and `SESSION_SECRET` are set correctly
- Make sure build command includes `npm run db:push`

### Database issues
- Verify Neon database is active at [console.neon.tech](https://console.neon.tech)
- Check connection string is correct
- Run `npm run db:push` again

### Build fails
- Check if `package.json` has all dependencies
- Verify Node version compatibility
- Check Render build logs for specific errors

---

## 💡 Tips

- **Custom Domain:** Add free at Render → Settings → Custom Domains
- **Auto-deploy:** Enabled by default (every git push updates the app)
- **Monitoring:** Check Render dashboard for metrics and logs
- **Free tier:** 750 hours/month (enough for one app running 24/7)

---

**🎊 Congratulations! Your AllergyTracker is deployed and live!**
