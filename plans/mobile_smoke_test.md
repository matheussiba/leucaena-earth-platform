# Smoke test mobile — Leucaena Earth Platform

Checklist rápido para validar a UX em dispositivos móveis após qualquer mudança no
front-end (Fase 10 do plano `implementacao_prioridades_seguranca_dados_2026.md`).
A meta é detectar regressões em < 10 minutos.

## Dispositivos / browsers de referência
Cubra pelo menos um de cada coluna em cada release significativo:

| Plataforma | Browser | Notas |
|---|---|---|
| Android 13+ | Chrome estável | maioria dos colaboradores |
| iOS 17+ | Safari | testar `100vh` quirks e `touch-action` |
| iPad / tablet | Safari ou Chrome | layout intermediário (max-width 768px ainda dispara) |

Se não houver dispositivo físico à mão, use Chrome DevTools → "Toggle device toolbar"
com pelo menos 3 viewports distintas: `iPhone 14 Pro` (390 × 844), `Pixel 7`
(412 × 915) e `iPad Mini` (768 × 1024). DevTools NÃO substitui dispositivo real
para validar `touch-action` e gestos.

## Pré-requisitos
- Conta de teste com permissão para desenhar polígonos.
- Pelo menos uma célula desbloqueada (não em uso por outro usuário).
- Modo escuro do sistema OFF (caso queira validar contraste padrão; alternar depois).

## Hit targets (≥ 44 × 44 CSS px)
Todos os botões abaixo devem ser facilmente tocáveis com o polegar (sem zoom). Em
caso de dúvida, ative o "Inspect element" e confira `getBoundingClientRect()`.

- [ ] Toolbar superior: cada `.tool-btn` ≥ 44 × 44.
- [ ] Top-right: ícones de notificações, inbox, idioma, perfil ≥ 44 × 44.
- [ ] Floating edit panel: Desenhar / Editar / Excluir / Buraco / Add Pontos /
      Remover Pontos / Street View / Desbloquear ≥ 44 × 44.
- [ ] Mapa direito: Zoom +, Home, Zoom − ≥ 44 × 44.
- [ ] Botão "Minha localização" ≥ 44 × 44.
- [ ] Botão "Usuários online" ≥ 44 × 44.
- [ ] Toggle de legenda ≥ 44 × 44.

## Fluxo: desenhar polígono
- [ ] Toque em "Desenhar". Cursor muda; toolbar mostra dica.
- [ ] Toque para adicionar 3+ vértices.
- [ ] **Botão "Desfazer" aparece** assim que existir 1+ vértice e fica em
      destaque amarelo (não pode passar despercebido).
- [ ] "Finalizar" aparece quando há ≥ 3 vértices.
- [ ] Toque em "Desfazer" remove o último vértice e atualiza o preview.
- [ ] Toque em "Finalizar" abre o modal de salvar polígono.
- [ ] Salvamento concluído sem erros visuais; o polígono aparece no mapa.

## Fluxo: editar polígono
- [ ] Toque em um polígono salvo → handles aparecem com tamanho confortável.
- [ ] Arrastar handle: feedback visual imediato, sem flicker.
- [ ] Botão "Salvar" no modal de edição é alcançável com o polegar (não fica
      atrás do teclado virtual).

## Fluxo: criar buraco
- [ ] Selecionar polígono existente, tocar em "Buraco".
- [ ] Adicionar 3+ vértices dentro do polígono.
- [ ] "Desfazer" e "Finalizar" funcionam como no fluxo de desenho.

## Fluxo: pontos individuais
- [ ] "Add Pontos" muda o cursor; toque adiciona ponto verde no centro do polígono.
- [ ] "Remover Pontos" remove ponto ao tocar nele.

## Sidebar e modais
- [ ] Abrir sidebar via toggle: o overlay aparece e bloqueia toques no mapa.
- [ ] Botão "Fechar" da sidebar é ≥ 44 × 44 e fecha o painel.
- [ ] Modais (perfil, ranking, ajuda) usam ≤ 95vw e têm botão de fechar visível.

## Performance / interação
- [ ] Pan/zoom do mapa permanece fluido (≥ 30 FPS) durante desenho.
- [ ] Sem "double-tap zoom" indesejado nos botões do toolbar (Apple Safari quirk).
- [ ] Heartbeat de lock continua funcionando ao colocar a aba em background por
      ~30 s e voltar (ver console em `chrome://inspect`).

## Acessibilidade rápida
- [ ] Aumentar fonte do sistema para 200 % (iOS) ou 150 % (Android): nada vaza
      para fora da viewport horizontalmente.
- [ ] Modo escuro do sistema: contraste do texto continua legível.

## Após o teste
- Reporte qualquer item falho como issue com tag `mobile-ux` e screenshot.
- Se um hit target ficou pequeno, prefira ajustar o bloco
  `Phase 10 — Mobile UX hardening` em `public/css/style.css` em vez de inline.
