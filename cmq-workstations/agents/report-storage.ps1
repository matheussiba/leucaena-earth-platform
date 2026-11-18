<#
.SYNOPSIS
  Reports C: and D: free/total space to the lab workstations platform.

.NOTES
  TEST MODE: values below are hardcoded so you do NOT need admin / env vars.
  On Render → Environment, add the SAME token:
    Key:   LAB_STORAGE_TOKEN
    Value: lab-teste-cmq-2026

  Run (no admin needed for the env vars):
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\lab\report-storage.ps1
#>

$ErrorActionPreference = 'Stop'

# ─── CONFIG EXPLICITA (teste) — edite aqui se precisar ───
$ApiUrl        = 'https://leucaena.earth/ws/api/storage'
$Token         = 'lab-teste-cmq-2026'
$WorkstationId = 'cmq-baia-07'   # << troque se for outra baia (ex: cmq-baia-04)
$Bay           = ''
# ─────────────────────────────────────────────────────────

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

Write-Output ("Enviando para {0} como {1} ..." -f $ApiUrl, $WorkstationId)

try {
  $resp = Invoke-RestMethod -Method Post -Uri $ApiUrl -Headers $headers -Body $body -TimeoutSec 30
  Write-Output ("OK workstationId={0} disks={1}" -f $resp.workstationId, $resp.disks)
} catch {
  Write-Error $_
  exit 1
}
