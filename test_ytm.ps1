try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/ytmusic/search?q=tum" -TimeoutSec 15 -UseBasicParsing
    $response.Content | Out-File C:\ARISE-AMP-RUSH2\out.json -Encoding utf8
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}
