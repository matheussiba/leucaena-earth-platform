<#
.SYNOPSIS
  Reports C: and D: free/total space to the lab workstations platform (daily via Task Scheduler).

.DESCRIPTION
  No Python required — uses built-in PowerShell on Windows lab PCs.

  Workstation id format (lowercase):
    <laboratorio>-baia-<codigo>
    Examples: cmq-baia-04, cmq-baia-07, cmq-baia-igc, cepe-geo-baia-01

  Schedule (run once as admin on each PC):

    schtasks /Create /TN "Lab Storage Report" /SC DAILY /ST 08:00 ^
      /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\lab\report-storage.ps1" ^
      /RU SYSTEM

.ENVIRONMENT
  LAB_STORAGE_URL      - e.g. https://leucaena.earth/ws/api/storage
  LAB_STORAGE_TOKEN    - same value as server env LAB_STORAGE_TOKEN
  LAB_WORKSTATION_ID   - e.g. cmq-baia-04 (preferred)
  LAB_BAY              - optional fallback, e.g. 4 or IGC
#>

$ErrorActionPreference = 'Stop'

$ApiUrl = if ($env:LAB_STORAGE_URL) { $env:LAB_STORAGE_URL } else { 'https://YOUR-HOST/ws/api/storage' }
$Token = if ($env:LAB_STORAGE_TOKEN) { $env:LAB_STORAGE_TOKEN } else { 'CHANGE_ME' }
$WorkstationId = if ($env:LAB_WORKSTATION_ID) { $env:LAB_WORKSTATION_ID } else { '' }
$Bay = if ($env:LAB_BAY) { $env:LAB_BAY } else { '' }

function Get-DiskInfo([string]$Letter) {
  $drive = Get-PSDrive -Name $Letter -ErrorAction SilentlyContinue
  if (-not $drive) { return $null }
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
  'Content-Type'        = 'application/json'
  'X-Lab-Storage-Token' = $Token
}

try {
  $resp = Invoke-RestMethod -Method Post -Uri $ApiUrl -Headers $headers -Body $body -TimeoutSec 30
  Write-Output ("OK workstationId={0} disks={1}" -f $resp.workstationId, $resp.disks)
} catch {
  Write-Error $_
  exit 1
}
