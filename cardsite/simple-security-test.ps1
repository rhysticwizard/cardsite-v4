# Simple Phase 3 Security Test
Write-Host "=== PHASE 3 SECURITY TEST ===" -ForegroundColor Cyan

# Test 1: Check if server is running
Write-Host "`n1. Testing server availability..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3010/" -Method Head -TimeoutSec 5
    Write-Host "   ✅ Server is running (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Server not running. Please start with 'npm run dev'" -ForegroundColor Red
    exit
}

# Test 2: Security Headers Check
Write-Host "`n2. Checking security headers..." -ForegroundColor Yellow
$headers = $response.Headers
$requiredHeaders = @(
    "x-frame-options",
    "x-content-type-options",
    "x-xss-protection",
    "content-security-policy"
)

foreach ($header in $requiredHeaders) {
    if ($headers.ContainsKey($header)) {
        Write-Host "   ✅ $header" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $header MISSING" -ForegroundColor Red
    }
}

# Test 3: Security Test Endpoint
Write-Host "`n3. Testing security endpoint..." -ForegroundColor Yellow
try {
    $testResponse = Invoke-WebRequest -Uri "http://localhost:3010/api/security/test-headers" -Method Get
    Write-Host "   ✅ Security endpoint accessible" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Security endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: CSRF Protection
Write-Host "`n4. Testing CSRF protection..." -ForegroundColor Yellow
try {
    $postResponse = Invoke-WebRequest -Uri "http://localhost:3010/api/security/test-headers" -Method Post -Body "{}" -ContentType "application/json" -ErrorAction Stop
    Write-Host "   ❌ CSRF protection failed - POST succeeded" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401 -or $_.Exception.Response.StatusCode -eq 403) {
        Write-Host "   ✅ CSRF protection working (got $($_.Exception.Response.StatusCode))" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Unexpected response: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}

Write-Host "`n=== TEST COMPLETE ===" -ForegroundColor Cyan
Write-Host "If you see mostly green checkmarks above, Phase 3 is working correctly!" -ForegroundColor White 