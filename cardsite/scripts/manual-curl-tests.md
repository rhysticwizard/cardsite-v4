# Manual cURL Testing Guide

## Test Availability Check (10 requests/min)

Run this command 11 times quickly:

```bash
curl -X GET "http://localhost:3010/api/auth/check-availability?username=testuser&email=test@test.com" \
  -H "Content-Type: application/json" \
  -i
```

**Expected Result:**
- Requests 1-10: Status 200
- Request 11: Status 429 with rate limit headers

## Test Signup (3 requests/min)

Run these commands quickly (use unique emails):

```bash
# Request 1
curl -X POST "http://localhost:3010/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser1","email":"test1@test.com","password":"SecurePass123!"}' \
  -i

# Request 2  
curl -X POST "http://localhost:3010/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser2","email":"test2@test.com","password":"SecurePass123!"}' \
  -i

# Request 3
curl -X POST "http://localhost:3010/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser3","email":"test3@test.com","password":"SecurePass123!"}' \
  -i

# Request 4 (should be rate limited)
curl -X POST "http://localhost:3010/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser4","email":"test4@test.com","password":"SecurePass123!"}' \
  -i
```

**Expected Result:**
- Requests 1-3: Status 201
- Request 4: Status 429

## Test Forgot Password (2 requests/min)

Run this command 3 times quickly:

```bash
curl -X POST "http://localhost:3010/api/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com"}' \
  -i
```

**Expected Result:**
- Requests 1-2: Status 200
- Request 3: Status 429

## What to Look For

### Success Response Headers:
```
HTTP/1.1 200 OK
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1640995200
```

### Rate Limited Response:
```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995260
Retry-After: 45
Content-Type: application/json

{"message":"Rate limit exceeded. Try again in 45 seconds."}
```

## Quick Test Script

Save this as `quick-test.bat` (Windows) or `quick-test.sh` (Mac/Linux):

```bash
@echo off
echo Testing Rate Limiting...

echo.
echo === Testing Availability Check ===
for /L %%i in (1,1,12) do (
  echo Request %%i:
  curl -s -w "Status: %%{http_code}\n" "http://localhost:3010/api/auth/check-availability?username=testuser&email=test@test.com"
  timeout /t 1 /nobreak >nul
)

echo.
echo === Wait 65 seconds for reset ===
timeout /t 65 /nobreak

echo.
echo === Testing Forgot Password ===
for /L %%i in (1,1,4) do (
  echo Request %%i:
  curl -s -w "Status: %%{http_code}\n" -X POST "http://localhost:3010/api/auth/forgot-password" -H "Content-Type: application/json" -d "{\"email\":\"test@test.com\"}"
  timeout /t 1 /nobreak >nul
)
``` 