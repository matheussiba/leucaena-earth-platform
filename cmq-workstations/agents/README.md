# Lab storage agent (Windows)

Script PowerShell que envia o espaço livre/total de `C:`, `D:` e `E:` para o site (`/ws/api/storage`).

O arquivo com token (`report-storage.ps1`) **não vai pro Git**. Use o sample:

```powershell
cd cmq-workstations\agents
copy report-storage.ps1.sample report-storage.ps1
# edite $Token e $WorkstationId em report-storage.ps1
```

## No servidor (site / Render)

1. Defina `LAB_STORAGE_TOKEN` (segredo longo, aleatório) no ambiente do app.
2. Reinicie o serviço.
3. Confirme que a WS existe no painel com o id certo, ex.: `cmq-baia-07` (Gerenciar Baias).
4. Endpoint de POST (sem Basic Auth; usa o token do agent):
   - `https://leucaena.earth/ws/api/storage`
   - ou `https://leucaena.earth/cmq/api/storage`

## Em cada máquina do lab (ex.: cmq-baia-07)

1. Copie `report-storage.ps1.sample` → `report-storage.ps1` (ou para `C:\lab\report-storage.ps1`).
2. Edite no topo: `$Token` (igual ao Render) e `$WorkstationId` (ex. `cmq-baia-07`).
3. Teste:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\lab\report-storage.ps1
```

Saída esperada: `OK workstationId=cmq-baia-07 disks=3` (ou menos se alguma letra não existir).

4. Agende diário (como Admin):

```bat
schtasks /Create /TN "Lab Storage Report" /SC DAILY /ST 08:00 /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\lab\report-storage.ps1" /RU SYSTEM
```

5. No site, recarregue o cronograma: na célula da baia aparece utilizado/total (%). Clique na foto para ver o detalhe no modal.

## Notas

- O id deve bater com o cadastro: `cmq-baia-07`, `cmq-baia-04`, `cmq-baia-igc`, `cepe-geo-baia-01`, etc.
- Token errado → HTTP 401. Token ausente no servidor → HTTP 503.
