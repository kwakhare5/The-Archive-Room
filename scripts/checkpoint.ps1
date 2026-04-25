# Archive Pulse - Effortless Save Script for The Archive Room
# This script automates staging, committing, and pushing changes to GitHub.

Param(
    [string]$CustomMessage
)

$branch = git branch --show-current
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$message = if ($CustomMessage) { $CustomMessage } else { "Archive Pulse: $timestamp [Checkpoint]" }

Write-Host ">>> Starting Archive Pulse..." -ForegroundColor Cyan

# Check for changes
$status = git status --porcelain
if (-not $status) {
    Write-Host "[OK] No changes to save. Everything is up to date." -ForegroundColor Green
    exit 0
}

Write-Host "[STAGING] Staging changes..." -ForegroundColor Yellow
git add .

Write-Host "[COMMIT] Committing changes..." -ForegroundColor Yellow
git commit -m "$message"

Write-Host "[PUSH] Pushing to $branch..." -ForegroundColor Yellow
git push origin $branch

if ($LASTEXITCODE -eq 0) {
    Write-Host "[SUCCESS] Progress successfully saved to GitHub!" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to push changes. Check your network or credentials." -ForegroundColor Red
    exit 1
}
