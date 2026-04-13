# Modo de Manutenção e Bypass

## Visão geral

O modo de manutenção exibe uma página estática para todos os visitantes da
plataforma de mapeamento (`map.leucaena.earth` e hosts equivalentes), enquanto
a landing page (`leucaena.earth`) continua funcionando normalmente.

## Faixa de expansão (landing)

Durante a manutenção do mapa, a faixa com mensagem sobre expansão para todo o
Brasil e o **countdown** aparecem apenas em **`leucaena.earth`** (arquivo
`public/landing.html`), não no mapa — assim o anúncio continua visível quando
`map.leucaena.earth` está na página de manutenção.

O relógio usa a **mesma lógica** que a página de manutenção do mapa: contagem
regressiva até o fim do “dia” em referência UTC−3 (mesmo cálculo que em
`MAINTENANCE_HTML` em `server.js`). O texto da manutenção não menciona horário
fixo; a faixa da landing pode ser fechada (×) e fica oculta até limpar
`localStorage` (`leucena_landing_expansion_dismissed`).

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `MAINTENANCE_MODE` | `true`, `1` ou `yes` ativa a manutenção. Qualquer outro valor (ou ausência) desativa. |
| `MAINTENANCE_BYPASS_TOKEN` | Token secreto que permite acessar a plataforma durante a manutenção. Sem ele, o bypass fica desabilitado. |

## Como ativar a manutenção

1. No Render (ou `.env` local), defina `MAINTENANCE_MODE=true`.
2. Faça deploy (ou reinicie o servidor local).
3. `map.leucaena.earth` mostra a página de manutenção.
4. `leucaena.earth` (landing) continua acessível normalmente.

## Como acessar durante a manutenção (bypass)

### Pré-requisito

Defina `MAINTENANCE_BYPASS_TOKEN` no Render (e no `.env` local se quiser testar).
Exemplo: `MAINTENANCE_BYPASS_TOKEN=meuTokenSecreto123`

### Passo a passo

1. Acesse a plataforma adicionando `?bypass=SEU_TOKEN` na URL:
   ```
   https://map.leucaena.earth?bypass=meuTokenSecreto123
   ```
2. O servidor valida o token, seta um **cookie** (`maint_bypass`) no navegador e
   libera o acesso.
3. A partir daí, você navega normalmente (clica em células, abre painéis, dá F5)
   sem precisar repetir o `?bypass=...` — o cookie é enviado automaticamente.

### Duração do cookie

O cookie expira em **4 horas**. Após isso, basta acessar novamente com
`?bypass=SEU_TOKEN` para renovar.

### Como encerrar o bypass manualmente

- Limpe os cookies do site no navegador (DevTools → Application → Cookies).
- Ou simplesmente espere o cookie expirar.

## Como desativar a manutenção

1. No Render, defina `MAINTENANCE_MODE=false` (ou remova a variável).
2. Faça deploy / reinicie.
3. Todos os visitantes voltam a acessar a plataforma normalmente.
4. O bypass não interfere quando a manutenção está desativada.

## Segurança

- O token **nunca** fica no código — apenas nas variáveis de ambiente.
- O cookie é `httpOnly` (não acessível por JavaScript no navegador).
- Se `MAINTENANCE_BYPASS_TOKEN` não estiver definido, o bypass fica
  completamente desabilitado (nenhum token funciona).

## Rotas que passam mesmo durante a manutenção

Independente do bypass, as seguintes rotas **sempre** são liberadas:

- `/landing` e `/landing.html`
- `/api/*` (APIs)
- `/img/*`, `/css/*`, `/js/*`, `/fonts/*` (assets estáticos)

## Arquivo modificado

- `server.js` — middleware de manutenção (funções `parseCookies`,
  `hasMaintenanceBypass` e o `app.use` principal).
