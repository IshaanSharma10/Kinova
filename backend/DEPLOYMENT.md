# Backend Deployment Guide

This guide will help you deploy your FastAPI backend to work with your deployed frontend.

## Quick Deployment Options

### Option 1: Render.com (Recommended - Free Tier Available)

1. **Create a Render Account**
   - Go to https://render.com
   - Sign up for a free account

2. **Create a New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the `backend` folder as the root directory

3. **Configure the Service**
   - **Name**: `kinova-backend` (or your preferred name)
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

4. **Set Environment Variables**
   - Go to "Environment" tab
   - Add these variables:
     ```
     ALLOWED_ORIGINS=https://your-frontend-url.vercel.app,https://your-frontend-url.netlify.app
     ENVIRONMENT=production
     HF_CHATBOT_API_URL=https://elizaarora22-gait-analyzer-chatbot.hf.space/chat
     HF_CHATBOT_API_TOKEN=your-token-here
     ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (first time takes ~5-10 minutes)
   - Your backend will be available at: `https://your-service-name.onrender.com`

---

### Option 2: Railway.app

1. **Create a Railway Account**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure Service**
   - Railway will auto-detect Python
   - Set root directory to `backend`
   - The `railway.json` file will be used automatically

4. **Set Environment Variables**
   - Go to "Variables" tab
   - Add the same variables as Render (see above)

5. **Deploy**
   - Railway will automatically deploy
   - Your backend URL will be: `https://your-service-name.up.railway.app`

---

### Option 3: Fly.io

1. **Install Fly CLI**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login**
   ```bash
   fly auth login
   ```

3. **Initialize Fly App**
   ```bash
   cd backend
   fly launch
   ```

4. **Deploy**
   ```bash
   fly deploy
   ```

---

### Option 4: Heroku

1. **Install Heroku CLI**
   - Download from https://devcenter.heroku.com/articles/heroku-cli

2. **Login**
   ```bash
   heroku login
   ```

3. **Create App**
   ```bash
   cd backend
   heroku create your-app-name
   ```

4. **Set Environment Variables**
   ```bash
   heroku config:set ALLOWED_ORIGINS=https://your-frontend-url.vercel.app
   heroku config:set ENVIRONMENT=production
   heroku config:set HF_CHATBOT_API_URL=https://elizaarora22-gait-analyzer-chatbot.hf.space/chat
   heroku config:set HF_CHATBOT_API_TOKEN=your-token-here
   ```

5. **Deploy**
   ```bash
   git push heroku main
   ```

---

## Update Frontend Configuration

After deploying your backend, update your frontend:

1. **Create `.env` file in project root** (if not exists):
   ```env
   VITE_API_URL=https://your-backend-url.onrender.com
   ```

2. **For Vercel/Netlify deployment:**
   - Add environment variable in your hosting dashboard:
     - Variable name: `VITE_API_URL`
     - Value: `https://your-backend-url.onrender.com`

3. **Rebuild and redeploy your frontend**

---

## Testing Your Deployment

1. **Test Health Endpoint**
   ```bash
   curl https://your-backend-url.onrender.com/
   ```
   Should return: `{"status":"Backend running!"}`

2. **Test from Frontend**
   - Open your deployed frontend
   - Try using the chatbot or workout tracker
   - Check browser console for any CORS errors

---

## Troubleshooting

### CORS Errors
- Make sure `ALLOWED_ORIGINS` includes your exact frontend URL (with https://)
- Check that `ENVIRONMENT=production` is set

### Backend Not Starting
- Check logs in your hosting platform
- Verify all dependencies are in `requirements.txt`
- Ensure `PORT` environment variable is available (most platforms set this automatically)

### MediaPipe/OpenCV Issues
- These libraries require system dependencies
- Dockerfile includes necessary dependencies
- For non-Docker deployments, ensure platform supports these libraries

---

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `ALLOWED_ORIGINS` | Comma-separated list of frontend URLs | `https://app.vercel.app,https://app.netlify.app` |
| `ENVIRONMENT` | Set to `production` for production | `production` |
| `HF_CHATBOT_API_URL` | Hugging Face chatbot API URL | `https://...hf.space/chat` |
| `HF_CHATBOT_API_TOKEN` | Hugging Face API token | `hf_...` |
| `PORT` | Server port (usually set by platform) | `8000` |

---

## Recommended: Render.com

**Why Render?**
- ✅ Free tier available
- ✅ Easy GitHub integration
- ✅ Automatic SSL certificates
- ✅ Simple environment variable management
- ✅ Good documentation

**Free Tier Limits:**
- Services spin down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds
- Upgrade to paid plan for always-on service

