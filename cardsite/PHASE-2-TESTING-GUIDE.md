# 🧪 PHASE 2 TESTING GUIDE: Enhanced Session Security

## 🚀 STEP-BY-STEP TESTING INSTRUCTIONS

### **PREPARATION**
1. Make sure your dev server is running:
   ```bash
   cd cardsite
   npm run dev
   ```
2. Open your browser to `http://localhost:3010`
3. Open Browser DevTools (F12) and keep the Console tab open

---

## 🔍 TEST 1: SESSION CONFIGURATION & COOKIES

### **What We're Testing:**
- Cookie security attributes
- Session duration settings
- Environment-based configuration

### **Steps:**
1. **Navigate to** `http://localhost:3010/auth/signin`
2. **Sign in** with your test credentials:
   - Email: `test@test.com`
   - Password: `TestPassword123!`
3. **Open DevTools > Application > Cookies > `http://localhost:3010`**

### **Expected Results:**
✅ **Development Environment Cookies:**
```
next-auth.session-token:
- HttpOnly: ✓ (checked)
- Secure: ✗ (unchecked - normal for localhost)
- SameSite: Lax
- Max-Age: 2592000 (30 days in seconds)
```

✅ **Console Logs Should Show:**
```
🔐 Successful sign-in: { userId: '...', email: 'test@test.com', provider: 'credentials', timestamp: '...' }
🛡️ Security Event: { type: 'SIGN_IN', userId: '...', sessionId: '...', timestamp: '...' }
```

---

## 🔍 TEST 2: SECURITY EVENT LOGGING

### **What We're Testing:**
- Session monitoring system
- Security event creation
- Sign-in/sign-out tracking

### **Steps:**
1. **Clear browser console** (right-click > Clear console)
2. **Sign out** (click your profile > Sign out)
3. **Sign back in** with credentials
4. **Navigate to different pages** (`/profile`, `/`, etc.)

### **Expected Results:**
✅ **Console Should Show Multiple Events:**
```
🛡️ Security Event: { type: 'SIGN_OUT', userId: '...', sessionId: '...', timestamp: '...' }
🛡️ Security Event: { type: 'SIGN_IN', userId: '...', sessionId: '...', timestamp: '...' }
🔄 Session activity: { userId: '...', sessionId: '...', lastActivity: 1234567890, timestamp: '...' }
```

---

## 🔍 TEST 3: SESSION METADATA & JWT INSPECTION

### **What We're Testing:**
- JWT token enhancement
- Session ID generation
- Activity tracking

### **Steps:**
1. **While signed in**, open DevTools Console
2. **Run this command** to inspect session:
   ```javascript
   // Get the session cookie value
   const sessionToken = document.cookie
     .split('; ')
     .find(row => row.startsWith('next-auth.session-token='))
     ?.split('=')[1];
   
   console.log('Session Token Found:', !!sessionToken);
   
   // Check if session is working
   fetch('/api/auth/session')
     .then(res => res.json())
     .then(session => {
       console.log('Current Session:', session);
       console.log('Session ID:', session.sessionId);
       console.log('Last Activity:', session.lastActivity);
     });
   ```

### **Expected Results:**
✅ **Console Output:**
```
Session Token Found: true
Current Session: {
  user: { id: '...', email: 'test@test.com', name: '...', ... },
  sessionId: 'uuid-string-here',
  lastActivity: 1234567890,
  expires: '2024-...'
}
```

---

## 🔍 TEST 4: SESSION ACTIVITY TRACKING

### **What We're Testing:**
- Session update behavior
- Activity timestamp updates
- Session refresh mechanism

### **Steps:**
1. **Clear console** and note the current time
2. **Wait 1-2 minutes** (session should update every hour, but we can force it)
3. **Navigate between pages** or **refresh the page**
4. **Check console for activity logs**

### **Expected Results:**
✅ **Console Should Show:**
```
🔄 Session activity: { 
  userId: '...', 
  sessionId: '...', 
  lastActivity: [updated-timestamp], 
  timestamp: '...' 
}
```

---

## 🔍 TEST 5: PRODUCTION VS DEVELOPMENT SETTINGS

### **What We're Testing:**
- Environment-based configuration
- Production security settings

### **Steps:**
1. **Check current environment settings:**
   ```javascript
   // In browser console
   console.log('Environment:', process.env.NODE_ENV);
   ```

2. **Verify development configuration:**
   - Session duration: 30 days
   - Cookie name: `next-auth.session-token`
   - Secure flag: false (localhost)

### **Expected Results:**
✅ **Development Settings Active:**
- Environment: `development`
- Cookie max-age: `2592000` (30 days)
- Enhanced logging enabled
- Security prefixes disabled for localhost

---

## 🔍 TEST 6: SECURITY EVENT MONITORING API

### **What We're Testing:**
- SessionMonitor functionality
- Event collection and retrieval

### **Steps:**
1. **Create a test API endpoint** to check security events:
   ```javascript
   // In browser console, after signing in and out a few times
   fetch('/api/auth/session')
     .then(res => res.json())
     .then(session => {
       console.log('Testing SessionMonitor...');
       
       // The SessionMonitor should have recorded events
       // (This is more for backend verification)
       console.log('Session monitoring active for user:', session.user.id);
     });
   ```

### **Expected Results:**
✅ **Security Events Recorded:**
- Multiple SIGN_IN and SIGN_OUT events in console
- Session IDs being tracked
- Timestamps accurate

---

## 🔍 TEST 7: COOKIE SECURITY ATTRIBUTES

### **What We're Testing:**
- Cookie security configuration
- HttpOnly and SameSite settings

### **Steps:**
1. **In DevTools > Application > Cookies**
2. **Inspect each cookie** (session, CSRF, callback)
3. **Try to access cookie via JavaScript:**
   ```javascript
   // This should NOT work (HttpOnly protection)
   console.log('Session cookie access:', document.cookie.includes('next-auth.session-token'));
   
   // You should see the cookie name but not be able to read the value
   console.log('All cookies:', document.cookie);
   ```

### **Expected Results:**
✅ **Security Attributes:**
- HttpOnly: ✓ (prevents JavaScript access)
- SameSite: Lax (CSRF protection)
- Path: / (site-wide)
- Cannot read session token value from JavaScript

---

## 🛠️ TROUBLESHOOTING

### **If You Don't See Security Events:**
1. Check that you're in development mode
2. Clear browser cache and cookies
3. Sign out and sign back in
4. Check for console errors

### **If Cookies Look Wrong:**
1. Clear all cookies for localhost:3010
2. Restart the dev server
3. Sign in again

### **If Session Doesn't Work:**
1. Check `.env.local` has `NEXTAUTH_SECRET`
2. Verify database connection
3. Check for TypeScript errors in terminal

---

## ✅ TESTING CHECKLIST

- [ ] Dev server running without errors
- [ ] Can sign in successfully
- [ ] Security events appear in console
- [ ] Session cookie has proper attributes
- [ ] Session metadata includes sessionId and lastActivity
- [ ] Sign-out events are logged
- [ ] Session activity tracking works
- [ ] Cookies are HttpOnly and secure
- [ ] No JavaScript access to session tokens

---

## 🎯 WHAT TO LOOK FOR

### **SUCCESS INDICATORS:**
- Console full of security event logs
- Session cookies with security attributes
- No authentication errors
- Session IDs in session data
- Activity tracking working

### **FAILURE INDICATORS:**
- No security events in console
- Missing session metadata
- Authentication errors
- Blank/missing cookies
- TypeScript errors preventing startup

---

## 📞 NEXT STEPS

Once you've completed these tests:

1. **Report Results:** Let me know which tests passed/failed
2. **Fix Issues:** We'll address any problems found
3. **Move to Phase 3:** Proceed to Security Headers & CSRF when ready

**The goal is to see comprehensive security logging and properly configured session management!** 