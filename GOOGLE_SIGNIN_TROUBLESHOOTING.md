# Google Sign-In Troubleshooting Guide

## Common Issues and Solutions

### 1. Popup Blocked
**Error**: "Popup was blocked by your browser"
**Solution**: 
- Allow popups for this site in your browser settings
- Try using a different browser
- Check if you have any popup blocker extensions installed

### 2. Google Sign-In Not Enabled
**Error**: "Google sign-in is not enabled"
**Solution**:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `gaitanalyzer-c23c7`
3. Navigate to **Authentication** → **Sign-in method**
4. Click on **Google** provider
5. Enable it and add your **Support email**
6. Click **Save**

### 3. Unauthorized Domain
**Error**: "This domain is not authorized for Google sign-in"
**Solution**:
1. Go to Firebase Console → Authentication → Settings
2. Scroll to **Authorized domains**
3. Add your domain (e.g., `localhost`, `yourdomain.com`)
4. Click **Add**

### 4. Network Issues
**Error**: "Network error"
**Solution**:
- Check your internet connection
- Try again after a few moments
- Check if you're behind a firewall or VPN that might block Google services

### 5. Browser Compatibility
**Solution**:
- Use a modern browser (Chrome, Firefox, Edge, Safari)
- Update your browser to the latest version
- Clear browser cache and cookies

## Testing Steps

1. **Check Browser Console**:
   - Open Developer Tools (F12)
   - Go to Console tab
   - Look for any error messages when clicking "Sign up with Google"

2. **Check Network Tab**:
   - Open Developer Tools → Network tab
   - Try Google sign-in again
   - Look for failed requests to `accounts.google.com` or `firebase.googleapis.com`

3. **Verify Firebase Configuration**:
   - Ensure Firebase project is active
   - Check that Google provider is enabled
   - Verify authorized domains include your current domain

## Quick Fix Checklist

- [ ] Google provider enabled in Firebase Console
- [ ] Authorized domains include your domain
- [ ] Popup blockers disabled
- [ ] Browser is up to date
- [ ] Internet connection is stable
- [ ] No firewall/VPN blocking Google services

