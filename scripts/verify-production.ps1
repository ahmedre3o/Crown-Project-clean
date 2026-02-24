# P0 Production Verification Script (PowerShell)
# Run: .\scripts\verify-production.ps1

$API_BASE = if ($env:API_BASE) { $env:API_BASE } else { "https://api.crowncs.org" }

Write-Host "=== Crown Production Verification ===" -ForegroundColor Cyan
Write-Host "API Base: $API_BASE"
Write-Host ""

Write-Host "1) Storefront health (must return 200):" -ForegroundColor Yellow
try {
    $r = Invoke-WebRequest -Uri "$API_BASE/api/storefront/health" -Method GET -UseBasicParsing
    Write-Host "Status: $($r.StatusCode)" -ForegroundColor $(if ($r.StatusCode -eq 200) { "Green" } else { "Red" })
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "2) POST /api/storefront/orders (expect 400/201, NOT 404):" -ForegroundColor Yellow
$body = '{"shopId":1,"customerName":"Test","phone":"01012345678","governorate":"Cairo","city":"Nasr City","address":"Test St","items":[{"productId":1,"quantity":1}]}'
try {
    $r = Invoke-WebRequest -Uri "$API_BASE/api/storefront/orders" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
    Write-Host "Status: $($r.StatusCode)" -ForegroundColor Green
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Write-Host "Status: $status" -ForegroundColor $(if ($status -eq 404) { "Red" } elseif ($status -eq 400) { "Yellow" } else { "Red" })
    if ($status -eq 404) { Write-Host "404 = Route NOT deployed. Redeploy backend." -ForegroundColor Red }
}
Write-Host ""

Write-Host "3) Git revisions:" -ForegroundColor Yellow
if (Test-Path "backend") {
    Push-Location backend
    Write-Host "Backend: $(git rev-parse HEAD 2>$null)"
    Pop-Location
}
Write-Host "Frontend: $(git rev-parse HEAD 2>$null)"
Write-Host ""

Write-Host "=== If health=200 but POST=404: backend routes not deployed or proxy strips /api ===" -ForegroundColor Gray
