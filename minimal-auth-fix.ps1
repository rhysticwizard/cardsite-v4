# Temporarily disable all monitoring in auth.ts for testing
Write-Host "🔧 Temporarily disabling monitoring in auth.ts..." -ForegroundColor Yellow

$authFile = "cardsite/lib/auth.ts"
$content = Get-Content $authFile -Raw

# Comment out all monitoring-related lines
$content = $content -replace 'const authTimer = createPerformanceTimer\(MetricType\.AUTH_LOGIN_TIME\)', '// const authTimer = createPerformanceTimer(MetricType.AUTH_LOGIN_TIME)'
$content = $content -replace 'authTimer\.end\([^)]*\)', '// authTimer.end()'
$content = $content -replace 'trackSecurityEvent\([^}]*\}[^}]*\)', '// trackSecurityEvent() commented'
$content = $content -replace 'trackAuthMetrics\([^)]*\)', '// trackAuthMetrics() commented'
$content = $content -replace 'captureError\([^}]*\}[^}]*\)', '// captureError() commented'
$content = $content -replace 'const passwordCheckTimer = createPerformanceTimer\(MetricType\.PASSWORD_CHECK_TIME\)', '// const passwordCheckTimer = createPerformanceTimer(MetricType.PASSWORD_CHECK_TIME)'
$content = $content -replace 'passwordCheckTimer\.end\([^)]*\)', '// passwordCheckTimer.end()'

Set-Content $authFile $content

Write-Host "✅ Auth monitoring temporarily disabled" -ForegroundColor Green
Write-Host "📝 You can now test the monitoring system on the test page" -ForegroundColor Cyan
Write-Host "Go to: http://localhost:3010/test-monitoring" -ForegroundColor Cyan 