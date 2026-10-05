$ErrorActionPreference = "Stop"

function Write-Check($name, $ok, $detail) {
    if ($ok) {
        Write-Host "[OK]   $name - $detail"
    } else {
        Write-Host "[FAIL] $name - $detail"
        $script:Failed = $true
    }
}

$script:Failed = $false
Write-Host ""
Write-Host "OUTSiiDE Windows setup check"
Write-Host "----------------------------"

try {
    $nodeVersion = (& node --version).Trim()
    $major = [int](($nodeVersion -replace '^v','').Split('.')[0])
    Write-Check "Node.js" ($major -eq 22) "$nodeVersion (Node 22 LTS required)"
} catch {
    Write-Check "Node.js" $false "Node.js is not installed or not on PATH"
}

try {
    $npmVersion = (& npm --version).Trim()
    Write-Check "npm" $true "v$npmVersion"
} catch {
    Write-Check "npm" $false "npm is not installed or not on PATH"
}

try {
    $gitVersion = (& git --version).Trim()
    Write-Check "Git" $true $gitVersion
} catch {
    Write-Check "Git" $false "Git is not installed or not on PATH"
}

try {
    $prisma = (& npx prisma --version 2>&1 | Select-Object -First 1).ToString().Trim()
    Write-Check "Prisma CLI" ($LASTEXITCODE -eq 0) $prisma
} catch {
    Write-Check "Prisma CLI" $false "Run npm install first"
}

try {
    $ffmpegVersion = (& ffmpeg -version 2>&1 | Select-Object -First 1).ToString().Trim()
    Write-Check "FFmpeg" ($LASTEXITCODE -eq 0) $ffmpegVersion
} catch {
    Write-Host "[WARN] FFmpeg - not found. Required only for local clip-worker/transcoding tests; Render production worker will provide it separately."
}

if (Test-Path ".env") {
    Write-Host "[OK]   Local .env - present (values not displayed)"
} else {
    Write-Host "[WARN] Local .env - not present. This is fine for production because production secrets belong in Render. Create .env only for local development."
}

Write-Host ""
Write-Host "Production note: do NOT keep production DATABASE_URL, Stripe, LiveKit, Redis, email, or storage secrets in PowerShell."
Write-Host "Those belong in Render/Supabase provider settings."
Write-Host ""

if ($script:Failed) {
    Write-Host "One or more required local tools need attention."
    exit 1
}

Write-Host "Windows setup looks ready."
exit 0
