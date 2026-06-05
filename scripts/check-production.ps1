Write-Host "`n=== FoodBridge production check ===`n" -ForegroundColor Cyan

$health = curl.exe -s --max-time 60 "https://foodbridge-54z7.onrender.com/api/health/public"
Write-Host "API health: $health"

$login = curl.exe -s -X POST -H "Content-Type: application/json" -d '{\"email\":\"admin@foodbridge.com\",\"password\":\"password123\"}' --max-time 60 "https://foodbridge-54z7.onrender.com/api/auth/login"
if ($login -match '"token"') {
  Write-Host "Login: OK" -ForegroundColor Green
} else {
  Write-Host "Login: FAILED — $login" -ForegroundColor Red
  Write-Host @"

If database is 'error', Render cannot reach Supabase (IPv6 issue).

FIX (pick one):
  A) Render Dashboard -> foodbridge-54z7 -> Environment -> set:
     DATABASE_URL = postgresql://postgres:FoodBridge%401012@db.tpnhbwflsrscfylnedqp.supabase.co:6543/postgres?pgbouncer=true&sslmode=require
     DIRECT_URL   = (same as above)
     Then Manual Deploy.

  B) Supabase Dashboard -> Connect -> Session pooler -> copy URI -> paste as DATABASE_URL on Render.

  C) Create Render PostgreSQL, paste its Internal URL as DATABASE_URL, redeploy, run: npm run deploy

"@ -ForegroundColor Yellow
}

Write-Host "`nFrontend: https://foodbridgeplatform.netlify.app`n"
