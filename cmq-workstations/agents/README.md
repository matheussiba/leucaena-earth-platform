# Lab storage agent (Windows)

Script PowerShell que envia o espaço livre/total de `C:` e `D:` para o site (`/ws/api/storage`).

## No servidor (site / Render)

1. Defina `LAB_STORAGE_TOKEN` (segredo longo, aleatório) no ambiente do app.
2. Reinicie o serviço.
3. Confirme que a WS existe no painel com o id certo, ex.: `cmq-baia-07` (Gerenciar Baias).
4. Endpoint de POST (sem Basic Auth; usa o token do agent):
   - `https://leucaena.earth/ws/api/storage`
   - ou `https://leucaena.earth/cmq/api/storage`

## Em cada máquina do lab (ex.: cmq-baia-07)

1. Crie a pasta `C:\lab` e copie `report-storage.ps1` para lá.
2. Defina variáveis de ambiente **do sistema** (Win+R → `sysdm.cpl` → Avançado → Variáveis de Ambiente → Sistema):

| Variável | Exemplo |
|---|---|
| `LAB_STORAGE_URL` | `https://leucaena.earth/ws/api/storage` |
| `LAB_STORAGE_TOKEN` | o mesmo valor do servidor |
| `LAB_WORKSTATION_ID` | `cmq-baia-07` |

3. Abra PowerShell **como Administrador** e teste:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\lab\report-storage.ps1
```

Saída esperada: `OK workstationId=cmq-baia-07 disks=1` (ou `2` se houver D:).

4. Agende diário (como Admin):

```bat
schtasks /Create /TN "Lab Storage Report" /SC DAILY /ST 08:00 /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\lab\report-storage.ps1" /RU SYSTEM
```

5. No site, recarregue o cronograma: na célula da baia aparece `C livre/total` (ex. `C 120/476 GB`). Clique na foto para ver o detalhe no modal.

## Notas

- O id deve bater com o cadastro: `cmq-baia-07`, `cmq-baia-04`, `cepe-geo-baia-01`, etc.
- Alternativa: em vez de `LAB_WORKSTATION_ID`, o agent pode enviar só `LAB_BAY=7` se o IP da máquina estiver cadastrado, mas o id explícito é o mais confiável.
- Token errado → HTTP 401. Token ausente no servidor → HTTP 503.
