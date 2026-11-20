# =============================================================================
# CONFIG DE TESTE (edite aqui) — nao precisa de variavel de ambiente / admin
# =============================================================================
$ApiUrl        = 'https://leucaena.earth/ws/api/storage'
$Token         = 'lab-teste-cmq-2026'
$WorkstationId = 'cmq-baia-07'
$Bay           = ''
# Discos reportados (C, D e E — ignora letra se nao existir)
$DriveLetters  = @('C', 'D', 'E')
# No Render: Environment -> LAB_STORAGE_TOKEN = lab-teste-cmq-2026 (mesmo valor)
# Rodar: powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\lab\report-storage.ps1
# =============================================================================

$ErrorActionPreference = 'Stop'

function Get-DiskInfo([string]$Letter) {
  $id = ($Letter.ToUpper() + ':')
  # Win32_LogicalDisk pega C:/D:/E: de forma mais confiavel que Get-PSDrive
  $drive = Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DeviceID='$id'" -ErrorAction SilentlyContinue
  if (-not $drive) { return $null }
  $total = [int64]$drive.Size
  $free = [int64]$drive.FreeSpace
  if ($total -le 0) { return $null }
  return @{
    mount      = $id
    totalBytes = $total
    freeBytes  = $free
  }
}

$disks = @()
foreach ($letter in $DriveLetters) {
  $info = Get-DiskInfo $letter
  if ($info) {
    $disks += $info
    Write-Output ("  encontrado {0} total={1:N0} free={2:N0}" -f $info.mount, $info.totalBytes, $info.freeBytes)
  } else {
    Write-Output ("  (sem disco {0}:)" -f $letter.ToUpper())
  }
}

if ($disks.Count -eq 0) {
  Write-Error 'Nenhum disco C:, D: ou E: encontrado.'
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

Write-Output ("Enviando {0} disco(s) para {1} como {2} ..." -f $disks.Count, $ApiUrl, $WorkstationId)

try {
  $resp = Invoke-RestMethod -Method Post -Uri $ApiUrl -Headers $headers -Body $body -TimeoutSec 30
  Write-Output ("OK workstationId={0} disks={1}" -f $resp.workstationId, $resp.disks)
} catch {
  Write-Error $_
  exit 1
}
