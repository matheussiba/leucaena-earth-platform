<#
.SYNOPSIS
  Reports C: and D: free/total space to the CMQ platform (daily via Task Scheduler).

.DESCRIPTION
  No Python required — uses built-in PowerShell on Windows lab PCs.
  Set env vars (or edit the defaults below), then schedule daily:

    schtasks /Create /TN "CMQ Storage Report" /SC DAILY /ST 08:00 ^
      /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\cmq\report-storage.ps1" ^
      /RU SYSTEM

.ENVIRONMENT
  CMQ_STORAGE_URL   - e.g. https://cmq.leucaena.earth/cmq/api/storage
  CMQ_STORAGE_TOKEN - same value as server env CMQ_STORAGE_TOKEN
  CMQ_WORKSTATION_ID - optional, e.g. ws-baia-04 (preferred match)
  CMQ_BAY           - optional fallback, e.g. 4 or IGC
#>

$ErrorActionPreference = 'Stop'

$ApiUrl = if ($env:CMQ_STORAGE_URL) { $env:CMQ_STORAGE_URL } else { 'https://YOUR-HOST/cmq/api/storage' }
$Token = if ($env:CMQ_STORAGE_TOKEN) { $env:CMQ_STORAGE_TOKEN } else { 'CHANGE_ME' }
$WorkstationId = if ($env:CMQ_WORKSTATION_ID) { $env:CMQ_WORKSTATION_ID } else { '' }
$Bay = if ($env:CMQ_BAY) { $env:CMQ_BAY } else { '' }

function Get-DiskInfo([string]$Letter) {
  $drive = Get-PSDrive -Name $Letter -ErrorAction SilentlyContinue
  if (-not $drive) { return $null }
  # Used + Free ≈ total for fixed drives
  $free = [int64]$drive.Free
  $used = [int64]$drive.Used
  $total = $free + $used
  if ($total -le 0) { return $null }
  return @{
    mount      = ($Letter.ToUpper() + ':')
    totalBytes = $total
    freeBytes  = $free
  }
}

$disks = @()
foreach ($letter in @('C', 'D')) {
  $info = Get-DiskInfo $letter
  if ($info) { $disks += $info }
}

if ($disks.Count -eq 0) {
  Write-Error 'No C: or D: drive found.'
  exit 1
}

# Best-effort local IPv4 (non-loopback)
$ip = (
  Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } |
  Select-Object -First 1 -ExpandProperty IPAddress
)

$body = @{
  workstationId = $WorkstationId
  bay           = $Bay
  hostname      = $env:COMPUTERNAME
  ip            = $ip
  collectedAt   = (Get-Date).ToUniversalTime().ToString('o')
  disks         = $disks
} | ConvertTo-Json -Depth 5

$headers = @{
  'Content-Type'         = 'application/json'
  'X-CMQ-Storage-Token'  = $Token
}

try {
  $resp = Invoke-RestMethod -Method Post -Uri $ApiUrl -Headers $headers -Body $body -TimeoutSec 30
  Write-Output ("OK workstationId={0} disks={1}" -f $resp.workstationId, $resp.disks)
} catch {
  Write-Error $_
  exit 1
}
