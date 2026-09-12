$ErrorActionPreference = 'Stop'
$sourceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\')
$targetRoot = [IO.Path]::GetFullPath('C:\Users\no32b\OneDrive\바탕 화면\포트폴리오2\헬스 다이어트 어플 관련 파일들').TrimEnd('\')
if ($sourceRoot -eq $targetRoot) { throw 'Source and destination are identical.' }
New-Item -ItemType Directory -Path $targetRoot -Force | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$files = @(Get-ChildItem -LiteralPath $sourceRoot -File -Recurse | Where-Object { $_.FullName -notmatch '\\(\.git|__pycache__|node_modules|\.previous)\\' })
$receipt = @()
foreach ($file in $files) {
    $relative = $file.FullName.Substring($sourceRoot.Length + 1)
    $destination = [IO.Path]::GetFullPath((Join-Path $targetRoot $relative))
    if (-not $destination.StartsWith($targetRoot + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Destination escapes the requested folder.' }
    $hash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
    if (Test-Path -LiteralPath $destination) {
        if ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash -ne $hash) {
            $backup = Join-Path (Join-Path (Join-Path $targetRoot '.previous') $stamp) $relative
            New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($backup)) -Force | Out-Null
            Copy-Item -LiteralPath $destination -Destination $backup
        }
    }
    New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($destination)) -Force | Out-Null
    Copy-Item -LiteralPath $file.FullName -Destination $destination -Force
    if ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash -ne $hash) { throw "Hash mismatch: $relative" }
    $receipt += [PSCustomObject]@{ path=$relative; bytes=$file.Length; sha256=$hash }
}
$report = [PSCustomObject]@{ checkedAt=(Get-Date -Format o); source=$sourceRoot; destination=$targetRoot; count=$receipt.Count; verified=$true; files=$receipt }
$report | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $targetRoot '저장검증.json') -Encoding UTF8
Write-Output ("Verified {0} files in {1}" -f $receipt.Count,$targetRoot)
