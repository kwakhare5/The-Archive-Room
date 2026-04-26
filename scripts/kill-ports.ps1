# Kill processes listening on specific project ports (3000, 3001, 8765)
$ports = @(3000, 3001, 8765)

Write-Host ">>> Port Sanitization Protocol Initiated..." -ForegroundColor Cyan

foreach ($port in $ports) {
    Write-Host "[CHECK] Scanning port $port..." -ForegroundColor Gray
    
    # Get process IDs using the port
    $processIds = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    
    if ($processIds) {
        foreach ($procId in $processIds) {
            try {
                $process = Get-Process -Id $procId -ErrorAction SilentlyContinue
                if ($process) {
                    Write-Host "[KILL] Found $($process.Name) (PID: $procId) on port $port. Terminating..." -ForegroundColor Yellow
                    Stop-Process -Id $procId -Force
                }
            } catch {
                Write-Host "[WARN] Could not kill process $procId on port $port. It may require elevated permissions." -ForegroundColor Red
            }
        }
    } else {
        Write-Host "[OK] Port $port is clear." -ForegroundColor Green
    }
}

Write-Host ">>> Port cleanup complete." -ForegroundColor Green
