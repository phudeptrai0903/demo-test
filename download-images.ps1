# Downloads images from data.json p_fl fields into ./images

$scriptDir = Split-Path -Path $MyInvocation.MyCommand.Path -Parent
$dataFile = Join-Path $scriptDir 'data.json'
$imagesDir = Join-Path $scriptDir 'images'

if (-not (Test-Path $dataFile)) {
    Write-Error "data.json not found at $dataFile"
    exit 1
}

if (-not (Test-Path $imagesDir)) {
    New-Item -Path $imagesDir -ItemType Directory | Out-Null
}

$json = Get-Content $dataFile -Raw | ConvertFrom-Json

$count = 0
$errors = @()
foreach ($i in 0..($json.Count - 1)) {
    $item = $json[$i]
    $url = $item.p_fl
    $city = $item.p_ds -replace '[\\/:*?"<>|]','_'
    $country = $item.p_cnt -replace '[\\/:*?"<>|]','_'
    $ext = [System.IO.Path]::GetExtension($url)
    if ([string]::IsNullOrEmpty($ext)) { $ext = '.img' }
    $index = $i + 1
    $fileName = "{0:00}_{1}_{2}{3}" -f $index, $country, $city, $ext
    # force lowercase filenames
    $fileName = $fileName.ToLowerInvariant()
    $outPath = Join-Path $imagesDir $fileName

    try {
        Invoke-WebRequest -Uri $url -OutFile $outPath -UseBasicParsing -ErrorAction Stop
        Write-Host "Saved: $outPath"
        $count++
    } catch {
        Write-Warning "Failed to download $url - $($_.Exception.Message)"
        $errors += @{url=$url;error=$_.Exception.Message}
    }
}

Write-Host "Downloaded $count files to $imagesDir"
if ($errors.Count -gt 0) {
    Write-Host "Errors:"
    $errors | ForEach-Object { Write-Host "- $($_.url): $($_.error)" }
}
