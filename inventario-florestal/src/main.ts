// Ponto de entrada da aplicação - Plataforma Web de Inventário Florestal | ESALQ/USP — CMQ
import './index.css';
import { initApp } from './ui';

// Inicializar aplicação assim que o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  initApp().catch((err) => {
    console.error('Falha na inicialização do aplicativo:', err);
  });
});

// Tratamento de falhas e logs silenciosos para manter integridade
window.addEventListener('unhandledrejection', (event) => {
  console.warn('Alerta da aplicação:', event.reason);
});
