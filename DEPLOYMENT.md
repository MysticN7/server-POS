# Deployment Guide - Render Backend

## Problem
Render is deploying old code with Sequelize/SQLite instead of the new MongoDB/Mongoose code.

## Solution
Push your updated code to GitHub, then redeploy on Render.

## Steps

### 1. Commit and Push Your Changes to GitHub

```bash
# Navigate to your server directory
cd c:/Users/MAHADI/Downloads/POS/server

# Initialize git if not already done
git init

# Add all files
git add .

# Commit the changes
git commit -m "Migrated from SQLite to MongoDB Atlas with Cloudinary"

# Add your GitHub repository as remote (if not already added)
git remote add origin https://github.com/MysticN7/server-POS

# Push to GitHub
git push -u origin main
```

### 2. Configure Environment Variables on Render

Go to your Render dashboard and add these environment variables:

```
MONGODB_URI=mongodb+srv://vyrovibes777_db_user:mrcoderr787@cluster0.b57a4es.mongodb.net/pos-db?retryWrites=true&w=majority
JWT_SECRET=minar_optics_pos_secret_key_2024_change_in_production
CLOUDINARY_CLOUD_NAME=your_actual_cloud_name
CLOUDINARY_API_KEY=683294931889228
CLOUDINARY_API_SECRET=wZZw1rgeTKAYEhyNuOBduVbFuJ0
PORT=5000
NODE_ENV=production
CLIENT_URL=https://your-frontend-url.vercel.app
```

### 3. Trigger Manual Deploy on Render

After pushing to GitHub:
1. Go to your Render dashboard
2. Find your service
3. Click "Manual Deploy" → "Deploy latest commit"

### 4. Verify Deployment

Check the logs to ensure:
- ✅ MongoDB connection successful
- ✅ Server running on port 5000
- ✅ No Sequelize/SQLite errors

## Important Notes

- Make sure `.env` is in `.gitignore` (don't push secrets to GitHub)
- The environment variables should be set in Render's dashboard, not in the code
- After deployment, update your frontend's API URL to point to the Render backend URL
