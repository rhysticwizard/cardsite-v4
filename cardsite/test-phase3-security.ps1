# 🧪 PHASE 3 SECURITY TESTING SCRIPT
# Tests all security headers and CSRF protection

Write-Host "🔒 Testing Phase 3 Security Implementation..." -ForegroundColor Cyan

# Test 1: Security Headers
Write-Host "`n📋 Test 1: Security Headers Verification" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3010/" -Method Head
    
    Write-Host "✅ Status Code: $($response.StatusCode)" -ForegroundColor Green
    
    # Check required security headers
    $securityHeaders = @(
        "x-frame-options",
        "x-content-type-options", 
        "x-xss-protection",
        "referrer-policy",
        "x-dns-prefetch-control",
        "x-download-options",
        "x-permitted-cross-domain-policies",
        "permissions-policy",
        "content-security-policy"
    )
    
    Write-Host "`n🔍 Security Headers Found:" -ForegroundColor Blue
    foreach ($header in $securityHeaders) {
        if ($response.Headers.ContainsKey($header)) {
            $value = $response.Headers[$header]
            if ($value.Length -gt 50) {
                $value = $value.Substring(0, 50) + "..."
            }
            Write-Host "   ✅ $header : $value" -ForegroundColor Green
        } else {
            Write-Host "   ❌ $header : MISSING" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "❌ Failed to test headers: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Security Test Endpoint
Write-Host "`n📋 Test 2: Security Test Endpoint" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3010/api/security/test-headers" -Method Get
    $content = $response.Content | ConvertFrom-Json
    
    Write-Host "✅ Security endpoint accessible" -ForegroundColor Green
    Write-Host "   Status: $($content.success)" -ForegroundColor Blue
    Write-Host "   Message: $($content.message)" -ForegroundColor Blue
    Write-Host "   Authenticated: $($content.data.authenticated)" -ForegroundColor Blue
} catch {
    Write-Host "❌ Failed to access security endpoint: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: CSRF Protection
Write-Host "`n📋 Test 3: CSRF Protection" -ForegroundColor Yellow
try {
    # This should fail due to missing CSRF token
    $response = Invoke-WebRequest -Uri "http://localhost:3010/api/security/test-headers" -Method Post -ContentType "application/json" -Body "{`"test`":`"unauthorized`"}" -ErrorAction Stop
    Write-Host "❌ CSRF protection failed - request succeeded when it should have been blocked" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 403) {
        Write-Host "✅ CSRF protection working - 403 Forbidden returned" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Unexpected error: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Test 4: CSP Header Details
Write-Host "`n📋 Test 4: Content Security Policy Details" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3010/" -Method Head
    if ($response.Headers.ContainsKey("content-security-policy")) {
        $csp = $response.Headers["content-security-policy"]
        Write-Host "✅ CSP Header Found:" -ForegroundColor Green
        
        # Check key CSP directives
        $cspDirectives = @(
            "default-src `'self`'",
            "object-src `'none`'",
            "frame-ancestors `'none`'",
            "upgrade-insecure-requests"
        )
        
        foreach ($directive in $cspDirectives) {
            if ($csp -like "*$directive*") {
                Write-Host "   ✅ $directive" -ForegroundColor Green
            } else {
                Write-Host "   ❌ $directive - MISSING" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "❌ CSP header not found" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Failed to test CSP: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎯 Phase 3 Testing Complete!" -ForegroundColor Cyan
Write-Host "Check the results above to verify all security features are working." -ForegroundColor White 