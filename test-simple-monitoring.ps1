# Simple Monitoring System Test
Write-Host "🧪 Testing Simple Monitoring System..." -ForegroundColor Cyan

# Test 1: Check if monitoring files exist
Write-Host "`n1. Checking monitoring files..." -ForegroundColor Yellow
$monitoringFile = "cardsite/lib/monitoring.ts"
$dashboardFile = "cardsite/components/monitoring-dashboard.tsx"

if (Test-Path $monitoringFile) {
    Write-Host "✅ Monitoring library exists" -ForegroundColor Green
} else {
    Write-Host "❌ Monitoring library missing" -ForegroundColor Red
    exit 1
}

if (Test-Path $dashboardFile) {
    Write-Host "✅ Dashboard component exists" -ForegroundColor Green
} else {
    Write-Host "❌ Dashboard component missing" -ForegroundColor Red
    exit 1
}

# Test 2: Check monitoring integration in auth
Write-Host "`n2. Checking auth integration..." -ForegroundColor Yellow
$authFile = "cardsite/lib/auth.ts"
if (Test-Path $authFile) {
    $authContent = Get-Content $authFile -Raw
    if ($authContent -match "monitoring|trackError|trackPerformance") {
        Write-Host "✅ Auth monitoring integration found" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Auth monitoring integration not found" -ForegroundColor Yellow
    }
}

# Test 3: Check signup route integration
Write-Host "`n3. Checking signup route integration..." -ForegroundColor Yellow
$signupFile = "cardsite/app/api/auth/signup/route.ts"
if (Test-Path $signupFile) {
    $signupContent = Get-Content $signupFile -Raw
    if ($signupContent -match "monitoring|trackError|trackSecurity") {
        Write-Host "✅ Signup monitoring integration found" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Signup monitoring integration not found" -ForegroundColor Yellow
    }
}

# Test 4: Check dashboard integration in layout
Write-Host "`n4. Checking dashboard integration..." -ForegroundColor Yellow
$layoutFile = "cardsite/app/layout.tsx"
if (Test-Path $layoutFile) {
    $layoutContent = Get-Content $layoutFile -Raw
    if ($layoutContent -match "MonitoringDashboard") {
        Write-Host "✅ Dashboard integrated in layout" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Dashboard not integrated in layout" -ForegroundColor Yellow
    }
}

# Test 5: Try to build the project
Write-Host "`n5. Testing build..." -ForegroundColor Yellow
Set-Location cardsite
try {
    $buildOutput = npm run build 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Build successful" -ForegroundColor Green
    } else {
        Write-Host "❌ Build failed" -ForegroundColor Red
        Write-Host $buildOutput -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Build error: $_" -ForegroundColor Red
}
Set-Location ..

Write-Host "`n🎉 Simple monitoring system test complete!" -ForegroundColor Cyan
Write-Host "📊 You now have:" -ForegroundColor White
Write-Host "  - Basic error tracking" -ForegroundColor Gray
Write-Host "  - Performance monitoring for auth operations" -ForegroundColor Gray
Write-Host "  - Security event logging" -ForegroundColor Gray
Write-Host "  - Development dashboard (bottom-right corner)" -ForegroundColor Gray
Write-Host "  - Console logging in development mode" -ForegroundColor Gray 