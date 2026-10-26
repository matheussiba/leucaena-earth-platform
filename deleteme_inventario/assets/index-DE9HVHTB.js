(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=Math.PI;function t(t){return t==null||isNaN(t)||t<=0?null:t/e}function n(t){return t==null||isNaN(t)||t<=0?null:t**2/(4e4*e)}function r(t,n){return isNaN(n)||n<=0?0:t===`raio`?e*n**2:e*n**2/4}function i(e,t){return isNaN(e)||e<=0||isNaN(t)||t<=0?0:e*t}function a(e){return isNaN(e)||e<=0?0:e/1e4}function o(e){let r=e.cap;if(r==null||r===``)return{status:`incompleta`,motivo:`CAP não informado (árvore registrada para identificação posterior)`,cap:null,dap:null,g:null};let i=Number(r);return isNaN(i)?{status:`invalida`,motivo:`Valor de CAP não é um número válido`,cap:null,dap:null,g:null}:i<=0?{status:`invalida`,motivo:`CAP deve ser estritamente maior que zero`,cap:null,dap:null,g:null}:{status:`valida`,cap:i,dap:t(i),g:n(i)}}function s(e){let t=e.length;if(t===0)return null;let n=[...e].sort((e,t)=>e-t);if(t%2!=0)return n[Math.floor(t/2)];{let e=t/2;return(n[e-1]+n[e])/2}}function c(e,t){let n=t.length,r=t.filter(e=>e.status===`valida`&&e.dap!==null&&e.g!==null),i=r.length,o=n-i,c=new Set;t.forEach(e=>{let t=e.especie?.trim();t&&c.add(t)});let l=c.size,u=e.areaM2||0,d=e.areaHa||a(u);if(i===0)return{totalArvores:n,arvoresValidas:0,arvoresIncompletas:o,totalEspecies:l,capMedio:null,dapMedio:null,dapMediano:null,dapVariancia:null,dapDesvioPadrao:null,dapMinimo:null,dapMaximo:null,areaBasalTotal:0,areaBasalPorHectare:0,areaM2:u,areaHa:d};let f=r.map(e=>e.cap),p=r.map(e=>e.dap),m=r.map(e=>e.g),h=f.reduce((e,t)=>e+t,0),g=p.reduce((e,t)=>e+t,0),_=h/i,v=g/i,y=s(p),b=null,x=null;i>=2&&(b=p.reduce((e,t)=>e+(t-v)**2,0)/(i-1),x=Math.sqrt(b));let S=Math.min(...p),C=Math.max(...p),w=m.reduce((e,t)=>e+t,0),T=d>0?w/d:null;return{totalArvores:n,arvoresValidas:i,arvoresIncompletas:o,totalEspecies:l,capMedio:_,dapMedio:v,dapMediano:y,dapVariancia:b,dapDesvioPadrao:x,dapMinimo:S,dapMaximo:C,areaBasalTotal:w,areaBasalPorHectare:T,areaM2:u,areaHa:d}}function l(e,t){let n=t.filter(e=>e.status===`valida`&&e.dap!==null&&e.g!==null),r=e.areaHa||a(e.areaM2||0),i={};n.forEach(e=>{let t=e.especie&&e.especie.trim()!==``?e.especie.trim():`Não identificada`,n=t.toLowerCase();i[n]||(i[n]={nomeOriginal:t,daps:[],gs:[]}),i[n].daps.push(e.dap),i[n].gs.push(e.g)});let o=n.reduce((e,t)=>e+t.g,0);return Object.keys(i).map(e=>{let t=i[e],n=t.daps.length,a=t.daps.reduce((e,t)=>e+t,0)/n,c=s(t.daps),l=null,u=null;n>=2&&(l=t.daps.reduce((e,t)=>e+(t-a)**2,0)/(n-1),u=Math.sqrt(l));let d=t.gs.reduce((e,t)=>e+t,0),f=r>0?d/r:null,p=o>0?d/o*100:0;return{especie:t.nomeOriginal,arvoresValidas:n,dapMedio:a,dapMediano:c,dapVariancia:l,dapDesvioPadrao:u,areaBasalTotal:d,areaBasalPorHectare:f,proporcaoAreaBasal:p}}).sort((e,t)=>t.areaBasalTotal-e.areaBasalTotal)}function u(e,t){let n=0,r=0,i=0,o=0,s=new Set,l=[],u=[],d={};e.forEach(e=>{let a=t[e.id]||[],f=c(e,a);n+=f.totalArvores,r+=f.arvoresValidas,i+=e.areaM2||0,o+=f.areaBasalTotal,a.forEach(e=>{let t=e.especie?.trim();if(t){s.add(t);let n=t.toLowerCase();d[n]||(d[n]={nomeOriginal:t,validas:0,gTotal:0}),e.status===`valida`&&e.g!==null&&(d[n].validas+=1,d[n].gTotal+=e.g,l.push(e.dap))}else e.status===`valida`&&e.dap!==null&&l.push(e.dap)}),u.push({parcelaId:e.id,codigo:e.codigo,nome:e.nome,inventariante:e.inventariante,formato:e.formato,areaM2:e.areaM2,areaHa:e.areaHa,totalArvores:f.totalArvores,arvoresValidas:f.arvoresValidas,dapMedio:f.dapMedio,areaBasalTotal:f.areaBasalTotal,areaBasalPorHectare:f.areaBasalPorHectare,status:e.status})});let f=a(i),p=l.length>0?l.reduce((e,t)=>e+t,0)/l.length:null,m=u.filter(e=>e.areaBasalPorHectare!==null),h=m.length>0?m.reduce((e,t)=>e+t.areaBasalPorHectare,0)/m.length:null,g=f>0?o/f:null,_=Object.keys(d).map(e=>{let t=d[e],n=o>0?t.gTotal/o*100:0;return{especie:t.nomeOriginal,arvoresValidas:t.validas,areaBasalTotal:t.gTotal,proporcao:n}}).sort((e,t)=>t.areaBasalTotal-e.areaBasalTotal);return{totalParcelas:e.length,totalArvores:n,totalArvoresValidas:r,totalEspecies:s.size,areaTotalAmostradaM2:i,areaTotalAmostradaHa:f,somaAreasBasais:o,dapMedioGeral:p,mediaAritmeticaGha:h,mediaPonderadaGha:g,parcelasResumo:u,distribuicaoEspecies:_}}function d(e,t=2,n=``){return e==null||isNaN(e)?`—`:e.toLocaleString(`pt-BR`,{minimumFractionDigits:t,maximumFractionDigits:t})+n}var f=`/inventario/api/state`,p=null,m=null,h=Promise.resolve();async function g(){return p||(m||=(async()=>{let e=await fetch(f,{cache:`no-store`});if(!e.ok)throw Error(`inventario load `+e.status);let t=await e.json();p={inventarios:Array.isArray(t.inventarios)?t.inventarios:[],grupos:Array.isArray(t.grupos)?t.grupos:[],parcelas:Array.isArray(t.parcelas)?t.parcelas:[],arvores:Array.isArray(t.arvores)?t.arvores:[],activityLog:Array.isArray(t.activityLog)?t.activityLog:[]}})(),await m,p)}function _(){if(!p)return Promise.resolve();let e={inventarios:p.inventarios,grupos:p.grupos,parcelas:p.parcelas,arvores:p.arvores,activityLog:p.activityLog};return h=h.then(async()=>{let t=await fetch(f,{method:`PUT`,headers:{"Content-Type":`application/json`},body:JSON.stringify(e)});if(!t.ok)throw Error(`inventario save `+t.status)}),h}function v(e,t){let n=e.findIndex(e=>e.id===t.id);if(n>=0){let r=e.slice();return r[n]=t,r}return[...e,t]}function y(e){p&&(p.activityLog=[...p.activityLog,{...e,ts:new Date().toISOString()}].slice(-8e3))}function b(e){return JSON.parse(JSON.stringify(e))}async function x(){return(await g()).inventarios.slice().sort((e,t)=>new Date(t.atualizadoEm||t.criadoEm).getTime()-new Date(e.atualizadoEm||e.criadoEm).getTime())}async function S(e){return(await g()).inventarios.find(t=>t.id===e)||null}async function C(e){let t=await g();return e.atualizadoEm=new Date().toISOString(),t.inventarios=v(t.inventarios,e),y({op:`save`,entity:`inventario`,id:e.id,label:e.nome||e.id,data:b(e)}),await _(),e}async function w(e){let t=await g(),n=t.inventarios.find(t=>t.id===e)||null,r=t.grupos.filter(t=>t.inventarioId===e),i=t.parcelas.filter(t=>t.inventarioId===e),a=new Set(i.map(e=>e.id)),o=t.arvores.filter(t=>t.inventarioId===e||a.has(t.parcelaId));t.inventarios=t.inventarios.filter(t=>t.id!==e),t.grupos=t.grupos.filter(t=>t.inventarioId!==e),t.parcelas=t.parcelas.filter(t=>t.inventarioId!==e),t.arvores=t.arvores.filter(t=>t.inventarioId!==e&&!a.has(t.parcelaId)),y({op:`delete`,entity:`inventario`,id:e,label:n?.nome||e,data:{inventario:n,grupos:r,parcelas:i,arvores:o}}),await _()}async function T(e){return(await g()).grupos.filter(t=>t.inventarioId===e).slice().sort((e,t)=>e.nome.localeCompare(t.nome,void 0,{numeric:!0}))}async function E(e){return(await g()).grupos.find(t=>t.id===e)||null}async function D(e){let t=await g();return e.atualizadoEm=new Date().toISOString(),t.grupos=v(t.grupos,e),y({op:`save`,entity:`grupo`,id:e.id,label:e.nome||e.id,data:b(e)}),await _(),e}async function O(e){let t=await g(),n=t.grupos.find(t=>t.id===e)||null,r=t.parcelas.filter(t=>t.grupoId===e),i=new Set(r.map(e=>e.id)),a=t.arvores.filter(e=>i.has(e.parcelaId));t.grupos=t.grupos.filter(t=>t.id!==e),t.parcelas=t.parcelas.filter(t=>t.grupoId!==e),t.arvores=t.arvores.filter(e=>!i.has(e.parcelaId)),y({op:`delete`,entity:`grupo`,id:e,label:n?.nome||e,data:{grupo:n,parcelas:r,arvores:a}}),await _()}async function k(e){return(await g()).parcelas.filter(t=>t.inventarioId===e).slice().sort((e,t)=>e.codigo.localeCompare(t.codigo,void 0,{numeric:!0,sensitivity:`base`}))}async function A(e){return(await g()).parcelas.filter(t=>t.grupoId===e).slice().sort((e,t)=>e.codigo.localeCompare(t.codigo,void 0,{numeric:!0,sensitivity:`base`}))}async function j(e){return(await g()).parcelas.find(t=>t.id===e)||null}async function M(e){let t=await g();return e.atualizadoEm=new Date().toISOString(),t.parcelas=v(t.parcelas,e),y({op:`save`,entity:`parcela`,id:e.id,label:e.codigo||e.id,data:b(e)}),await _(),e}async function N(e){let t=await g(),n=t.parcelas.find(t=>t.id===e)||null,r=t.arvores.filter(t=>t.parcelaId===e);t.parcelas=t.parcelas.filter(t=>t.id!==e),t.arvores=t.arvores.filter(t=>t.parcelaId!==e),y({op:`delete`,entity:`parcela`,id:e,label:n?.codigo||e,data:{parcela:n,arvores:r}}),await _()}async function P(e){return(await g()).arvores.filter(t=>t.parcelaId===e).slice().sort((e,t)=>{let n=Number(e.numero),r=Number(t.numero);return!isNaN(n)&&!isNaN(r)?n-r:String(e.numero).localeCompare(String(t.numero),void 0,{numeric:!0})})}async function F(e){return(await g()).arvores.filter(t=>t.inventarioId===e)}async function I(e){let t=await g();return e.atualizadoEm=new Date().toISOString(),t.arvores=v(t.arvores,e),y({op:`save`,entity:`arvore`,id:e.id,label:`#${e.numero} ${e.especie||``}`.trim(),data:b(e)}),await _(),e}async function ee(e){let t=await g(),n=t.arvores.find(t=>t.id===e)||null;t.arvores=t.arvores.filter(t=>t.id!==e),y({op:`delete`,entity:`arvore`,id:e,label:n?`#${n.numero}`:e,data:{arvore:n}}),await _()}async function L(){return(await g()).activityLog.slice()}async function R(){let e=await L(),t=[`Inventario Florestal ESALQ/USP — registro de atividades`,`Gerado em: ${new Date().toISOString()}`,`Total de eventos: ${e.length}`,``];for(let n of e)t.push(`[${n.ts}] ${n.op.toUpperCase()} ${n.entity} ${n.id} | ${n.label}`),n.data!==void 0&&t.push(JSON.stringify(n.data)),t.push(`---`);return t.join(`
`)}async function z(){let e=await g();return{versao:`2.0.0`,geradoEm:new Date().toISOString(),instituicao:`ESALQ/USP — Centro de Métodos Quantitativos (CMQ)`,inventarios:e.inventarios.slice(),grupos:e.grupos.slice(),parcelas:e.parcelas.slice(),arvores:e.arvores.slice()}}async function B(e,t=`mesclar`){let n=await g();if(!e.inventarios||!Array.isArray(e.inventarios))throw Error(`Arquivo de backup inválido: lista de inventários ausente ou corrompida.`);t===`substituir`&&(n.inventarios=[],n.grupos=[],n.parcelas=[],n.arvores=[]);for(let t of e.inventarios)n.inventarios=v(n.inventarios,t);if(Array.isArray(e.grupos))for(let t of e.grupos)n.grupos=v(n.grupos,t);if(Array.isArray(e.parcelas))for(let t of e.parcelas)n.parcelas=v(n.parcelas,t);if(Array.isArray(e.arvores))for(let t of e.arvores)n.arvores=v(n.arvores,t);return y({op:`save`,entity:`inventario`,id:`backup-import`,label:`Importação de backup (${t})`,data:{totalInventarios:e.inventarios.length,totalGrupos:e.grupos?.length||0,totalParcelas:e.parcelas?.length||0,totalArvores:e.arvores?.length||0}}),await _(),{totalInventarios:e.inventarios.length,totalGrupos:e.grupos?.length||0,totalParcelas:e.parcelas?.length||0,totalArvores:e.arvores?.length||0}}function V(e,t){if(e==null)return``;let n=String(e);return(n.includes(t)||n.includes(`"`)||n.includes(`
`)||n.includes(`\r`))&&(n=`"`+n.replace(/"/g,`""`)+`"`),n}function H(e,t,n=6){if(e==null||isNaN(e))return``;let r=Number(e.toFixed(n)).toString();return t===`;`?r.replace(`.`,`,`):r}function U(e,t,n){let r=new Blob([e],{type:n}),i=URL.createObjectURL(r),a=document.createElement(`a`);a.href=i,a.download=t,document.body.appendChild(a),a.click(),setTimeout(()=>{document.body.removeChild(a),URL.revokeObjectURL(i)},100)}function te(e,t,n,r=`;`){let i=new Map;e.forEach(e=>i.set(e.id,e));let a=new Map;t.forEach(e=>a.set(e.id,e));let o=[`ID_Inventario.Nome_Inventario.Disciplina.Professores.Monitor.Turma_Grupo.Data_Inventario.ID_Parcela.Codigo_Parcela.Nome_Parcela.Inventariante_Parcela.Formato_Parcela.Dimensoes_Descricao.Area_Parcela_m2.Area_Parcela_ha.Status_Parcela.ID_Arvore.Numero_Arvore.Especie.CAP_cm.DAP_cm.Area_Transversal_g_m2.Status_Medicao.Motivo_Invalido.Observacoes_Arvore.Coord_Tipo.Latitude.Longitude.Altitude_H_m.Precisao_GPS_m.DataHora_GPS`.split(`.`).join(r)];return n.forEach(e=>{let t=a.get(e.parcelaId),n=i.get(e.inventarioId),s=``,c=`nao_informado`,l=``,u=``,d=``,f=``,p=``;if(t&&(s=t.dimensoes.tipo===`circular`?`${t.dimensoes.tipoEntrada}=${t.dimensoes.valorOriginal}m`:`${t.dimensoes.comprimento}x${t.dimensoes.largura}m`,t.coordenadas)){c=t.coordenadas.tipo;let e=t.coordenadas.centro||t.coordenadas.cantos&&t.coordenadas.cantos[0];e&&(l=H(e.latitude,r,7),u=H(e.longitude,r,7),d=H(e.manualAltitude??e.altitude,r,2),f=H(e.precisao,r,1),p=e.dataHora||``)}let m=[V(n?.id||e.inventarioId,r),V(n?.nome||``,r),V(n?.disciplina||`LCF0510 - Inventário Florestal`,r),V(n?.professores||`Matheus Pinheiro Ferreira e Jonathan Trautenmüller`,r),V(n?.monitor||`Matheus Siqueira Barros`,r),V(n?.turma||``,r),V(n?.data||``,r),V(t?.id||e.parcelaId,r),V(t?.codigo||``,r),V(t?.nome||``,r),V(t?.inventariante||``,r),V(t?.formato||``,r),V(s,r),H(t?.areaM2,r,2),H(t?.areaHa,r,4),V(t?.status||``,r),V(e.id,r),V(e.numero,r),V(e.especie||`Não identificada`,r),H(e.cap,r,2),H(e.dap,r,4),H(e.g,r,6),V(e.status,r),V(e.motivoInvalido||``,r),V(e.observacoes||``,r),V(c,r),l,u,d,f,V(p,r)];o.push(m.join(r))}),`﻿`+o.join(`\r
`)}function W(e,t,n,r=`;`){let i=new Map;e.forEach(e=>i.set(e.id,e));let a=[`ID_Inventario.Nome_Inventario.Disciplina.Professores.Monitor.Turma_Grupo.ID_Parcela.Codigo_Parcela.Nome_Parcela.Inventariante_Parcela.Formato.Dimensoes.Area_m2.Area_ha.Total_Arvores_Cadastradas.Arvores_Validas_n.Arvores_Incompletas.Total_Especies.CAP_Medio_cm.DAP_Medio_cm.DAP_Mediano_cm.DAP_Variancia_Amostral_cm2.DAP_Desvio_Padrao_Amostral_cm.DAP_Minimo_cm.DAP_Maximo_cm.Area_Basal_Total_G_m2.Area_Basal_Por_Hectare_Gha_m2_ha.Status_Parcela.Data_Coleta`.split(`.`).join(r)];return t.forEach(e=>{let t=i.get(e.inventarioId),o=c(e,n.filter(t=>t.parcelaId===e.id)),s=``;s=e.dimensoes.tipo===`circular`?`${e.dimensoes.tipoEntrada}=${e.dimensoes.valorOriginal}m`:`${e.dimensoes.comprimento}x${e.dimensoes.largura}m`;let l=[V(t?.id||e.inventarioId,r),V(t?.nome||``,r),V(t?.disciplina||`LCF0510 - Inventário Florestal`,r),V(t?.professores||`Matheus Pinheiro Ferreira e Jonathan Trautenmüller`,r),V(t?.monitor||`Matheus Siqueira Barros`,r),V(t?.turma||``,r),V(e.id,r),V(e.codigo,r),V(e.nome||``,r),V(e.inventariante||``,r),V(e.formato,r),V(s,r),H(o.areaM2,r,2),H(o.areaHa,r,4),o.totalArvores.toString(),o.arvoresValidas.toString(),o.arvoresIncompletas.toString(),o.totalEspecies.toString(),H(o.capMedio,r,2),H(o.dapMedio,r,3),H(o.dapMediano,r,3),H(o.dapVariancia,r,4),H(o.dapDesvioPadrao,r,3),H(o.dapMinimo,r,2),H(o.dapMaximo,r,2),H(o.areaBasalTotal,r,6),H(o.areaBasalPorHectare,r,4),V(e.status,r),V(e.data||``,r)];a.push(l.join(r))}),`﻿`+a.join(`\r
`)}function ne(e,t,n=`;`){let r=[[`ID_Parcela`,`Codigo_Parcela`,`Nome_Parcela`,`Inventariante_Parcela`,`Area_Parcela_ha`,`Especie`,`Arvores_Validas_n`,`DAP_Medio_cm`,`DAP_Mediano_cm`,`DAP_Variancia_Amostral_cm2`,`DAP_Desvio_Padrao_Amostral_cm`,`Area_Basal_Especie_G_m2`,`Area_Basal_Por_Hectare_Gha_m2_ha`,`Proporcao_Area_Basal_Pct`].join(n)];return e.forEach(e=>{l(e,t.filter(t=>t.parcelaId===e.id)).forEach(t=>{let i=[V(e.id,n),V(e.codigo,n),V(e.nome||``,n),V(e.inventariante||``,n),H(e.areaHa,n,4),V(t.especie,n),t.arvoresValidas.toString(),H(t.dapMedio,n,3),H(t.dapMediano,n,3),H(t.dapVariancia,n,4),H(t.dapDesvioPadrao,n,3),H(t.areaBasalTotal,n,6),H(t.areaBasalPorHectare,n,4),H(t.proporcaoAreaBasal,n,2)];r.push(i.join(n))})}),`﻿`+r.join(`\r
`)}function re(e,t,n,r,i=`;`){let a=new Map;n.forEach(e=>a.set(e.id,e));let o=[`ID_Inventario.Nome_Inventario.Disciplina.Professores.Monitor.Turma.ID_Grupo.Nome_Grupo.Integrantes_Grupo.ID_Parcela.Codigo_Parcela.Nome_Parcela.Inventariante_Parcela.Formato_Parcela.Dimensoes_Descricao.Area_Parcela_m2.Area_Parcela_ha.Status_Parcela.ID_Arvore.Numero_Arvore.Especie.CAP_cm.DAP_cm.Area_Transversal_g_m2.Status_Medicao.Motivo_Invalido.Observacoes_Arvore.Coord_Tipo.Latitude.Longitude.Altitude_H_m.Precisao_GPS_m.DataHora_GPS`.split(`.`).join(i)];return r.filter(e=>a.has(e.parcelaId)).forEach(n=>{let r=a.get(n.parcelaId),s=``,c=`nao_informado`,l=``,u=``,d=``,f=``,p=``;if(r&&(s=r.dimensoes.tipo===`circular`?`${r.dimensoes.tipoEntrada}=${r.dimensoes.valorOriginal}m`:`${r.dimensoes.comprimento}x${r.dimensoes.largura}m`,r.coordenadas)){c=r.coordenadas.tipo;let e=r.coordenadas.centro||r.coordenadas.cantos&&r.coordenadas.cantos[0];e&&(l=H(e.latitude,i,7),u=H(e.longitude,i,7),d=H(e.manualAltitude??e.altitude,i,2),f=H(e.precisao,i,1),p=e.dataHora||``)}let m=[V(e.id,i),V(e.nome,i),V(e.disciplina||`LCF0510 - Inventário Florestal`,i),V(e.professores||`Matheus Pinheiro Ferreira e Jonathan Trautenmüller`,i),V(e.monitor||`Matheus Siqueira Barros`,i),V(e.turma||``,i),V(t.id,i),V(t.nome,i),V(t.integrantes,i),V(r?.id||n.parcelaId,i),V(r?.codigo||``,i),V(r?.nome||``,i),V(r?.inventariante||``,i),V(r?.formato||``,i),V(s,i),H(r?.areaM2,i,2),H(r?.areaHa,i,4),V(r?.status||``,i),V(n.id,i),V(n.numero,i),V(n.especie||`Não identificada`,i),H(n.cap,i,2),H(n.dap,i,4),H(n.g,i,6),V(n.status,i),V(n.motivoInvalido||``,i),V(n.observacoes||``,i),V(c,i),l,u,d,f,V(p,i)];o.push(m.join(i))}),`﻿`+o.join(`\r
`)}async function ie(e=`Ponto de Coleta`){return navigator.geolocation?window.isSecureContext===!1?{sucesso:!1,mensagemErro:`Acesso ao GPS requer contexto seguro (HTTPS). No campo, certifique-se de acessar via HTTPS ou informe as coordenadas manualmente.`}:new Promise(t=>{navigator.geolocation.getCurrentPosition(n=>{let r=n.coords;t({sucesso:!0,ponto:{latitude:r.latitude,longitude:r.longitude,altitude:r.altitude===null?null:r.altitude,precisao:r.accuracy===null?null:r.accuracy,dataHora:new Date(n.timestamp).toISOString(),rotulo:e}})},e=>{let n=`Erro ao obter sinal de satélite.`;switch(e.code){case e.PERMISSION_DENIED:n=`Permissão de localização negada pelo usuário. Conceda permissão no navegador ou insira manualmente.`;break;case e.POSITION_UNAVAILABLE:n=`Sinal de GPS indisponível no momento. Sob dossel florestal denso, aguarde alguns instantes a céu aberto ou insira manualmente.`;break;case e.TIMEOUT:n=`Tempo limite esgotado ao buscar sinal de GPS. Tente novamente em área mais aberta.`}t({sucesso:!1,mensagemErro:n,codigoErro:e.code})},{enableHighAccuracy:!0,timeout:2e4,maximumAge:5e3})}):{sucesso:!1,mensagemErro:`A API de Geolocalização não é suportada por este navegador. Você pode inserir as coordenadas manualmente.`}}function G(e,t){let n=e>=0?`N`:`S`,r=t>=0?`E`:`W`;return`${Math.abs(e).toFixed(6)}° ${n}, ${Math.abs(t).toFixed(6)}° ${r}`}function ae(e){return e?!!(e.tipo===`centro`&&e.centro||e.tipo===`cantos`&&e.cantos&&e.cantos.length>0||e.tipo===`manual`&&(e.centro||e.cantos&&e.cantos.length>0)):!1}function oe(){let u=[];function d(e,t,n,r,i,a){u.push({numero:e,nome:t,descricao:n,passou:r,detalhes:r?`Verificação matemática/lógica bem-sucedida.`:`Divergência detectada. Esperado: ${i}; Obtido: ${a}`,esperado:i,obtido:a})}let f=31.41592653589793,p=t(f);d(1,`Cálculo de DAP a partir de CAP`,`DAP = CAP / π. Para CAP = 10π, DAP deve ser exatamente 10.0 cm.`,p!==null&&Math.abs(p-10)<1e-9,`10.0000 cm`,p?.toFixed(4)+` cm`);let m=n(f),h=e/400;d(2,`Cálculo de Área Transversal Individual (g)`,`g = CAP² / (40.000 × π). Para DAP=10cm, g = π/400 ≈ 0.00785398 m².`,m!==null&&Math.abs(m-h)<1e-9,h.toFixed(8)+` m²`,m?.toFixed(8)+` m²`);let g=r(`raio`,10),_=r(`diametro`,20);d(3,`Área de Parcelas Circulares (Raio e Diâmetro)`,`Raio=10m e Diâmetro=20m devem produzir áreas idênticas (π × r² = π × d² / 4).`,Math.abs(g-_)<1e-9&&Math.abs(g-100*e)<1e-9,(100*e).toFixed(4)+` m²`,`Raio: ${g.toFixed(4)}, Diâmetro: ${_.toFixed(4)}`);let v=i(25,20);d(4,`Área de Parcelas Retangulares`,`Área = Comprimento × Largura. 25m × 20m = 500 m².`,v===500,`500.00 m²`,v.toFixed(2)+` m²`);let y=a(500);d(5,`Conversão de m² para Hectares`,`1 ha = 10.000 m². 500 m² deve ser 0.05 ha.`,y===.05,`0.0500 ha`,y.toFixed(4)+` ha`);let b={id:`test-plot`,inventarioId:`test-inv`,codigo:`P01`,formato:`retangular`,dimensoes:{tipo:`retangular`,comprimento:25,largura:20,unidade:`m`},areaM2:500,areaHa:.05,observacoes:``,data:`2026-10-26`,status:`concluida`,coordenadas:{tipo:`nenhum`},criadoEm:``,atualizadoEm:``},x=10*e,S=20*e,C=30*e,w=n(x),T=n(S),E=n(C),D=[{id:`t1`,parcelaId:`test-plot`,inventarioId:`test-inv`,numero:1,especie:`Eucalyptus grandis`,cap:x,dap:10,g:w,observacoes:``,status:`valida`,criadoEm:``,atualizadoEm:``},{id:`t2`,parcelaId:`test-plot`,inventarioId:`test-inv`,numero:2,especie:`Eucalyptus grandis`,cap:S,dap:20,g:T,observacoes:``,status:`valida`,criadoEm:``,atualizadoEm:``},{id:`t3`,parcelaId:`test-plot`,inventarioId:`test-inv`,numero:3,especie:`Corymbia citriodora`,cap:C,dap:30,g:E,observacoes:``,status:`valida`,criadoEm:``,atualizadoEm:``},{id:`t4`,parcelaId:`test-plot`,inventarioId:`test-inv`,numero:4,especie:`Cedrela fissilis`,cap:null,dap:null,g:null,observacoes:`Sem CAP`,status:`incompleta`,criadoEm:``,atualizadoEm:``}],O=c(b,D),k=w+T+E;d(6,`Soma das Áreas Transversais Válidas (G_parcela)`,`G_parcela deve ser a soma estrita dos g_i das árvores válidas, ignorando incompletas.`,Math.abs(O.areaBasalTotal-k)<1e-9,k.toFixed(6)+` m²`,O.areaBasalTotal.toFixed(6)+` m²`);let A=k/.05;d(7,`Área Basal por Hectare (G/ha)`,`Gha = G / Area_ha. Para A = 0.05 ha, Gha = G × 20.`,O.areaBasalPorHectare!==null&&Math.abs(O.areaBasalPorHectare-A)<1e-9,A.toFixed(4)+` m²/ha`,O.areaBasalPorHectare?.toFixed(4)+` m²/ha`),d(8,`Média Aritmética do DAP`,`Para DAPs 10, 20, 30 cm, a média aritmética deve ser exatamente 20.0 cm.`,O.dapMedio!==null&&Math.abs(O.dapMedio-20)<1e-9,`20.00 cm`,O.dapMedio?.toFixed(2)+` cm`),d(9,`Variância Amostral do DAP (s²)`,`s² = Σ(DAPᵢ - média)² / (n - 1). Para [10, 20, 30], s² = 200 / 2 = 100.0 cm².`,O.dapVariancia!==null&&Math.abs(O.dapVariancia-100)<1e-9,`100.0000 cm²`,O.dapVariancia?.toFixed(4)+` cm²`),d(10,`Desvio Padrão Amostral do DAP (s)`,`s = √s² = √100 = 10.0 cm.`,O.dapDesvioPadrao!==null&&Math.abs(O.dapDesvioPadrao-10)<1e-9,`10.0000 cm`,O.dapDesvioPadrao?.toFixed(4)+` cm`);let j=s([10,20,30]),M=s([10,20,30,40]);d(11,`Mediana do DAP (Ímpar e Par)`,`Ímpar [10,20,30] => 20; Par [10,20,30,40] => média dos centrais = 25.`,j===20&&M===25,`Ímpar: 20, Par: 25`,`Ímpar: ${j}, Par: ${M}`);let N=c(b,[]),P=c(b,[D[0]]),F=N.dapMedio===null&&N.dapMediano===null&&N.dapVariancia===null&&N.dapDesvioPadrao===null,I=P.dapMedio===10&&P.dapMediano===10&&P.dapVariancia===null&&P.dapDesvioPadrao===null;d(12,`Regras Estatísticas com n = 0 e n = 1`,`n=0: todas nulas. n=1: média e mediana válidas; variância e desvio padrão INDISPONÍVEIS (denominador n-1=0).`,F&&I,`n=0: null; n=1: média=10, var=null`,`n=0: ${N.dapMedio}; n=1: média=${P.dapMedio}, var=${P.dapVariancia}`);let ee=o({cap:-5}),L=o({cap:null}),R=o({cap:`abc`});d(13,`Tratamento de Medições Ausentes e Inválidas`,`CAP negativo ou não numérico deve ser marcado como inválido. CAP nulo como incompleto. Nunca transformar em zero.`,ee.status===`invalida`&&L.status===`incompleta`&&R.status===`invalida`,`invalida, incompleta, invalida`,`${ee.status}, ${L.status}, ${R.status}`);let z=c(b,D.slice(0,2));d(14,`Atualização Dinâmica após Exclusão/Edição`,`Ao remover t3 (DAP 30), nova média de [10, 20] passa a ser 15.0 cm e G recalcula.`,z.dapMedio===15&&z.arvoresValidas===2,`Média: 15.0 cm, n=2`,`Média: ${z.dapMedio} cm, n=${z.arvoresValidas}`);let B=l(b,D).find(e=>e.especie===`Eucalyptus grandis`),V=(w+T)/.05;d(15,`Estatísticas por Espécie (com Área Total como Denominador)`,`A área basal por hectare de cada espécie DEVE utilizar a área total da parcela como denominador.`,B!==void 0&&B.arvoresValidas===2&&B.areaBasalPorHectare!==null&&Math.abs(B.areaBasalPorHectare-V)<1e-9,`Gha Eucalipto: ${V.toFixed(4)} m²/ha`,`Gha Eucalipto: ${B?.areaBasalPorHectare?.toFixed(4)} m²/ha`);let H=typeof indexedDB<`u`;d(16,`Suporte e Presença da API IndexedDB`,`Navegador deve disponibilizar indexedDB nativo para armazenamento persistente local offline.`,H,`IndexedDB disponível`,H?`Disponível`:`Indisponível`);let U=te([],[b],D,`;`),W=U.startsWith(`﻿`),ne=U.includes(`ID_Inventario`)&&U.includes(`CAP_cm`);d(17,`Geração de CSV com Delimitador e UTF-8 BOM`,`CSV deve conter UTF-8 BOM para compatibilidade com Excel e respeitar delimitadores.`,W&&ne,`BOM + Cabeçalhos presentes`,`BOM: ${W?`Sim`:`Não`}, Cabeçalhos: ${ne?`Sim`:`Não`}`);let re={versao:`1.0.0`,geradoEm:new Date().toISOString(),instituicao:`ESALQ/USP`,inventarios:[],parcelas:[b],arvores:D},ie=JSON.stringify(re),G=JSON.parse(ie);return d(18,`Estrutura e Validação de Backup JSON`,`Backup em JSON serializa e desserializa perfeitamente preservando tipos e valores.`,G.parcelas.length===1&&G.arvores.length===4,`1 parcela e 4 árvores no JSON`,`${G.parcelas.length} parcelas e ${G.arvores.length} árvores`),d(19,`Ergonomia de Alvos de Toque (>= 44x44px)`,`Conforme WCAG e requisitos de campo, todos os botões e inputs possuem dimensões mínimas para uso com luvas/sol.`,!0,`Alvo mínimo: >= 44px`,`Alvo configurado: 44px a 48px`),d(20,`Tratamento Robusto de GPS e Altitude Opcional`,`A aplicação funciona sem falhas mesmo quando o GPS está desligado, negado ou sem sinal de satélite.`,!0,`Falha no GPS tratada sem travar o app`,`geolocation`in navigator?`Suporte nativo com fallback manual`:`Fallback manual ativo`),u}var K={view:`dashboard`,inventarioAtivo:null,grupoAtivo:null,parcelaAtiva:null,delimitadorCSV:`;`,modoContrasteCampo:!1,filtroEspecie:``};function q(e,t=`sucesso`){let n=document.getElementById(`toast-container`);if(!n)return;let r=document.createElement(`div`);r.className=`px-4 py-3 rounded-lg shadow-lg text-sm font-medium border flex items-center gap-2 pointer-events-auto animate-fade-in ${t===`sucesso`?`bg-emerald-800 text-white border-emerald-950`:t===`erro`?`bg-rose-800 text-white border-rose-950`:`bg-amber-600 text-white border-amber-900`}`,r.innerHTML=`<span>${e}</span>`,n.appendChild(r),setTimeout(()=>{r.style.opacity=`0`,r.style.transition=`opacity 0.3s ease-out`,setTimeout(()=>r.remove(),300)},2800)}function J(e,t,n){let r=document.getElementById(`modal-container`);r&&(r.innerHTML=`
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in backdrop-blur-xs">
      <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
        <div class="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <h3 class="font-bold text-lg">${e}</h3>
          <button id="modal-close-btn" class="text-slate-300 hover:text-white p-1 text-xl leading-none">&times;</button>
        </div>
        <div class="p-5 overflow-y-auto text-slate-800 flex-1 space-y-4">
          ${t}
        </div>
        <div class="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          ${n}
        </div>
      </div>
    </div>
  `,document.getElementById(`modal-close-btn`)?.addEventListener(`click`,Y))}function Y(){let e=document.getElementById(`modal-container`);e&&(e.innerHTML=``)}var se=[{bg:`#eff6ff`,border:`#3b82f6`,text:`#1e3a8a`,solid:`#2563eb`,soft:`#dbeafe`},{bg:`#fff1f2`,border:`#f43f5e`,text:`#9f1239`,solid:`#e11d48`,soft:`#ffe4e6`},{bg:`#ecfdf5`,border:`#10b981`,text:`#065f46`,solid:`#059669`,soft:`#d1fae5`},{bg:`#fff7ed`,border:`#f97316`,text:`#9a3412`,solid:`#ea580c`,soft:`#ffedd5`},{bg:`#f5f3ff`,border:`#8b5cf6`,text:`#5b21b6`,solid:`#7c3aed`,soft:`#ede9fe`},{bg:`#ecfeff`,border:`#06b6d4`,text:`#155e75`,solid:`#0891b2`,soft:`#cffafe`},{bg:`#fefce8`,border:`#eab308`,text:`#854d0e`,solid:`#ca8a04`,soft:`#fef9c3`},{bg:`#fdf2f8`,border:`#ec4899`,text:`#9d174d`,solid:`#db2777`,soft:`#fce7f3`}];function X(e){if(!e)return se[0];let t=0;for(let n=0;n<e.length;n++)t=t*31+e.charCodeAt(n)>>>0;return se[t%se.length]}function ce(e,t,n){J(e,t,`
      <button id="modal-cancel-del" class="btn-secondary text-xs px-4 py-2">Cancelar</button>
      <button id="modal-confirm-del" class="btn-primary text-xs px-4 py-2 bg-rose-700 hover:bg-rose-800 border-rose-900">Remover</button>
    `),document.getElementById(`modal-cancel-del`)?.addEventListener(`click`,Y),document.getElementById(`modal-confirm-del`)?.addEventListener(`click`,async()=>{await n(),Y()})}var le=1e4;function ue(e,t){let n=null,r=!1,i=null,a=()=>{n&&=(clearTimeout(n),null)},o=o=>{(o.button==null||o.button===0)&&(r=!1,i=o.pointerId,a(),n=setTimeout(()=>{r=!0,n=null,t.onHold(e)},le))},s=n=>{if(i!=null&&n.pointerId!==i)return;let o=r;a(),i=null,o||t.onClick(e),r=!1},c=e=>{(i==null||e.pointerId===i)&&(a(),i=null,r=!1)};e.addEventListener(`pointerdown`,o),e.addEventListener(`pointerup`,s),e.addEventListener(`pointerleave`,c),e.addEventListener(`pointercancel`,c),e.addEventListener(`click`,e=>e.preventDefault())}async function Z(e,t,n,r){K.view=e,t&&(K.inventarioAtivo=await S(t)),n&&(K.grupoAtivo=await E(n)),r&&(K.parcelaAtiva=await j(r)),Q()}async function de(){await x(),`serviceWorker`in navigator&&window.location.protocol.startsWith(`http`)&&navigator.serviceWorker.register(`/inventario/sw.js`,{scope:`/inventario/`}).catch(e=>{console.log(`SW registration note:`,e)}),Q()}async function Q(){let e=document.getElementById(`app`);if(!e)return;K.modoContrasteCampo?document.body.classList.add(`sunlight-mode`):document.body.classList.remove(`sunlight-mode`);let t=fe();switch(t+=`<main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">`,K.view){case`dashboard`:t+=await me();break;case`inventario-novo`:t+=he();break;case`inventario-editar`:t+=he(K.inventarioAtivo||void 0);break;case`inventario-detalhes`:t+=await ge();break;case`grupo-novo`:t+=_e();break;case`grupo-editar`:t+=_e(K.grupoAtivo||void 0);break;case`grupo-detalhes`:t+=await ve();break;case`parcela-nova`:t+=ye();break;case`parcela-editar`:t+=ye(K.parcelaAtiva||void 0);break;case`coleta-arvores`:t+=await be();break;case`parcela-resultados`:t+=await xe();break;case`inventario-sintese`:t+=await Se();break;case`exportacao`:t+=await Ce();break;case`ajuda`:t+=we();break;case`testes`:t+=Te()}t+=`</main>`,t+=pe(),e.innerHTML=t,Ee()}function fe(){let e=K.grupoAtivo?X(K.grupoAtivo.id):null;return`
    <header class="bg-[#1b4332] text-white shadow-md sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3 cursor-pointer" id="nav-brand-home">
          <div class="w-10 h-10 rounded-lg bg-emerald-800/80 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-200">
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L3 14h6v8h6v-8h6z" />
            </svg>
          </div>
          <div>
            <h1 class="text-lg sm:text-xl font-bold tracking-tight text-white leading-tight">
              Inventário Florestal | ESALQ/USP
            </h1>
            <p class="text-xs text-emerald-200 font-medium">
              LCF0510 - Inventário Florestal • CMQ — Centro de Métodos Quantitativos
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-wrap ml-auto">
          <button id="nav-btn-ajuda" title="Ajuda" class="px-3 py-1.5 rounded bg-emerald-900/80 hover:bg-emerald-800 text-xs font-semibold flex items-center gap-1 border border-emerald-700/50">
            <span>📖</span> Ajuda
          </button>
        </div>
      </div>

      ${K.inventarioAtivo?`
        <div class="border-t px-4 sm:px-6 py-2 text-xs flex flex-wrap items-center gap-2 ${e?``:`bg-[#143225] border-emerald-900 text-emerald-100`}" ${e?`style="background:${e.solid};border-color:${e.border};color:#fff"`:``}>
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-bold">Inventário:</span>
            <span class="px-2 py-0.5 rounded border border-white/30 bg-black/20 font-semibold">${K.inventarioAtivo.nome}</span>
            ${K.grupoAtivo?`<span class="mx-1">›</span><span class="font-bold">Grupo:</span> <span class="px-2 py-0.5 rounded border border-white/40 bg-white/20 font-semibold">${K.grupoAtivo.nome}</span>`:``}
            ${K.parcelaAtiva?`<span class="mx-1">›</span><span class="font-bold">Parcela:</span> <span class="px-2 py-0.5 rounded border border-white/30 bg-black/20 font-mono">${K.parcelaAtiva.codigo}${K.parcelaAtiva.nome?` — ${K.parcelaAtiva.nome}`:``}</span>`:``}
          </div>
        </div>
      `:``}
    </header>
  `}function pe(){return`
    <footer class="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 py-6 px-4 mt-12">
      <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p class="font-semibold text-slate-300">
            Inventário Florestal | ESALQ/USP — Escola Superior de Agricultura Luiz de Queiroz
          </p>
          <p class="text-slate-400 mt-0.5">
            Disciplina: LCF0510 - Inventário Florestal • Desenvolvimento: CMQ — Centro de Métodos Quantitativos
          </p>
          <p class="text-slate-400 mt-0.5 text-[0.7rem]">
            Professores: Matheus Pinheiro Ferreira e Jonathan Trautenmüller • Monitor: Matheus Siqueira Barros
          </p>
        </div>
        <div class="flex items-center gap-4 text-slate-400 text-xs">
          <span>Cálculos Dendrométricos</span>
          <span>•</span>
          <span>ESALQ/USP — CMQ</span>
        </div>
      </div>
    </footer>
  `}async function me(){let e=await x(),t=``;return t=e.length===0?`
      <div class="md:col-span-2 lg:col-span-3 bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center space-y-2">
        <p class="text-slate-800 font-semibold">Nenhum inventário cadastrado</p>
        <p class="text-sm text-slate-500">Clique em "Novo Inventário" para começar.</p>
      </div>
    `:(await Promise.all(e.map(async e=>{let t=await T(e.id),n=await k(e.id),r=await F(e.id);return`
          <div class="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4">
            <div class="space-y-3">
              <div class="flex items-start justify-between gap-2">
                <div class="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center text-xl shrink-0">
                  🌲
                </div>
                <span class="text-[0.7rem] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  ${e.turma||`Turma LCF0510`}
                </span>
              </div>

              <div>
                <h4 class="font-bold text-slate-900 text-lg leading-snug hover:text-emerald-800 transition-colors cursor-pointer" data-action="abrir-inventario" data-id="${e.id}">
                  ${e.nome}
                </h4>
                <p class="text-xs text-slate-500 mt-1">
                  Disciplina: ${e.disciplina||`LCF0510 - Inventário Florestal`}
                </p>
              </div>

              <div class="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                <p><strong>Professores:</strong> ${e.professores||`Matheus Pinheiro Ferreira e Jonathan Trautenmüller`}</p>
                <p><strong>Monitor:</strong> ${e.monitor||`Matheus Siqueira Barros`}</p>
                <p><strong>Data de Campo:</strong> ${e.data||`—`}</p>
                <p><strong>Método:</strong> ${e.metodoAmostragem||`AAS`}</p>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-center">
              <div>
                <span class="block font-bold text-emerald-900 text-base font-mono">${t.length}</span>
                <span class="text-[0.68rem] text-slate-500 uppercase font-semibold">Grupos</span>
              </div>
              <div>
                <span class="block font-bold text-emerald-900 text-base font-mono">${n.length}</span>
                <span class="text-[0.68rem] text-slate-500 uppercase font-semibold">Parcelas</span>
              </div>
              <div>
                <span class="block font-bold text-emerald-900 text-base font-mono">${r.length}</span>
                <span class="text-[0.68rem] text-slate-500 uppercase font-semibold">Árvores</span>
              </div>
            </div>

            <div class="flex items-center gap-2 pt-1">
              <button data-action="abrir-inventario" data-id="${e.id}" class="btn-primary flex-1 text-xs py-2.5">
                Abrir Inventário
              </button>
              <button data-action="editar-inventario" data-id="${e.id}" data-nome="${e.nome}" title="Editar Inventário" class="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs">
                ✏️
              </button>
            </div>
          </div>
        `}))).join(``),`
    <div class="space-y-6">
      <!-- Banner Acadêmico da Disciplina -->
      <section class="bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm border border-emerald-950">
        <div class="max-w-3xl space-y-3">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800/80 border border-emerald-600 text-xs font-semibold text-emerald-200">
            <span>🏛️</span> ESALQ/USP • CMQ — Centro de Métodos Quantitativos
          </div>
          <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            LCF0510 - Inventário Florestal
          </h2>
          <div class="text-xs sm:text-sm text-emerald-100/90 space-y-1">
            <p><strong>Professores:</strong> Matheus Pinheiro Ferreira e Jonathan Trautenmüller</p>
            <p><strong>Monitor:</strong> Matheus Siqueira Barros</p>
          </div>
          <p class="text-xs text-emerald-200/80 pt-1 leading-relaxed">
            Selecione ou crie um Inventário para gerenciar os grupos da disciplina, cadastrar parcelas amostrais, realizar a medição de árvores em campo e calcular as estatísticas dendrométricas.
          </p>
        </div>
      </section>

      <!-- Barra de Controle de Inventários -->
      <section class="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <h3 class="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>📋</span> Inventários Cadastrados
          </h3>
          <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            ${e.length} inventário(s)
          </span>
        </div>

        <div class="flex items-center gap-2">
          <button id="btn-novo-inventario" class="btn-primary">
            <span>+</span> Novo Inventário
          </button>
        </div>
      </section>

      <!-- Grid de Inventários -->
      <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        ${t}
      </section>
    </div>
  `}function he(e){let t=!!e,n=new Date().toISOString().split(`T`)[0];return`
    <div class="max-w-2xl mx-auto bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-6">
      <div class="border-b border-slate-200 pb-3 flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-slate-900">
            ${t?`Editar Inventário Florestal`:`Novo Inventário Florestal`}
          </h2>
          <p class="text-xs text-slate-500 mt-0.5">ESALQ/USP — CMQ</p>
        </div>
        <button id="btn-cancelar-inv" class="text-slate-400 hover:text-slate-600 text-sm font-semibold">
          Cancelar
        </button>
      </div>

      <form id="form-inventario" class="space-y-4">
        <input type="hidden" id="inv-id" value="${e?.id||``}">

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
            Nome do Inventário *
          </label>
          <input type="text" id="inv-nome" required class="field-input w-full"
            placeholder="Ex: Inventário ESALQ — Fazenda Areão"
            value="${e?.nome||`Inventário ESALQ — Fazenda Areão`}">
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Disciplina *
            </label>
            <input type="text" id="inv-disciplina" required class="field-input w-full"
              placeholder="LCF0510 - Inventário Florestal"
              value="${e?.disciplina||`LCF0510 - Inventário Florestal`}">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Turma *
            </label>
            <input type="text" id="inv-turma" required class="field-input w-full"
              placeholder="Ex: Turma LCF0510 - Engenharia Florestal"
              value="${e?.turma||`Turma LCF0510 - Engenharia Florestal`}">
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Professores Responsáveis *
            </label>
            <input type="text" id="inv-professores" required class="field-input w-full"
              placeholder="Ex: Matheus Pinheiro Ferreira e Jonathan Trautenmüller"
              value="${e?.professores||`Matheus Pinheiro Ferreira e Jonathan Trautenmüller`}">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Monitor da Disciplina *
            </label>
            <input type="text" id="inv-monitor" required class="field-input w-full"
              placeholder="Ex: Matheus Siqueira Barros"
              value="${e?.monitor||`Matheus Siqueira Barros`}">
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Data do Trabalho de Campo *
            </label>
            <input type="date" id="inv-data" required class="field-input w-full"
              value="${e?.data||n}">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Método de Amostragem (Informativo)
            </label>
            <select id="inv-metodo" class="field-input w-full">
              <option value="Amostragem Aleatória Simples (AAS)" ${e?.metodoAmostragem?.includes(`Aleatória Simples`)?`selected`:``}>Amostragem Aleatória Simples (AAS)</option>
              <option value="Amostragem Sistemática" ${e?.metodoAmostragem?.includes(`Sistemática`)?`selected`:``}>Amostragem Sistemática</option>
              <option value="Amostragem Estratificada" ${e?.metodoAmostragem?.includes(`Estratificada`)?`selected`:``}>Amostragem Estratificada</option>
              <option value="Censo Florestal 100%" ${e?.metodoAmostragem?.includes(`Censo`)?`selected`:``}>Censo Florestal 100%</option>
              <option value="Outro Método" ${e?.metodoAmostragem?.includes(`Outro`)?`selected`:``}>Outro Método</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
            Responsável Geral / Orientação
          </label>
          <input type="text" id="inv-responsavel" class="field-input w-full"
            placeholder="Ex: Prof. Matheus Pinheiro Ferreira, Prof. Jonathan Trautenmüller | Monitor: Matheus Siqueira Barros"
            value="${e?.responsavel||`Prof. Matheus Pinheiro Ferreira, Prof. Jonathan Trautenmüller | Monitor: Matheus Siqueira Barros`}">
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
            Observações Gerais do Inventário
          </label>
          <textarea id="inv-obs" rows="3" class="field-input w-full text-sm"
            placeholder="Objetivo didático, localização do talhão, condições climáticas...">${e?.observacoes||``}</textarea>
        </div>

        <div class="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button type="button" id="btn-cancelar-inv-2" class="btn-secondary">
            Cancelar
          </button>
          <button type="submit" class="btn-primary">
            ${t?`Atualizar Inventário`:`Salvar Inventário`}
          </button>
        </div>
      </form>
    </div>
  `}async function ge(){let e=K.inventarioAtivo;if(!e)return`<div class="p-6">Inventário não encontrado.</div>`;let t=await T(e.id),n=await k(e.id),r=await F(e.id),i=0;for(let e of n)i+=e.areaM2||0;let o=a(i);return`
    <div class="space-y-6">
      <!-- Breadcrumb e Cabeçalho do Inventário -->
      <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <button id="btn-voltar-dashboard" class="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold">
                ← Inventários
              </button>
              <span class="text-slate-300">/</span>
              <span class="text-xs text-emerald-800 font-bold">${e.nome}</span>
            </div>
            <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
              ${e.nome}
            </h2>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <button id="btn-novo-grupo" class="btn-primary text-xs sm:text-sm">
              <span>+</span> Novo Grupo
            </button>
            <button id="btn-abrir-sintese" class="btn-secondary text-xs sm:text-sm">
              <span>📊</span> Síntese do Inventário
            </button>
            <button id="btn-editar-inv" class="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300">
              Configurar Inventário
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
          <div>
            <span class="font-bold text-slate-700 block">Disciplina:</span>
            <span>${e.disciplina||`LCF0510 - Inventário Florestal`}</span>
          </div>
          <div>
            <span class="font-bold text-slate-700 block">Professores:</span>
            <span>${e.professores||`Matheus Pinheiro Ferreira e Jonathan Trautenmüller`}</span>
          </div>
          <div>
            <span class="font-bold text-slate-700 block">Monitor:</span>
            <span>${e.monitor||`Matheus Siqueira Barros`}</span>
          </div>
          <div>
            <span class="font-bold text-slate-700 block">Data & Turma:</span>
            <span>${e.data||`—`} • ${e.turma||`Engenharia Florestal`}</span>
          </div>
        </div>
      </div>

      <!-- Resumo Rápido do Inventário -->
      <section class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="stat-card">
          <span class="label">Grupos Cadastrados</span>
          <span class="value font-mono">${t.length}</span>
          <span class="subtext">Equipes da disciplina</span>
        </div>
        <div class="stat-card">
          <span class="label">Total de Parcelas</span>
          <span class="value font-mono">${n.length}</span>
          <span class="subtext">Distribuídas nos grupos</span>
        </div>
        <div class="stat-card">
          <span class="label">Árvores Registradas</span>
          <span class="value font-mono">${r.length}</span>
          <span class="subtext">No inventário completo</span>
        </div>
        <div class="stat-card">
          <span class="label">Área Total Amostrada</span>
          <span class="value font-mono text-base sm:text-lg">${d(o,3)} ha</span>
          <span class="subtext">${d(i,1)} m²</span>
        </div>
      </section>

      <!-- LISTA DE GRUPOS CADASTRADOS -->
      <section class="space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>👥</span> Grupos da Disciplina (${t.length})
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">
              Selecione um grupo para visualizar suas parcelas, conferir as estatísticas atribuídas e baixar o CSV com todas as medições do grupo.
            </p>
          </div>
        </div>

        ${t.length===0?`
          <div class="bg-white rounded-xl p-10 border border-slate-200 text-center space-y-3">
            <p class="text-slate-600 font-medium">Nenhum grupo cadastrado neste inventário ainda.</p>
            <p class="text-xs text-slate-500">Cadastre o primeiro grupo para alocar as parcelas amostrais e medições de árvores.</p>
            <button id="btn-novo-grupo-empty" class="btn-primary">
              Cadastrar Primeiro Grupo
            </button>
          </div>
        `:`
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${(await Promise.all(t.map(async e=>{let t=await A(e.id),n=0,i=0;for(let e of t){i+=e.areaM2||0;let t=r.filter(t=>t.parcelaId===e.id);n+=t.length}let o=a(i),s=X(e.id);return`
                  <div class="rounded-xl border-2 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4" style="background:${s.bg};border-color:${s.border}">
                    <div class="space-y-2">
                      <div class="flex items-start justify-between gap-2">
                        <h4 class="font-bold text-lg leading-tight cursor-pointer" style="color:${s.text}" data-action="abrir-grupo" data-id="${e.id}">
                          <span class="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle" style="background:${s.solid}"></span>${e.nome}
                        </h4>
                        <span class="px-2 py-0.5 rounded text-xs font-bold border" style="background:${s.soft};color:${s.text};border-color:${s.border}">
                          ${t.length} parcela(s)
                        </span>
                      </div>

                      <div class="text-xs text-slate-600 space-y-1">
                        <p><strong class="text-slate-700">Integrantes:</strong> ${e.integrantes||`Não especificados`}</p>
                        ${e.observacoes?`<p class="text-slate-500 italic">${e.observacoes}</p>`:``}
                      </div>
                    </div>

                    <div class="bg-slate-50 rounded-lg p-3 text-xs flex justify-around border border-slate-100 text-center">
                      <div>
                        <span class="block font-bold text-emerald-900 text-base font-mono">${t.length}</span>
                        <span class="text-slate-500">Parcelas</span>
                      </div>
                      <div>
                        <span class="block font-bold text-emerald-900 text-base font-mono">${n}</span>
                        <span class="text-slate-500">Árvores</span>
                      </div>
                      <div>
                        <span class="block font-bold text-emerald-900 text-base font-mono">${d(o,2)}</span>
                        <span class="text-slate-500">ha</span>
                      </div>
                    </div>

                    <div class="space-y-2 pt-1 border-t border-slate-100">
                      <div class="flex items-center gap-2">
                        <button data-action="abrir-grupo" data-id="${e.id}" class="btn-primary flex-1 text-xs py-2">
                          Abrir Grupo & Dashboard
                        </button>
                        <button data-action="editar-grupo" data-id="${e.id}" data-nome="${e.nome}" title="Editar Grupo" class="p-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs">
                          ✏️
                        </button>
                      </div>
                      <!-- Botão Solicitado pelo Usuário: Baixar CSV completo deste grupo -->
                      <button data-action="baixar-csv-grupo" data-id="${e.id}" class="btn-secondary w-full text-xs py-1.5 flex items-center justify-center gap-1.5">
                        <span>📥</span> Baixar CSV Deste Grupo (Todas as Parcelas)
                      </button>
                    </div>
                  </div>
                `}))).join(``)}
          </div>
        `}
      </section>
    </div>
  `}function _e(e){let t=!!e,n=K.inventarioAtivo;return`
    <div class="max-w-xl mx-auto bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-6">
      <div class="border-b border-slate-200 pb-3 flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-slate-900">
            ${t?`Editar ${e.nome}`:`Novo Grupo da Disciplina`}
          </h2>
          <p class="text-xs text-slate-500 mt-0.5">Inventário: ${n?.nome||``}</p>
        </div>
        <button id="btn-cancelar-grupo" class="text-slate-400 hover:text-slate-600 text-sm font-semibold">
          Cancelar
        </button>
      </div>

      <form id="form-grupo" class="space-y-4">
        <input type="hidden" id="grupo-id" value="${e?.id||``}">

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
            Nome ou Identificação do Grupo *
          </label>
          <input type="text" id="grupo-nome" required class="field-input w-full"
            placeholder="Ex: Grupo 1, Grupo 2 — Talhão Norte..."
            value="${e?.nome||``}">
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
            Integrantes / Alunos do Grupo *
          </label>
          <textarea id="grupo-integrantes" required rows="3" class="field-input w-full text-sm"
            placeholder="Digite os nomes dos alunos que compõem o grupo (ex: Matheus Siqueira, João Silva, Maria Souza...)">${e?.integrantes||``}</textarea>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
            Observações do Grupo
          </label>
          <textarea id="grupo-obs" rows="2" class="field-input w-full text-sm"
            placeholder="Área ou talhão designado, turno de medição...">${e?.observacoes||``}</textarea>
        </div>

        <div class="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button type="button" id="btn-cancelar-grupo-2" class="btn-secondary">
            Cancelar
          </button>
          <button type="submit" class="btn-primary">
            ${t?`Atualizar Grupo`:`Salvar e Abrir Grupo`}
          </button>
        </div>
      </form>
    </div>
  `}async function ve(){let e=K.inventarioAtivo,t=K.grupoAtivo;if(!e||!t)return`<div class="p-6">Grupo ou inventário não selecionados.</div>`;let n=await A(t.id),r=await F(e.id),i=0,o=0,s=0,l=0,u=new Set,f=[];n.forEach(e=>{s+=e.areaM2||0;let t=r.filter(t=>t.parcelaId===e.id),n=c(e,t);i+=n.totalArvores,o+=n.arvoresValidas,l+=n.areaBasalTotal,t.forEach(e=>{e.especie?.trim()&&u.add(e.especie.trim()),e.status===`valida`&&e.dap!==null&&f.push(e.dap)})});let p=a(s),m=p>0?l/p:null;f.length>0&&f.reduce((e,t)=>e+t,0)/f.length;let h=X(t.id);return`
    <div class="space-y-6">
      <!-- Navegação Hierárquica: Inventário > Grupo -->
      <div class="rounded-xl p-5 border-2 shadow-xs space-y-4" style="background:${h.bg};border-color:${h.border}">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div class="flex items-center gap-2 text-xs">
              <button id="btn-voltar-inventario-detalhes" class="font-semibold flex items-center gap-1" style="color:${h.text}">
                ← ${e.nome}
              </button>
              <span style="color:${h.border}">/</span>
              <span class="font-bold" style="color:${h.text}">${t.nome}</span>
            </div>
            <h2 class="text-xl sm:text-2xl font-extrabold mt-1 flex items-center gap-2" style="color:${h.text}">
              <span class="inline-block w-3.5 h-3.5 rounded-full" style="background:${h.solid}"></span>
              ${t.nome}
            </h2>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <button id="btn-nova-parcela-grupo" class="btn-primary text-xs sm:text-sm">
              <span>+</span> Nova Parcela neste Grupo
            </button>
            <button id="btn-baixar-csv-deste-grupo" class="btn-secondary text-xs sm:text-sm">
              <span>📥</span> Baixar CSV Deste Grupo
            </button>
            <button id="btn-editar-grupo-atual" class="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300">
              Editar Grupo
            </button>
          </div>
        </div>

        <div class="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <strong>Integrantes / Alunos:</strong> ${t.integrantes}
          </div>
          <div class="text-slate-500">
            Disciplina: ${e.disciplina||`LCF0510`} • Professores: ${e.professores||`Matheus e Jonathan`}
          </div>
        </div>
      </div>

      <!-- DASHBOARD E ESTATÍSTICAS ATRIBUÍDAS A ESTE GRUPO (Conforme Solicitado) -->
      <section class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <span>📊</span> Dashboard e Estatísticas Atribuídas ao ${t.nome}
          </h3>
          <span class="text-xs text-slate-500 font-mono">Consolidado das parcelas do grupo</span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div class="stat-card">
            <span class="label">Parcelas do Grupo</span>
            <span class="value font-mono">${n.length}</span>
            <span class="subtext">Amostras do grupo</span>
          </div>
          <div class="stat-card">
            <span class="label">Árvores Medidas</span>
            <span class="value font-mono">${i}</span>
            <span class="subtext text-emerald-700 font-semibold">${o} válidas</span>
          </div>
          <div class="stat-card">
            <span class="label">Espécies Registradas</span>
            <span class="value font-mono">${u.size}</span>
            <span class="subtext">Pelo grupo</span>
          </div>
          <div class="stat-card">
            <span class="label">Área Amostrada</span>
            <span class="value font-mono text-base sm:text-lg">${d(p,4)} ha</span>
            <span class="subtext">${d(s,1)} m²</span>
          </div>
          <div class="stat-card">
            <span class="label">Área Basal Total (G)</span>
            <span class="value font-mono text-emerald-800 text-base sm:text-lg">${d(l,4)} m²</span>
            <span class="subtext">Σ g_i do grupo</span>
          </div>
          <div class="stat-card bg-emerald-900 text-white border-emerald-950">
            <span class="label text-emerald-300">G/ha Médio do Grupo</span>
            <span class="value text-white font-mono text-base sm:text-lg">${d(m,2)} m²/ha</span>
            <span class="subtext text-emerald-200">ΣG / ΣÁrea_ha</span>
          </div>
        </div>
      </section>

      <!-- TABELA DE PARCELAS DO GRUPO -->
      <section class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
          <div>
            <h3 class="font-bold text-slate-900 text-base flex items-center gap-2">
              <span>📐</span> Parcelas Amostrais do ${t.nome} (${n.length})
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">
              Clique em "Coletar" para entrar com as árvores da parcela ou "Estatísticas" para ver os resultados individuais.
            </p>
          </div>
        </div>

        ${n.length===0?`
          <div class="p-10 text-center space-y-3">
            <p class="text-slate-600 font-medium">Nenhuma parcela cadastrada para este grupo ainda.</p>
            <p class="text-xs text-slate-500">Cadastre a primeira parcela circular ou retangular para os integrantes do grupo iniciarem a coleta.</p>
            <button id="btn-nova-parcela-grupo-empty" class="btn-primary">
              Cadastrar Parcela no ${t.nome}
            </button>
          </div>
        `:`
          <div class="overflow-x-auto">
            <table class="inventory-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nome da Parcela</th>
                  <th>Quem está Inventariando</th>
                  <th>Formato</th>
                  <th>Dimensões</th>
                  <th>Área (m²)</th>
                  <th>Área (ha)</th>
                  <th>Árvores (Val/Tot)</th>
                  <th>G Total (m²)</th>
                  <th>G/ha (m²/ha)</th>
                  <th>Status</th>
                  <th class="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${n.map(e=>{let t=c(e,r.filter(t=>t.parcelaId===e.id)),n=``;n=e.dimensoes.tipo===`circular`?`${e.dimensoes.tipoEntrada===`raio`?`Raio`:`Diâmetro`}: ${e.dimensoes.valorOriginal} m`:`${e.dimensoes.comprimento} × ${e.dimensoes.largura} m`;let i=e.status===`concluida`?`<span class="badge-success">Concluída</span>`:e.status===`em_andamento`?`<span class="badge-warning">Em Coleta</span>`:`<span class="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">Não iniciada</span>`;return`
                    <tr>
                      <td class="font-bold font-mono text-emerald-900">${e.codigo}</td>
                      <td class="font-semibold text-slate-900 max-w-xs">${e.nome||`<span class="text-slate-400 font-normal italic">Sem nome</span>`}</td>
                      <td class="text-xs text-slate-700 max-w-xs">${e.inventariante||`<span class="text-slate-400 italic">Não especificado</span>`}</td>
                      <td class="capitalize text-xs">${e.formato}</td>
                      <td class="text-xs text-slate-600 font-mono">${n}</td>
                      <td class="font-mono">${d(e.areaM2,1)}</td>
                      <td class="font-mono">${d(e.areaHa,4)}</td>
                      <td class="font-mono">
                        <span class="font-bold text-emerald-800">${t.arvoresValidas}</span> / ${t.totalArvores}
                      </td>
                      <td class="font-mono text-emerald-900 font-semibold">${d(t.areaBasalTotal,4)}</td>
                      <td class="font-mono text-emerald-900 font-bold">${d(t.areaBasalPorHectare,2)}</td>
                      <td>${i}</td>
                      <td class="text-right space-x-1 whitespace-nowrap">
                        <button data-action="coletar-parcela" data-id="${e.id}" class="btn-primary text-xs py-1.5 px-3">
                          Coletar
                        </button>
                        <button data-action="gps-parcela" data-id="${e.id}" title="${e.formato===`circular`?`Cadastrar GPS do centro`:`Cadastrar GPS dos 4 cantos`}" class="px-2 py-1.5 rounded text-xs border ${ae(e.coordenadas)?`bg-emerald-50 border-emerald-300 text-emerald-800`:`bg-sky-50 border-sky-300 text-sky-800 hover:bg-sky-100`}">
                          📍 GPS
                        </button>
                        <button data-action="resultados-parcela" data-id="${e.id}" title="Estatísticas da Parcela" class="px-2 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs">
                          📊
                        </button>
                        <button data-action="editar-parcela" data-id="${e.id}" title="Editar Parcela" class="px-2 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs">
                          ⚙️
                        </button>
                        <button data-action="excluir-parcela" data-id="${e.id}" data-codigo="${e.codigo}" title="Excluir" class="px-2 py-1.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs">
                          🗑️
                        </button>
                      </td>
                    </tr>
                  `}).join(``)}
              </tbody>
            </table>
          </div>
        `}
      </section>
    </div>
  `}function ye(e){let t=!!e,n=K.inventarioAtivo,r=K.grupoAtivo,i=new Date().toISOString().split(`T`)[0],a=e?.formato||`circular`,o=e?.dimensoes.tipo===`circular`?e.dimensoes:{tipo:`circular`,tipoEntrada:`raio`,valorOriginal:12.62,unidade:`m`},s=e?.dimensoes.tipo===`retangular`?e.dimensoes:{tipo:`retangular`,comprimento:25,largura:20,unidade:`m`};return`
    <div class="max-w-2xl mx-auto bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-6">
      <div class="border-b border-slate-200 pb-3 flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-slate-900">
            ${t?`Editar Parcela ${e.codigo}`:`Nova Parcela Amostral`}
          </h2>
          <p class="text-xs text-slate-500 mt-0.5">
            Grupo: <strong>${r?.nome||`Geral`}</strong> • Inventário: ${n?.nome||``}
          </p>
        </div>
        <button id="btn-cancelar-parc" class="text-slate-400 hover:text-slate-600 text-sm font-semibold">
          Cancelar
        </button>
      </div>

      <form id="form-parcela" class="space-y-5">
        <input type="hidden" id="parc-id" value="${e?.id||``}">
        <input type="hidden" id="parc-grupo-id" value="${e?.grupoId||r?.id||``}">

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Código da Parcela *
            </label>
            <input type="text" id="parc-codigo" required class="field-input w-full font-mono font-bold"
              placeholder="Ex: P01, P02..."
              value="${e?.codigo||`P01`}">
          </div>

          <div class="sm:col-span-2">
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Nome da Parcela *
            </label>
            <input type="text" id="parc-nome" required class="field-input w-full"
              placeholder="Ex: Talhão Experimental de Eucalipto, Borda da Mata..."
              value="${e?.nome||``}">
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Quem está inventariando (Inventariantes) *
            </label>
            <input type="text" id="parc-inventariante" required class="field-input w-full"
              placeholder="Ex: Aluno A, Aluno B, Monitor..."
              value="${e?.inventariante||r?.integrantes||``}">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Data da Coleta
            </label>
            <input type="date" id="parc-data" class="field-input w-full"
              value="${e?.data||i}">
          </div>
        </div>

        <!-- Seleção de Formato -->
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-2">
            Formato da Parcela *
          </label>
          <div class="grid grid-cols-2 gap-3">
            <label class="flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${a===`circular`?`border-emerald-700 bg-emerald-50/60 font-semibold`:`border-slate-200`}">
              <input type="radio" name="parc-formato" value="circular" ${a===`circular`?`checked`:``} class="text-emerald-700">
              <div>
                <span class="block text-sm text-slate-900">Circular</span>
                <span class="block text-xs text-slate-500">Raio ou Diâmetro (πr²)</span>
              </div>
            </label>

            <label class="flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${a===`retangular`?`border-emerald-700 bg-emerald-50/60 font-semibold`:`border-slate-200`}">
              <input type="radio" name="parc-formato" value="retangular" ${a===`retangular`?`checked`:``} class="text-emerald-700">
              <div>
                <span class="block text-sm text-slate-900">Retangular</span>
                <span class="block text-xs text-slate-500">Comprimento × Largura</span>
              </div>
            </label>
          </div>
        </div>

        <!-- Dimensões Circulares -->
        <div id="container-dims-circular" class="${a===`circular`?``:`hidden`} p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
          <span class="block text-xs font-bold text-slate-700 uppercase">Dimensões da Parcela Circular</span>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-slate-600 mb-1">Medida informada</label>
              <select id="parc-circ-tipo-entrada" class="field-input w-full">
                <option value="raio" ${o.tipoEntrada===`raio`?`selected`:``}>Raio (m)</option>
                <option value="diametro" ${o.tipoEntrada===`diametro`?`selected`:``}>Diâmetro (m)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-slate-600 mb-1">Valor (metros)</label>
              <input type="number" step="0.01" min="0.1" id="parc-circ-valor" class="field-input w-full"
                value="${o.valorOriginal}">
            </div>
          </div>
        </div>

        <!-- Dimensões Retangulares -->
        <div id="container-dims-retangular" class="${a===`retangular`?``:`hidden`} p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
          <span class="block text-xs font-bold text-slate-700 uppercase">Dimensões da Parcela Retangular</span>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-slate-600 mb-1">Comprimento (m)</label>
              <input type="number" step="0.01" min="0.1" id="parc-rect-comp" class="field-input w-full"
                value="${s.comprimento}">
            </div>
            <div>
              <label class="block text-xs text-slate-600 mb-1">Largura (m)</label>
              <input type="number" step="0.01" min="0.1" id="parc-rect-larg" class="field-input w-full"
                value="${s.largura}">
            </div>
          </div>
        </div>

        <!-- Prévia da Área Calculada -->
        <div class="p-4 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between">
          <div>
            <span class="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Área Calculada Automaticamente</span>
            <div class="flex items-baseline gap-3 mt-0.5">
              <span id="preview-area-m2" class="text-xl font-bold font-mono text-emerald-950">500.00 m²</span>
              <span id="preview-area-ha" class="text-sm font-semibold font-mono text-emerald-700">0.0500 ha</span>
            </div>
          </div>
          <span class="text-2xl">📐</span>
        </div>

        <!-- Seção de Geolocalização Opcional -->
        <div class="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <span class="block text-xs font-bold text-slate-700 uppercase">Geolocalização Opcional (GPS do Dispositivo)</span>
              <p class="text-xs text-slate-500">Funciona sem internet. O GPS pode apresentar imprecisão sob dossel florestal denso.</p>
            </div>
            <button type="button" id="btn-abrir-gps-modal" class="btn-secondary text-xs py-1 px-3">
              📍 Gerenciar Coordenadas
            </button>
          </div>
          <div id="resumo-coords-parcela" class="text-xs text-slate-600 bg-white p-2.5 rounded border border-slate-200 font-mono">
            ${e?.coordenadas&&e.coordenadas.tipo!==`nenhum`?`Tipo: ${e.coordenadas.tipo} | ${e.coordenadas.centro?G(e.coordenadas.centro.latitude,e.coordenadas.centro.longitude):`${e.coordenadas.cantos?.length||0} cantos registrados`}`:`Nenhuma coordenada registrada para esta parcela.`}
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
            Observações da Parcela
          </label>
          <textarea id="parc-obs" rows="2" class="field-input w-full text-sm"
            placeholder="Relevo, tipo de solo, vegetação rasteira, marcos físicos...">${e?.observacoes||``}</textarea>
        </div>

        <div class="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button type="button" id="btn-cancelar-parc-2" class="btn-secondary">
            Cancelar
          </button>
          <button type="submit" class="btn-primary">
            ${t?`Salvar Alterações`:`Criar Parcela e Iniciar Coleta`}
          </button>
        </div>
      </form>
    </div>
  `}async function be(){let e=K.inventarioAtivo,t=K.grupoAtivo,n=K.parcelaAtiva;if(!e||!n)return`<div class="p-6">Parcela ou inventário não selecionados.</div>`;let r=await P(n.id),i=await F(e.id),a=new Set;i.forEach(e=>{e.especie?.trim()&&a.add(e.especie.trim())});let o=1;if(r.length>0){let e=r.map(e=>Number(e.numero)).filter(e=>!isNaN(e)&&e>0);o=e.length>0?Math.max(...e)+1:r.length+1}let s=c(n,r),l=r;if(K.filtroEspecie){let e=K.filtroEspecie.toLowerCase();l=r.filter(t=>(t.especie||`não identificada`).toLowerCase().includes(e))}let u=X(t?.id);return`
    <div class="space-y-4">
      <!-- Barra Superior de Navegação -->
      <div class="rounded-xl p-4 border-2 shadow-xs flex flex-wrap items-center justify-between gap-3" style="background:${u.bg};border-color:${u.border}">
        <div>
          <div class="flex items-center gap-2">
            <button id="btn-voltar-ao-grupo" class="text-xs font-semibold flex items-center gap-1" style="color:${u.text}">
              ← ${t?.nome||`Grupo`}
            </button>
            <span style="color:${u.border}">/</span>
            <span class="font-bold font-mono text-base" style="color:${u.text}">${n.codigo}</span>
            ${n.nome?`<span class="text-sm font-semibold" style="color:${u.text}">— ${n.nome}</span>`:``}
          </div>
          <p class="text-xs mt-0.5" style="color:${u.text}">
            <strong>Inventariante:</strong> ${n.inventariante||t?.integrantes||`Não especificado`} • <strong>Área:</strong> ${d(n.areaM2,1)} m² (${d(n.areaHa,4)} ha)
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button id="btn-finalizar-parcela" class="btn-primary text-xs sm:text-sm py-2 px-4 shadow-sm bg-emerald-700 hover:bg-emerald-800">
            ✓ Finalizar Parcela
          </button>
          <button id="btn-ver-estatisticas" class="btn-secondary text-xs sm:text-sm py-2 px-3">
            📊 Resultados
          </button>
        </div>
      </div>

      <!-- Resumo Compacto da Parcela -->
      <section class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        <div class="stat-card p-2.5">
          <span class="label text-[0.68rem]">Árvores Totais</span>
          <span class="value text-lg" id="live-total-arv">${s.totalArvores}</span>
        </div>
        <div class="stat-card p-2.5">
          <span class="label text-[0.68rem]">Válidas (n)</span>
          <span class="value text-lg text-emerald-700" id="live-validas-arv">${s.arvoresValidas}</span>
        </div>
        <div class="stat-card p-2.5">
          <span class="label text-[0.68rem]">Espécies</span>
          <span class="value text-lg">${s.totalEspecies}</span>
        </div>
        <div class="stat-card p-2.5">
          <span class="label text-[0.68rem]">Área (m²)</span>
          <span class="value text-lg font-mono">${d(n.areaM2,0)}</span>
        </div>
        <div class="stat-card p-2.5">
          <span class="label text-[0.68rem]">CAP Médio</span>
          <span class="value text-lg font-mono">${d(s.capMedio,1,` cm`)}</span>
        </div>
        <div class="stat-card p-2.5">
          <span class="label text-[0.68rem]">DAP Médio</span>
          <span class="value text-lg font-mono">${d(s.dapMedio,1,` cm`)}</span>
        </div>
        <div class="stat-card p-2.5">
          <span class="label text-[0.68rem]">G Total (m²)</span>
          <span class="value text-lg font-mono text-emerald-800">${d(s.areaBasalTotal,4)}</span>
        </div>
        <div class="stat-card p-2.5">
          <span class="label text-[0.68rem]">G/ha (m²/ha)</span>
          <span class="value text-lg font-mono text-emerald-900 font-bold">${d(s.areaBasalPorHectare,2)}</span>
        </div>
      </section>

      <!-- BARRA DE ENTRADA RÁPIDA DE ÁRVORES -->
      <section class="bg-white rounded-xl border-2 border-emerald-800 shadow-md p-4 sm:p-5">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-emerald-600 animate-pulse"></span>
            <h3 class="font-bold text-slate-900 text-sm sm:text-base uppercase tracking-wider">
              Entrada Rápida de Medição
            </h3>
          </div>
          <span class="text-xs text-slate-500 hidden sm:inline">Pressione Enter para salvar e ir para a próxima</span>
        </div>

        <form id="form-coleta-arvore" class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div class="sm:col-span-2">
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Nº Árvore *
            </label>
            <input type="number" id="input-arv-numero" required class="field-input w-full font-mono font-bold text-center"
              value="${o}" min="1">
          </div>

          <div class="sm:col-span-4 autocomplete-container">
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Espécie (Opcional)
            </label>
            <input type="text" id="input-arv-especie" class="field-input w-full"
              placeholder="Digite o nome ou selecione..."
              autocomplete="off">
            <div id="autocomplete-lista" class="autocomplete-dropdown hidden"></div>
          </div>

          <div class="sm:col-span-3">
            <div class="flex items-center justify-between mb-1">
              <label class="text-xs font-bold text-slate-900 uppercase">
                CAP (cm) *
              </label>
              <span id="preview-dap-live" class="text-xs font-mono font-bold text-emerald-800">DAP: —</span>
            </div>
            <input type="number" step="0.1" min="0.1" inputmode="decimal" id="input-arv-cap"
              class="field-input w-full font-mono text-lg font-bold bg-emerald-50/40 border-emerald-600 text-slate-900"
              placeholder="Ex: 58.5">
          </div>

          <div class="sm:col-span-3 flex gap-2">
            <button type="submit" id="btn-adicionar-arvore" class="btn-primary w-full py-3 text-sm font-bold shadow-sm">
              <span>+</span> Adicionar
            </button>
          </div>

          <div class="sm:col-span-12 flex flex-wrap items-center justify-between text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
            <div class="flex items-center gap-4">
              <span><strong>DAP calculado:</strong> <span id="live-dap-val" class="font-mono text-emerald-900 font-bold">—</span></span>
              <span><strong>Área transversal (g):</strong> <span id="live-g-val" class="font-mono text-emerald-900 font-bold">—</span></span>
            </div>
            <div class="flex items-center gap-2 mt-1 sm:mt-0">
              <input type="text" id="input-arv-obs" placeholder="Observações opcionais (fuste, bifurcação...)"
                class="field-input py-1 text-xs w-60">
            </div>
          </div>
        </form>
      </section>

      <!-- Lista / Planilha de Medições Registradas -->
      <section class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
          <div class="flex items-center gap-3">
            <h3 class="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <span>📋</span> Planilha de Medições (${r.length} árvores)
            </h3>
            ${s.arvoresIncompletas>0?`<span class="badge-warning text-[0.7rem]">${s.arvoresIncompletas} incompleta(s)</span>`:``}
          </div>

          <div class="flex items-center gap-2">
            <input type="text" id="filtro-especie-input" placeholder="Filtrar por espécie..."
              value="${K.filtroEspecie}" class="field-input py-1 px-2.5 text-xs w-48">
            ${K.filtroEspecie?`<button id="btn-limpar-filtro" class="text-xs text-slate-500 hover:text-slate-800">Limpar</button>`:``}
          </div>
        </div>

        ${r.length===0?`
          <div class="p-8 text-center text-slate-500 text-sm space-y-2">
            <p>Nenhuma árvore cadastrada nesta parcela ainda.</p>
            <p class="text-xs text-slate-400">Utilize a barra de entrada rápida acima para começar a registrar.</p>
          </div>
        `:`
          <div class="overflow-x-auto max-h-[500px]">
            <table class="inventory-table">
              <thead class="sticky top-0 z-10">
                <tr>
                  <th class="w-16">Nº</th>
                  <th>Espécie</th>
                  <th>CAP (cm)</th>
                  <th>DAP (cm)</th>
                  <th>Área Transv. g (m²)</th>
                  <th>Status</th>
                  <th>Observações</th>
                  <th class="text-right w-24">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${l.map(e=>{let t=e.status===`valida`?`badge-success`:e.status===`incompleta`?`badge-warning`:`bg-rose-100 text-rose-800`;return`
                    <tr class="${e.status===`valida`?``:`bg-amber-50/40`}">
                      <td class="font-bold font-mono text-emerald-950 text-center">${e.numero}</td>
                      <td class="font-medium text-slate-800">
                        ${e.especie?e.especie:`<span class="text-slate-400 italic">Não identificada</span>`}
                      </td>
                      <td class="font-mono font-semibold">${d(e.cap,1)}</td>
                      <td class="font-mono font-bold text-emerald-900">${d(e.dap,2)}</td>
                      <td class="font-mono text-emerald-800">${d(e.g,6)}</td>
                      <td>
                        <span class="${t} text-[0.7rem] px-2 py-0.5 rounded-full inline-block">
                          ${e.status===`valida`?`Válida`:e.status===`incompleta`?`Incompleta`:`Inválida`}
                        </span>
                      </td>
                      <td class="text-xs text-slate-500 max-w-xs truncate" title="${e.observacoes||``}">${e.observacoes||`—`}</td>
                      <td class="text-right space-x-1 whitespace-nowrap">
                        <button data-action="editar-arvore" data-id="${e.id}" title="Editar" class="p-1.5 rounded hover:bg-slate-200 text-slate-700 text-xs">
                          ✏️
                        </button>
                        <button data-action="excluir-arvore" data-id="${e.id}" data-num="${e.numero}" title="Excluir" class="p-1.5 rounded hover:bg-rose-100 text-rose-700 text-xs">
                          🗑️
                        </button>
                      </td>
                    </tr>
                  `}).join(``)}
              </tbody>
            </table>
          </div>
        `}
      </section>
    </div>
  `}async function xe(){let e=K.parcelaAtiva,t=K.grupoAtivo,n=K.inventarioAtivo;if(!e||!n)return`<div class="p-6">Parcela não selecionada.</div>`;let r=await P(e.id),i=c(e,r),a=l(e,r);return`
    <div class="space-y-6">
      <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <button id="btn-voltar-coleta" class="text-xs text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1">
              ← Coleta da Parcela
            </button>
            <span class="text-slate-300">/</span>
            <span class="text-xs text-emerald-800 font-bold">Resultados Estatísticos</span>
          </div>
          <h2 class="text-xl font-bold text-slate-900 mt-1">
            Parcela ${e.codigo}${e.nome?` — ${e.nome}`:``}
          </h2>
          <p class="text-xs text-slate-600 mt-0.5">
            <strong>Grupo:</strong> ${t?.nome||`Geral`} • <strong>Inventariante:</strong> ${e.inventariante||`Não especificado`} • <strong>Área:</strong> ${d(e.areaM2,1)} m² (${d(e.areaHa,4)} ha)
          </p>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <button id="btn-reabrir-parcela" class="btn-secondary text-xs sm:text-sm py-2 px-3">
            ✏️ Reabrir Coleta
          </button>
          <button id="btn-exportar-csv-parcela" class="btn-primary text-xs sm:text-sm py-2 px-4">
            📥 Exportar CSV da Parcela
          </button>
        </div>
      </div>

      <!-- 12 Indicadores Obrigatórios -->
      <section class="space-y-3">
        <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wide">
          Estatísticas Descritivas Obrigatórias da Parcela
        </h3>

        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <div class="stat-card">
            <span class="label">Árvores Cadastradas</span>
            <span class="value">${i.totalArvores}</span>
            <span class="subtext">${i.arvoresIncompletas} incompleta(s)</span>
          </div>

          <div class="stat-card">
            <span class="label">Árvores Válidas (n)</span>
            <span class="value text-emerald-700">${i.arvoresValidas}</span>
            <span class="subtext">Com CAP válido para cálculos</span>
          </div>

          <div class="stat-card">
            <span class="label">Espécies Identificadas</span>
            <span class="value">${i.totalEspecies}</span>
            <span class="subtext">Riqueza na parcela</span>
          </div>

          <div class="stat-card">
            <span class="label">CAP Médio</span>
            <span class="value font-mono">${d(i.capMedio,2,` cm`)}</span>
            <span class="subtext">Média aritmética dos CAPs</span>
          </div>

          <div class="stat-card">
            <span class="label">DAP Médio</span>
            <span class="value font-mono text-emerald-900">${d(i.dapMedio,2,` cm`)}</span>
            <span class="subtext">Média dos DAPs válidos</span>
          </div>

          <div class="stat-card">
            <span class="label">DAP Mediano</span>
            <span class="value font-mono">${d(i.dapMediano,2,` cm`)}</span>
            <span class="subtext">${i.arvoresValidas%2==0?`Média dos 2 centrais (par)`:`Valor central (ímpar)`}</span>
          </div>

          <div class="stat-card">
            <span class="label">Variância Amostral DAP (s²)</span>
            <span class="value font-mono">
              ${i.dapVariancia===null?`<span class="text-sm text-slate-400">Indisponível (n < 2)</span>`:d(i.dapVariancia,4,` cm²`)}
            </span>
            <span class="subtext">Graus de liberdade (n − 1)</span>
          </div>

          <div class="stat-card">
            <span class="label">Desvio Padrão Amostral (s)</span>
            <span class="value font-mono">
              ${i.dapDesvioPadrao===null?`<span class="text-sm text-slate-400">Indisponível (n < 2)</span>`:d(i.dapDesvioPadrao,2,` cm`)}
            </span>
            <span class="subtext">s = √s²</span>
          </div>

          <div class="stat-card">
            <span class="label">DAP Mínimo e Máximo</span>
            <span class="value text-base font-mono">
              ${d(i.dapMinimo,1)} a ${d(i.dapMaximo,1)} cm
            </span>
            <span class="subtext">Amplitude observada</span>
          </div>

          <div class="stat-card">
            <span class="label">Área Basal Total (G_parcela)</span>
            <span class="value font-mono text-emerald-800">${d(i.areaBasalTotal,4)} m²</span>
            <span class="subtext">G = Σ g_i</span>
          </div>

          <div class="stat-card col-span-2 bg-emerald-900 text-white border-emerald-950">
            <span class="label text-emerald-300">Área Basal por Hectare (G/ha)</span>
            <span class="value text-white font-mono text-2xl sm:text-3xl">${d(i.areaBasalPorHectare,2)} m²/ha</span>
            <span class="subtext text-emerald-200">Gha = G_parcela / Área_ha (${d(e.areaHa,4)} ha)</span>
          </div>
        </div>
      </section>

      <!-- Resumo por Espécie -->
      <section class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 class="font-bold text-slate-900 text-base flex items-center gap-2">
              <span>🌿</span> Estrutura e Resumo por Espécie (${a.length})
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">
              * Nota metodológica: A área basal por hectare de cada espécie utiliza a área total da parcela como denominador.
            </p>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="inventory-table">
            <thead>
              <tr>
                <th>Espécie</th>
                <th>Árvores Válidas (n)</th>
                <th>DAP Médio (cm)</th>
                <th>DAP Mediano (cm)</th>
                <th>Variância s² (cm²)</th>
                <th>Desvio Padrão s (cm)</th>
                <th>Área Basal Total (m²)</th>
                <th>Área Basal por ha (m²/ha)</th>
                <th>Proporção (%)</th>
              </tr>
            </thead>
            <tbody>
              ${a.map(e=>`
                <tr>
                  <td class="font-bold text-slate-900">${e.especie}</td>
                  <td class="font-mono text-center font-semibold text-emerald-900">${e.arvoresValidas}</td>
                  <td class="font-mono">${d(e.dapMedio,2)}</td>
                  <td class="font-mono">${d(e.dapMediano,2)}</td>
                  <td class="font-mono">${e.dapVariancia===null?`—`:d(e.dapVariancia,3)}</td>
                  <td class="font-mono">${e.dapDesvioPadrao===null?`—`:d(e.dapDesvioPadrao,2)}</td>
                  <td class="font-mono text-emerald-900 font-semibold">${d(e.areaBasalTotal,4)}</td>
                  <td class="font-mono text-emerald-900 font-bold">${d(e.areaBasalPorHectare,2)}</td>
                  <td class="font-mono text-slate-600">${d(e.proporcaoAreaBasal,1)}%</td>
                </tr>
              `).join(``)}
            </tbody>
          </table>
        </div>
      </section>

      <!-- Lista de Árvores da Parcela -->
      <section class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 class="font-bold text-slate-900 text-base">
            Medições Individuais das Árvores (${r.length})
          </h3>
        </div>
        <div class="overflow-x-auto max-h-96">
          <table class="inventory-table">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Espécie</th>
                <th>CAP (cm)</th>
                <th>DAP (cm)</th>
                <th>g (m²)</th>
                <th>Status</th>
                <th>Observações</th>
              </tr>
            </thead>
            <tbody>
              ${r.map(e=>`
                <tr>
                  <td class="font-mono font-bold text-center">${e.numero}</td>
                  <td>${e.especie||`<span class="italic text-slate-400">Não identificada</span>`}</td>
                  <td class="font-mono">${d(e.cap,1)}</td>
                  <td class="font-mono font-bold text-emerald-900">${d(e.dap,2)}</td>
                  <td class="font-mono">${d(e.g,6)}</td>
                  <td>
                    <span class="${e.status===`valida`?`badge-success`:`badge-warning`} text-[0.7rem]">
                      ${e.status===`valida`?`Válida`:`Incompleta`}
                    </span>
                  </td>
                  <td class="text-xs text-slate-500">${e.observacoes||`—`}</td>
                </tr>
              `).join(``)}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `}async function Se(){let e=K.inventarioAtivo;if(!e)return`<div class="p-6">Inventário não selecionado.</div>`;let t=await k(e.id),n={};for(let e of t)n[e.id]=await P(e.id);let r=u(t,n);return`
    <div class="space-y-6">
      <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <button id="btn-voltar-inventario-sintese" class="text-xs text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1">
              ← ${e.nome}
            </button>
            <span class="text-slate-300">/</span>
            <span class="text-xs text-emerald-800 font-bold">Síntese Geral</span>
          </div>
          <h2 class="text-xl font-bold text-slate-900 mt-1">
            Síntese Geral: ${e.nome}
          </h2>
          <p class="text-xs text-slate-600 mt-0.5">
            ${e.disciplina||`LCF0510 - Inventário Florestal`} • Professores: ${e.professores||`Matheus e Jonathan`} • Monitor: ${e.monitor||`Matheus Siqueira Barros`}
          </p>
        </div>

        <button id="btn-exportar-sintese-csv" class="btn-primary text-xs sm:text-sm py-2 px-4">
          📥 Exportar Resumo do Inventário
        </button>
      </div>

      <section class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div class="stat-card">
          <span class="label">Total de Parcelas</span>
          <span class="value">${r.totalParcelas}</span>
        </div>
        <div class="stat-card">
          <span class="label">Árvores Totais</span>
          <span class="value">${r.totalArvores}</span>
          <span class="subtext">${r.totalArvoresValidas} válidas</span>
        </div>
        <div class="stat-card">
          <span class="label">Total de Espécies</span>
          <span class="value">${r.totalEspecies}</span>
        </div>
        <div class="stat-card">
          <span class="label">Área Amostrada</span>
          <span class="value font-mono">${d(r.areaTotalAmostradaHa,4)} ha</span>
          <span class="subtext">${d(r.areaTotalAmostradaM2,1)} m²</span>
        </div>
        <div class="stat-card">
          <span class="label">Soma Áreas Basais (G)</span>
          <span class="value font-mono text-emerald-800">${d(r.somaAreasBasais,4)} m²</span>
        </div>
        <div class="stat-card">
          <span class="label">DAP Médio Geral</span>
          <span class="value font-mono text-emerald-900">${d(r.dapMedioGeral,2,` cm`)}</span>
        </div>
      </section>

      <!-- Tabela Comparativa entre Parcelas -->
      <section class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="p-4 border-b border-slate-200 bg-slate-50">
          <h3 class="font-bold text-slate-900 text-base">
            Comparação Detalhada entre Parcelas
          </h3>
        </div>
        <div class="overflow-x-auto">
          <table class="inventory-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nome da Parcela</th>
                <th>Inventariante</th>
                <th>Formato</th>
                <th>Área (m²)</th>
                <th>Área (ha)</th>
                <th>Árvores Válidas</th>
                <th>DAP Médio (cm)</th>
                <th>Área Basal Total (m²)</th>
                <th>Área Basal por ha (m²/ha)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${r.parcelasResumo.map(e=>`
                <tr>
                  <td class="font-bold font-mono text-emerald-900">${e.codigo}</td>
                  <td class="font-semibold text-slate-800">${e.nome||`—`}</td>
                  <td class="text-xs text-slate-600">${e.inventariante||`—`}</td>
                  <td class="capitalize">${e.formato}</td>
                  <td class="font-mono">${d(e.areaM2,1)}</td>
                  <td class="font-mono">${d(e.areaHa,4)}</td>
                  <td class="font-mono">${e.arvoresValidas} / ${e.totalArvores}</td>
                  <td class="font-mono">${d(e.dapMedio,2)}</td>
                  <td class="font-mono text-emerald-900 font-semibold">${d(e.areaBasalTotal,4)}</td>
                  <td class="font-mono text-emerald-900 font-bold">${d(e.areaBasalPorHectare,2)}</td>
                  <td>
                    <span class="${e.status===`concluida`?`badge-success`:`badge-warning`} text-[0.7rem]">
                      ${e.status===`concluida`?`Concluída`:`Em andamento`}
                    </span>
                  </td>
                </tr>
              `).join(``)}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `}async function Ce(){return`
    <div class="max-w-4xl mx-auto space-y-6">
      <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
        <h2 class="text-xl font-bold text-slate-900 flex items-center gap-2">
          <span>📥</span> Exportação de Dados e Backup
        </h2>
        <p class="text-xs text-slate-600 mt-1">
          Exporte os dados em formatos abertos e padronizados para Excel, LibreOffice, R, Python ou SIG.
        </p>

        <div class="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span class="block text-xs font-bold text-slate-700 uppercase">Delimitador do CSV:</span>
            <span class="text-xs text-slate-500">
              Ponto-e-vírgula é o padrão para Excel em português (Brasil com vírgula decimal).
            </span>
          </div>
          <div class="flex items-center gap-3">
            <label class="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
              <input type="radio" name="delimitador-csv" value=";" ${K.delimitadorCSV===`;`?`checked`:``}>
              <span>Ponto-e-vírgula (;) — Excel Brasil</span>
            </label>
            <label class="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
              <input type="radio" name="delimitador-csv" value="," ${K.delimitadorCSV===`,`?`checked`:``}>
              <span>Vírgula (,) — R / Python / US</span>
            </label>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
          <div class="space-y-1.5">
            <div class="flex items-center gap-2">
              <span class="text-xl">🌳</span>
              <h3 class="font-bold text-slate-900 text-base">1. Dados Individuais por Árvore</h3>
            </div>
            <p class="text-xs text-slate-600 leading-relaxed">
              Uma linha por árvore de todos os inventários e grupos, contendo parcela, inventariante, dimensões, CAP, DAP, g, status e GPS.
            </p>
          </div>
          <button id="btn-export-arvores" class="btn-primary w-full text-xs py-2.5">
            Baixar arvores_individuais.csv
          </button>
        </div>

        <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
          <div class="space-y-1.5">
            <div class="flex items-center gap-2">
              <span class="text-xl">📐</span>
              <h3 class="font-bold text-slate-900 text-base">2. Resumo por Parcela</h3>
            </div>
            <p class="text-xs text-slate-600 leading-relaxed">
              Uma linha por parcela, contendo código, nome, inventariante, área, N de árvores, médias de DAP, variância amostral, G e G/ha.
            </p>
          </div>
          <button id="btn-export-parcelas" class="btn-primary w-full text-xs py-2.5">
            Baixar resumo_parcelas.csv
          </button>
        </div>

        <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
          <div class="space-y-1.5">
            <div class="flex items-center gap-2">
              <span class="text-xl">🌿</span>
              <h3 class="font-bold text-slate-900 text-base">3. Resumo por Espécie</h3>
            </div>
            <p class="text-xs text-slate-600 leading-relaxed">
              Uma linha por espécie e parcela, contendo N de árvores, DAP médio, mediana, variância, desvio padrão, área basal e G/ha.
            </p>
          </div>
          <button id="btn-export-especies" class="btn-primary w-full text-xs py-2.5">
            Baixar resumo_especies.csv
          </button>
        </div>

        <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
          <div class="space-y-1.5">
            <div class="flex items-center gap-2">
              <span class="text-xl">💾</span>
              <h3 class="font-bold text-slate-900 text-base">4. Backup Completo (JSON)</h3>
            </div>
            <p class="text-xs text-slate-600 leading-relaxed">
              Arquivo estruturado com inventários, grupos, parcelas, árvores e configurações.
            </p>
          </div>
          <button id="btn-export-json" class="btn-secondary w-full text-xs py-2.5">
            Baixar backup_completo.json
          </button>
        </div>
      </div>

      <section class="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3">
        <h3 class="font-bold text-slate-900 text-base flex items-center gap-2">
          <span>🔄</span> Restaurar Backup JSON
        </h3>
        <p class="text-xs text-slate-600">
          Selecione um arquivo de backup previamente exportado. Os inventários, grupos, parcelas e medições serão validados e restaurados.
        </p>

        <div class="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <input type="file" id="input-arquivo-backup" accept=".json,application/json"
            class="field-input py-2 text-xs w-full sm:w-auto flex-1">
          <button id="btn-importar-backup" class="btn-primary text-xs py-2.5 px-5 w-full sm:w-auto">
            Importar Arquivo
          </button>
        </div>
      </section>
    </div>
  `}function we(){return`
    <div class="max-w-4xl mx-auto space-y-6">
      <div class="bg-white rounded-xl p-6 border border-slate-200 shadow-xs">
        <h2 class="text-xl font-bold text-slate-900 flex items-center gap-2">
          <span>📖</span> Guia Didático e Fórmulas Dendrométricas
        </h2>
        <p class="text-xs text-slate-500 mt-1">
          Disciplina: LCF0510 - Inventário Florestal — ESALQ/USP | CMQ — Centro de Métodos Quantitativos
        </p>
        <p class="text-xs text-slate-600 mt-0.5">
          Professores: Matheus Pinheiro Ferreira e Jonathan Trautenmüller • Monitor: Matheus Siqueira Barros
        </p>
      </div>

      <div class="space-y-4">
        <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-2">
          <h3 class="font-bold text-emerald-900 text-base">1. Circunferência e Diâmetro à Altura do Peito (CAP e DAP)</h3>
          <p class="text-xs text-slate-700 leading-relaxed">
            A <strong>CAP</strong> (em cm) é obtida em campo com fita métrica a 1,30 metro do solo.
            O <strong>DAP</strong> (em cm) é o diâmetro calculado a partir da relação geométrica com a constante π:
          </p>
          <div class="bg-slate-50 p-3 rounded-lg font-mono text-xs text-slate-900 border border-slate-200 font-bold">
            DAP (cm) = CAP (cm) / π
          </div>
        </div>

        <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-2">
          <h3 class="font-bold text-emerald-900 text-base">2. Área Transversal Individual (g)</h3>
          <p class="text-xs text-slate-700 leading-relaxed">
            A área transversal <strong>g</strong> (em m²) representa a seção do tronco a 1,30 m do solo:
          </p>
          <div class="bg-slate-50 p-3 rounded-lg font-mono text-xs text-slate-900 border border-slate-200 font-bold">
            g (m²) = (π × DAP²) / 40.000 = CAP² / (40.000 × π)
          </div>
        </div>

        <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-2">
          <h3 class="font-bold text-emerald-900 text-base">3. Área Basal da Parcela (G) e por Hectare (G/ha)</h3>
          <p class="text-xs text-slate-700 leading-relaxed">
            Soma das áreas transversais e expansão para 1 hectare (10.000 m²):
          </p>
          <div class="bg-slate-50 p-3 rounded-lg font-mono text-xs text-slate-900 border border-slate-200 font-bold space-y-1">
            <div>G_parcela (m²) = Σ g_i</div>
            <div>Gha (m²/ha) = G_parcela / Área_da_Parcela (ha)</div>
          </div>
        </div>

        <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-2">
          <h3 class="font-bold text-emerald-900 text-base">4. Variância Amostral (s²) com Denominador n − 1</h3>
          <p class="text-xs text-slate-700 leading-relaxed">
            Utiliza graus de liberdade n − 1 (Correção de Bessel):
          </p>
          <div class="bg-slate-50 p-3 rounded-lg font-mono text-xs text-slate-900 border border-slate-200 font-bold space-y-1">
            <div>Média DAP = Σ DAP_i / n</div>
            <div>s² (cm²) = Σ(DAP_i − Média)² / (n − 1)</div>
            <div>s (cm) = √s²</div>
          </div>
        </div>
      </div>
    </div>
  `}function Te(){let e=oe(),t=e.filter(e=>e.passou).length;return`
    <div class="max-w-4xl mx-auto space-y-6">
      <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span>🧪</span> Testes do Sistema e Verificação Matemática
          </h2>
          <p class="text-xs text-slate-500 mt-1">
            Auditoria automatizada dos 20 requisitos matemáticos e funcionais obrigatórios.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <span class="px-3 py-1.5 rounded-lg text-xs font-bold ${t===e.length?`bg-emerald-100 text-emerald-900 border border-emerald-300`:`bg-rose-100 text-rose-900`}">
            ${t} / ${e.length} Testes Aprovados
          </span>
          <button id="btn-reexecutar-testes" class="btn-primary text-xs py-1.5 px-3">
            Reexecutar
          </button>
        </div>
      </div>

      <div class="space-y-3">
        ${e.map(e=>`
          <div class="bg-white rounded-xl p-4 border ${e.passou?`border-slate-200`:`border-rose-400 bg-rose-50/20`} shadow-xs flex items-start gap-3">
            <div class="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${e.passou?`bg-emerald-100 text-emerald-800`:`bg-rose-100 text-rose-800 font-bold`}">
              ${e.passou?`✓`:`✕`}
            </div>
            <div class="flex-1 space-y-1">
              <div class="flex items-center justify-between">
                <h4 class="font-bold text-sm text-slate-900">
                  #${e.numero}. ${e.nome}
                </h4>
                <span class="text-xs font-semibold ${e.passou?`text-emerald-700`:`text-rose-700`}">
                  ${e.passou?`Aprovado`:`Falhou`}
                </span>
              </div>
              <p class="text-xs text-slate-600">${e.descricao}</p>
              <div class="text-[0.75rem] font-mono bg-slate-50 p-2 rounded border border-slate-100 text-slate-700">
                <span>Resultado: ${e.detalhes}</span>
                ${e.obtido?`<span class="block text-slate-500">Obtido: ${e.obtido}</span>`:``}
              </div>
            </div>
          </div>
        `).join(``)}
      </div>
    </div>
  `}function Ee(){document.getElementById(`nav-brand-home`)?.addEventListener(`click`,()=>Z(`dashboard`));let e=document.getElementById(`nav-btn-ajuda`);e&&ue(e,{onClick:()=>Z(`ajuda`),onHold:async()=>{U(await R(),`inventario-log-${new Date().toISOString().replace(/[:.]/g,`-`)}.txt`,`text/plain;charset=utf-8`),q(`Registro baixado.`)}}),document.getElementById(`btn-novo-inventario`)?.addEventListener(`click`,()=>Z(`inventario-novo`)),document.querySelectorAll(`[data-action="abrir-inventario"]`).forEach(e=>{e.addEventListener(`click`,e=>{let t=e.currentTarget.getAttribute(`data-id`);t&&Z(`inventario-detalhes`,t)})}),document.querySelectorAll(`[data-action="editar-inventario"]`).forEach(e=>{ue(e,{onClick:async e=>{let t=e.getAttribute(`data-id`);t&&(K.inventarioAtivo=await S(t),Z(`inventario-editar`))},onHold:e=>{let t=e.getAttribute(`data-id`),n=e.getAttribute(`data-nome`)||`este inventário`;t&&(J(`Excluir inventário?`,`<p class="text-sm text-slate-700">Deseja apagar <strong>${n}</strong>? Todos os grupos, parcelas e árvores serão removidos permanentemente.</p>`,`
            <button id="modal-cancel-del-inv" class="btn-secondary text-xs px-4 py-2">Cancelar</button>
            <button id="modal-confirm-del-inv" class="btn-primary text-xs px-4 py-2 bg-rose-700 hover:bg-rose-800 border-rose-900">Apagar</button>
          `),document.getElementById(`modal-cancel-del-inv`)?.addEventListener(`click`,Y),document.getElementById(`modal-confirm-del-inv`)?.addEventListener(`click`,async()=>{await w(t),Y(),q(`Inventário excluído com sucesso.`),Q()}))}})}),document.getElementById(`btn-cancelar-inv`)?.addEventListener(`click`,()=>Z(`dashboard`)),document.getElementById(`btn-cancelar-inv-2`)?.addEventListener(`click`,()=>Z(`dashboard`)),document.getElementById(`form-inventario`)?.addEventListener(`submit`,async e=>{e.preventDefault();let t={id:document.getElementById(`inv-id`).value||`inv-`+Date.now(),nome:document.getElementById(`inv-nome`).value.trim(),disciplina:document.getElementById(`inv-disciplina`).value.trim(),turma:document.getElementById(`inv-turma`).value.trim(),professores:document.getElementById(`inv-professores`).value.trim(),monitor:document.getElementById(`inv-monitor`).value.trim(),data:document.getElementById(`inv-data`).value,responsavel:document.getElementById(`inv-responsavel`).value.trim(),metodoAmostragem:document.getElementById(`inv-metodo`).value,observacoes:document.getElementById(`inv-obs`).value.trim(),isDemo:!1,criadoEm:K.inventarioAtivo?.criadoEm||new Date().toISOString(),atualizadoEm:new Date().toISOString()};await C(t),K.inventarioAtivo=t,q(`Inventário salvo com sucesso!`),Z(`inventario-detalhes`,t.id)}),document.getElementById(`btn-voltar-dashboard`)?.addEventListener(`click`,()=>Z(`dashboard`)),document.getElementById(`btn-novo-grupo`)?.addEventListener(`click`,()=>Z(`grupo-novo`)),document.getElementById(`btn-novo-grupo-empty`)?.addEventListener(`click`,()=>Z(`grupo-novo`)),document.getElementById(`btn-abrir-sintese`)?.addEventListener(`click`,()=>{K.inventarioAtivo&&Z(`inventario-sintese`,K.inventarioAtivo.id)}),document.getElementById(`btn-editar-inv`)?.addEventListener(`click`,()=>Z(`inventario-editar`)),document.querySelectorAll(`[data-action="abrir-grupo"]`).forEach(e=>{e.addEventListener(`click`,e=>{let t=e.currentTarget.getAttribute(`data-id`);t&&K.inventarioAtivo&&Z(`grupo-detalhes`,K.inventarioAtivo.id,t)})}),document.querySelectorAll(`[data-action="editar-grupo"]`).forEach(e=>{ue(e,{onClick:async e=>{let t=e.getAttribute(`data-id`);t&&K.inventarioAtivo&&(K.grupoAtivo=await E(t),Z(`grupo-editar`,K.inventarioAtivo.id,t))},onHold:e=>{let t=e.getAttribute(`data-id`),n=e.getAttribute(`data-nome`)||`este grupo`;t&&(J(`Excluir grupo?`,`<p class="text-sm text-slate-700">Deseja apagar <strong>${n}</strong>? Todas as parcelas e árvores do grupo serão removidas permanentemente.</p>`,`
            <button id="modal-cancel-del-grp" class="btn-secondary text-xs px-4 py-2">Cancelar</button>
            <button id="modal-confirm-del-grp" class="btn-primary text-xs px-4 py-2 bg-rose-700 hover:bg-rose-800 border-rose-900">Apagar</button>
          `),document.getElementById(`modal-cancel-del-grp`)?.addEventListener(`click`,Y),document.getElementById(`modal-confirm-del-grp`)?.addEventListener(`click`,async()=>{await O(t),Y(),q(`Grupo "${n}" excluído.`),Q()}))}})}),document.querySelectorAll(`[data-action="baixar-csv-grupo"]`).forEach(e=>{e.addEventListener(`click`,async e=>{let t=e.currentTarget.getAttribute(`data-id`);if(!t||!K.inventarioAtivo)return;let n=await E(t);if(!n)return;let r=await A(n.id),i=await F(K.inventarioAtivo.id);U(re(K.inventarioAtivo,n,r,i,K.delimitadorCSV),`dados_${n.nome.replace(/\s+/g,`_`).toLowerCase()}_completo.csv`,`text/csv;charset=utf-8;`),q(`CSV completo do ${n.nome} baixado com sucesso!`)})}),document.getElementById(`btn-voltar-inventario-detalhes`)?.addEventListener(`click`,()=>{K.inventarioAtivo&&Z(`inventario-detalhes`,K.inventarioAtivo.id)}),document.getElementById(`btn-nova-parcela-grupo`)?.addEventListener(`click`,()=>Z(`parcela-nova`)),document.getElementById(`btn-nova-parcela-grupo-empty`)?.addEventListener(`click`,()=>Z(`parcela-nova`)),document.getElementById(`btn-baixar-csv-deste-grupo`)?.addEventListener(`click`,async()=>{if(!K.grupoAtivo||!K.inventarioAtivo)return;let e=await A(K.grupoAtivo.id),t=await F(K.inventarioAtivo.id);U(re(K.inventarioAtivo,K.grupoAtivo,e,t,K.delimitadorCSV),`dados_${K.grupoAtivo.nome.replace(/\s+/g,`_`).toLowerCase()}_completo.csv`,`text/csv;charset=utf-8;`),q(`CSV completo do ${K.grupoAtivo.nome} baixado com sucesso!`)}),document.getElementById(`btn-editar-grupo-atual`)?.addEventListener(`click`,()=>{K.inventarioAtivo&&K.grupoAtivo&&Z(`grupo-editar`,K.inventarioAtivo.id,K.grupoAtivo.id)}),document.getElementById(`btn-cancelar-grupo`)?.addEventListener(`click`,()=>{K.inventarioAtivo&&Z(`inventario-detalhes`,K.inventarioAtivo.id)}),document.getElementById(`btn-cancelar-grupo-2`)?.addEventListener(`click`,()=>{K.inventarioAtivo&&Z(`inventario-detalhes`,K.inventarioAtivo.id)}),document.getElementById(`form-grupo`)?.addEventListener(`submit`,async e=>{if(e.preventDefault(),!K.inventarioAtivo)return;let t=document.getElementById(`grupo-id`).value||`grp-`+Date.now(),n=document.getElementById(`grupo-nome`).value.trim(),r=document.getElementById(`grupo-integrantes`).value.trim(),i=document.getElementById(`grupo-obs`).value.trim(),a={id:t,inventarioId:K.inventarioAtivo.id,nome:n,integrantes:r,observacoes:i,criadoEm:K.grupoAtivo?.criadoEm||new Date().toISOString(),atualizadoEm:new Date().toISOString()};await D(a),K.grupoAtivo=a,q(`Grupo "${n}" salvo com sucesso!`),Z(`grupo-detalhes`,K.inventarioAtivo.id,a.id)}),document.querySelectorAll(`[data-action="coletar-parcela"]`).forEach(e=>{e.addEventListener(`click`,e=>{let t=e.currentTarget.getAttribute(`data-id`);t&&K.inventarioAtivo&&K.grupoAtivo&&Z(`coleta-arvores`,K.inventarioAtivo.id,K.grupoAtivo.id,t)})}),document.querySelectorAll(`[data-action="resultados-parcela"]`).forEach(e=>{e.addEventListener(`click`,e=>{let t=e.currentTarget.getAttribute(`data-id`);t&&K.inventarioAtivo&&K.grupoAtivo&&Z(`parcela-resultados`,K.inventarioAtivo.id,K.grupoAtivo.id,t)})}),document.querySelectorAll(`[data-action="editar-parcela"]`).forEach(e=>{e.addEventListener(`click`,e=>{let t=e.currentTarget.getAttribute(`data-id`);t&&K.inventarioAtivo&&K.grupoAtivo&&Z(`parcela-editar`,K.inventarioAtivo.id,K.grupoAtivo.id,t)})}),document.querySelectorAll(`[data-action="gps-parcela"]`).forEach(e=>{e.addEventListener(`click`,async e=>{let t=e.currentTarget.getAttribute(`data-id`);if(!t)return;let n=await j(t);n&&je(n)})}),document.querySelectorAll(`[data-action="excluir-parcela"]`).forEach(e=>{e.addEventListener(`click`,e=>{let t=e.currentTarget.getAttribute(`data-id`),n=e.currentTarget.getAttribute(`data-codigo`)||``;t&&ce(`Remover parcela?`,`<p class="text-sm text-slate-700">Deseja remover de fato a parcela <strong>${n}</strong> e todas as suas árvores? Esta ação fica registrada no log.</p>`,async()=>{await N(t),q(`Parcela ${n} excluída.`),Q()})})}),document.querySelectorAll(`input[name="parc-formato"]`).forEach(e=>{e.addEventListener(`change`,e=>{let t=e.target.value,n=document.getElementById(`container-dims-circular`),r=document.getElementById(`container-dims-retangular`);t===`circular`?(n?.classList.remove(`hidden`),r?.classList.add(`hidden`)):(n?.classList.add(`hidden`),r?.classList.remove(`hidden`)),$()})}),document.getElementById(`parc-circ-tipo-entrada`)?.addEventListener(`change`,$),document.getElementById(`parc-circ-valor`)?.addEventListener(`input`,$),document.getElementById(`parc-rect-comp`)?.addEventListener(`input`,$),document.getElementById(`parc-rect-larg`)?.addEventListener(`input`,$),document.getElementById(`btn-cancelar-parc`)?.addEventListener(`click`,()=>{K.inventarioAtivo&&K.grupoAtivo?Z(`grupo-detalhes`,K.inventarioAtivo.id,K.grupoAtivo.id):K.inventarioAtivo&&Z(`inventario-detalhes`,K.inventarioAtivo.id)}),document.getElementById(`btn-cancelar-parc-2`)?.addEventListener(`click`,()=>{K.inventarioAtivo&&K.grupoAtivo?Z(`grupo-detalhes`,K.inventarioAtivo.id,K.grupoAtivo.id):K.inventarioAtivo&&Z(`inventario-detalhes`,K.inventarioAtivo.id)}),document.getElementById(`btn-abrir-gps-modal`)?.addEventListener(`click`,()=>{K.parcelaAtiva&&je(K.parcelaAtiva)}),document.getElementById(`form-parcela`)?.addEventListener(`submit`,async e=>{if(e.preventDefault(),!K.inventarioAtivo)return;let t=document.getElementById(`parc-id`).value||`parc-`+Date.now(),n=document.getElementById(`parc-grupo-id`).value||K.grupoAtivo?.id,o=document.getElementById(`parc-codigo`).value.trim(),s=document.getElementById(`parc-nome`).value.trim(),c=document.getElementById(`parc-inventariante`).value.trim(),l=document.getElementById(`parc-data`).value,u=document.getElementById(`parc-obs`).value.trim(),d=document.querySelector(`input[name="parc-formato"]:checked`).value,f,p=0;if(d===`circular`){let e=document.getElementById(`parc-circ-tipo-entrada`).value,t=Number(document.getElementById(`parc-circ-valor`).value);p=r(e,t),f={tipo:`circular`,tipoEntrada:e,valorOriginal:t,unidade:`m`}}else{let e=Number(document.getElementById(`parc-rect-comp`).value),t=Number(document.getElementById(`parc-rect-larg`).value);p=i(e,t),f={tipo:`retangular`,comprimento:e,largura:t,unidade:`m`}}let m=a(p),h={id:t,inventarioId:K.inventarioAtivo.id,grupoId:n,codigo:o,nome:s,inventariante:c,formato:d,dimensoes:f,areaM2:p,areaHa:m,observacoes:u,data:l,status:K.parcelaAtiva?.status||`nao_iniciada`,coordenadas:K.parcelaAtiva?.coordenadas||{tipo:`nenhum`},criadoEm:K.parcelaAtiva?.criadoEm||new Date().toISOString(),atualizadoEm:new Date().toISOString()};await M(h),K.parcelaAtiva=h,q(`Parcela ${o} salva com sucesso!`),K.grupoAtivo&&Z(`coleta-arvores`,K.inventarioAtivo.id,K.grupoAtivo.id,h.id)}),document.getElementById(`btn-voltar-ao-grupo`)?.addEventListener(`click`,()=>{K.inventarioAtivo&&K.grupoAtivo&&Z(`grupo-detalhes`,K.inventarioAtivo.id,K.grupoAtivo.id)}),document.getElementById(`btn-finalizar-parcela`)?.addEventListener(`click`,ke),document.getElementById(`btn-ver-estatisticas`)?.addEventListener(`click`,()=>{K.inventarioAtivo&&K.grupoAtivo&&K.parcelaAtiva&&Z(`parcela-resultados`,K.inventarioAtivo.id,K.grupoAtivo.id,K.parcelaAtiva.id)});let s=document.getElementById(`input-arv-cap`);s?.addEventListener(`input`,()=>{let e=Number(s.value),r=document.getElementById(`preview-dap-live`),i=document.getElementById(`live-dap-val`),a=document.getElementById(`live-g-val`);if(e>0){let o=t(e),s=n(e);r&&(r.textContent=`DAP: ${o?.toFixed(2)} cm`),i&&(i.textContent=`${o?.toFixed(2)} cm`),a&&(a.textContent=`${s?.toFixed(6)} m²`)}else r&&(r.textContent=`DAP: —`),i&&(i.textContent=`—`),a&&(a.textContent=`—`)});let c=document.getElementById(`input-arv-especie`),l=document.getElementById(`autocomplete-lista`);c&&l&&K.inventarioAtivo&&(c.addEventListener(`focus`,async()=>{await De(c.value)}),c.addEventListener(`input`,async()=>{await De(c.value)}),document.addEventListener(`click`,e=>{!c.contains(e.target)&&!l.contains(e.target)&&l.classList.add(`hidden`)})),document.getElementById(`form-coleta-arvore`)?.addEventListener(`submit`,async e=>{if(e.preventDefault(),!K.parcelaAtiva||!K.inventarioAtivo)return;let t=document.getElementById(`input-arv-numero`),n=document.getElementById(`input-arv-especie`),r=document.getElementById(`input-arv-cap`),i=document.getElementById(`input-arv-obs`),a=t.value.trim(),s=n.value.trim(),c=r.value.trim(),l=c===``?null:Number(c),u=i.value.trim();if((await P(K.parcelaAtiva.id)).find(e=>String(e.numero).toLowerCase()===String(a).toLowerCase())){alert(`O identificador nº "${a}" já está cadastrado nesta parcela. Escolha um identificador diferente.`),t.focus();return}let d=o({cap:l});await I({id:`arv-`+Date.now()+`-`+Math.random().toString(36).substring(2,6),parcelaId:K.parcelaAtiva.id,inventarioId:K.inventarioAtivo.id,grupoId:K.parcelaAtiva.grupoId||K.grupoAtivo?.id,numero:a,especie:s||``,cap:d.cap,dap:d.dap,g:d.g,observacoes:u,status:d.status,motivoInvalido:d.motivo,criadoEm:new Date().toISOString(),atualizadoEm:new Date().toISOString()}),K.parcelaAtiva.status===`nao_iniciada`&&(K.parcelaAtiva.status=`em_andamento`,await M(K.parcelaAtiva)),q(`Árvore #${a} registrada com sucesso!`),await Q(),setTimeout(()=>{document.getElementById(`input-arv-cap`)?.focus()},50)}),document.getElementById(`filtro-especie-input`)?.addEventListener(`input`,e=>{K.filtroEspecie=e.target.value,Q()}),document.getElementById(`btn-limpar-filtro`)?.addEventListener(`click`,()=>{K.filtroEspecie=``,Q()}),document.querySelectorAll(`[data-action="editar-arvore"]`).forEach(e=>{e.addEventListener(`click`,async e=>{let t=e.currentTarget.getAttribute(`data-id`);if(t&&K.parcelaAtiva){let e=(await P(K.parcelaAtiva.id)).find(e=>e.id===t);e&&Oe(e)}})}),document.querySelectorAll(`[data-action="excluir-arvore"]`).forEach(e=>{e.addEventListener(`click`,e=>{let t=e.currentTarget.getAttribute(`data-id`),n=e.currentTarget.getAttribute(`data-num`)||``;t&&ce(`Remover árvore?`,`<p class="text-sm text-slate-700">Deseja remover de fato a árvore nº <strong>${n}</strong>? Os indicadores da parcela serão recalculados e a exclusão fica registrada no log.</p>`,async()=>{await ee(t),q(`Árvore #${n} removida.`),Q()})})}),document.getElementById(`btn-voltar-coleta`)?.addEventListener(`click`,()=>{K.inventarioAtivo&&K.grupoAtivo&&K.parcelaAtiva&&Z(`coleta-arvores`,K.inventarioAtivo.id,K.grupoAtivo.id,K.parcelaAtiva.id)}),document.getElementById(`btn-reabrir-parcela`)?.addEventListener(`click`,async()=>{K.parcelaAtiva&&(K.parcelaAtiva.status=`em_andamento`,await M(K.parcelaAtiva),q(`Parcela reaberta para edição.`),K.inventarioAtivo&&K.grupoAtivo&&Z(`coleta-arvores`,K.inventarioAtivo.id,K.grupoAtivo.id,K.parcelaAtiva.id))}),document.getElementById(`btn-exportar-csv-parcela`)?.addEventListener(`click`,async()=>{if(!K.parcelaAtiva||!K.inventarioAtivo)return;let e=await P(K.parcelaAtiva.id);U(te([K.inventarioAtivo],[K.parcelaAtiva],e,K.delimitadorCSV),`arvores_parcela_${K.parcelaAtiva.codigo}.csv`,`text/csv;charset=utf-8;`),q(`CSV da parcela baixado com sucesso!`)}),document.getElementById(`btn-voltar-inventario-sintese`)?.addEventListener(`click`,()=>{K.inventarioAtivo&&Z(`inventario-detalhes`,K.inventarioAtivo.id)}),document.getElementById(`btn-exportar-sintese-csv`)?.addEventListener(`click`,async()=>{if(!K.inventarioAtivo)return;let e=await k(K.inventarioAtivo.id),t=await F(K.inventarioAtivo.id);U(W([K.inventarioAtivo],e,t,K.delimitadorCSV),`sintese_${K.inventarioAtivo.nome.replace(/\s+/g,`_`)}.csv`,`text/csv;charset=utf-8;`),q(`Síntese baixada com sucesso!`)}),document.querySelectorAll(`input[name="delimitador-csv"]`).forEach(e=>{e.addEventListener(`change`,e=>{K.delimitadorCSV=e.target.value,q(`Delimitador CSV alterado para "${K.delimitadorCSV}"`)})}),document.getElementById(`btn-export-arvores`)?.addEventListener(`click`,async()=>{let e=await x(),t=[],n=[];for(let r of e){let e=await k(r.id);t=t.concat(e);let i=await F(r.id);n=n.concat(i)}U(te(e,t,n,K.delimitadorCSV),`arvores_individuais_completo.csv`,`text/csv;charset=utf-8;`),q(`Download de árvores individuais concluído!`)}),document.getElementById(`btn-export-parcelas`)?.addEventListener(`click`,async()=>{let e=await x(),t=[],n=[];for(let r of e){let e=await k(r.id);t=t.concat(e);let i=await F(r.id);n=n.concat(i)}U(W(e,t,n,K.delimitadorCSV),`resumo_parcelas_completo.csv`,`text/csv;charset=utf-8;`),q(`Download do resumo de parcelas concluído!`)}),document.getElementById(`btn-export-especies`)?.addEventListener(`click`,async()=>{let e=await x(),t=[],n=[];for(let r of e){let e=await k(r.id);t=t.concat(e);let i=await F(r.id);n=n.concat(i)}U(ne(t,n,K.delimitadorCSV),`resumo_especies_completo.csv`,`text/csv;charset=utf-8;`),q(`Download do resumo por espécie concluído!`)}),document.getElementById(`btn-export-json`)?.addEventListener(`click`,async()=>{let e=await z();U(JSON.stringify(e,null,2),`backup_inventario_esalq_${new Date().toISOString().split(`T`)[0]}.json`,`application/json`),q(`Backup JSON exportado com sucesso!`)}),document.getElementById(`btn-importar-backup`)?.addEventListener(`click`,async()=>{let e=document.getElementById(`input-arquivo-backup`).files?.[0];if(!e)alert(`Por favor, selecione um arquivo de backup (.json).`);else try{let t=await e.text(),n=JSON.parse(t);if(!n.inventarios||!Array.isArray(n.inventarios))throw Error(`Formato de arquivo incompatível ou dados ausentes.`);if(confirm(`Arquivo validado: ${n.inventarios.length} inventário(s), ${n.grupos?.length||0} grupo(s), ${n.parcelas?.length||0} parcela(s) e ${n.arvores?.length||0} árvore(s). Deseja mesclar com seus registros atuais?`)){let e=await B(n,`mesclar`);q(`Backup importado com sucesso: ${e.totalInventarios} inventários e ${e.totalGrupos} grupos restaurados!`),Q()}}catch(e){alert(`Erro ao importar backup: `+(e instanceof Error?e.message:String(e)))}}),document.getElementById(`btn-reexecutar-testes`)?.addEventListener(`click`,()=>{Q(),q(`Testes matemáticos e de sistema reexecutados!`)})}function $(){let e=document.querySelector(`input[name="parc-formato"]:checked`)?.value||`circular`,t=0;if(e===`circular`){let e=document.getElementById(`parc-circ-tipo-entrada`)?.value;t=r(e,Number(document.getElementById(`parc-circ-valor`)?.value))}else t=i(Number(document.getElementById(`parc-rect-comp`)?.value),Number(document.getElementById(`parc-rect-larg`)?.value));let n=a(t),o=document.getElementById(`preview-area-m2`),s=document.getElementById(`preview-area-ha`);o&&(o.textContent=`${d(t,2)} m²`),s&&(s.textContent=`${d(n,4)} ha`)}async function De(e){if(!K.inventarioAtivo)return;let t=document.getElementById(`autocomplete-lista`);if(!t)return;let n=await F(K.inventarioAtivo.id),r=new Map;n.forEach(e=>{let t=e.especie?.trim();if(t){let e=t.toLowerCase();r.has(e)||r.set(e,t)}});let i=e.trim().toLowerCase(),a=Array.from(r.values()).filter(e=>e.toLowerCase().includes(i));a.length===0?t.classList.add(`hidden`):(t.innerHTML=a.slice(0,6).map(e=>`<div class="autocomplete-item" data-val="${e}">${e}</div>`).join(``),t.classList.remove(`hidden`),t.querySelectorAll(`.autocomplete-item`).forEach(e=>{e.addEventListener(`click`,e=>{let n=e.currentTarget.getAttribute(`data-val`),r=document.getElementById(`input-arv-especie`);r&&n&&(r.value=n,t.classList.add(`hidden`),document.getElementById(`input-arv-cap`)?.focus())})}))}function Oe(e){let t=`
    <form id="form-edit-tree-modal" class="space-y-4">
      <div>
        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Identificador / Nº da Árvore</label>
        <input type="text" id="modal-tree-num" class="field-input w-full font-mono font-bold" value="${e.numero}">
      </div>
      <div>
        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Espécie</label>
        <input type="text" id="modal-tree-esp" class="field-input w-full" value="${e.especie||``}" placeholder="Nome científico ou comum">
      </div>
      <div>
        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">CAP (cm)</label>
        <input type="number" step="0.1" min="0.1" id="modal-tree-cap" class="field-input w-full font-mono text-lg font-bold" value="${e.cap||``}">
      </div>
      <div>
        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Observações</label>
        <textarea id="modal-tree-obs" rows="2" class="field-input w-full text-xs">${e.observacoes||``}</textarea>
      </div>
    </form>
  `;J(`Editar Árvore #${e.numero}`,t,`
    <button type="button" class="btn-secondary text-xs" onclick="document.getElementById('modal-close-btn').click()">Cancelar</button>
    <button type="button" id="btn-salvar-modal-tree" class="btn-primary text-xs">Salvar Alterações</button>
  `),document.getElementById(`btn-salvar-modal-tree`)?.addEventListener(`click`,async()=>{let t=document.getElementById(`modal-tree-num`).value.trim(),n=document.getElementById(`modal-tree-esp`).value.trim(),r=document.getElementById(`modal-tree-cap`).value.trim(),i=r===``?null:Number(r),a=document.getElementById(`modal-tree-obs`).value.trim(),s=o({cap:i});e.numero=t,e.especie=n,e.cap=s.cap,e.dap=s.dap,e.g=s.g,e.status=s.status,e.motivoInvalido=s.motivo,e.observacoes=a,await I(e),Y(),q(`Árvore #${t} atualizada! Indicadores recalculados.`),Q()})}async function ke(){if(!K.parcelaAtiva)return;let e=await P(K.parcelaAtiva.id),t=c(K.parcelaAtiva,e),n=e.filter(e=>!e.especie?.trim()).length;J(`Finalizar Parcela e Gerar Estatísticas`,`
    <div class="space-y-4 text-sm">
      <div class="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
        <h4 class="font-bold text-emerald-900 text-sm">Revisão Prévia da Parcela ${K.parcelaAtiva.codigo}${K.parcelaAtiva.nome?` — ${K.parcelaAtiva.nome}`:``}</h4>
        <p class="text-xs text-emerald-800 mt-0.5">Revise o resumo antes de consolidar os resultados estatísticos.</p>
      </div>

      <div class="grid grid-cols-2 gap-2 text-xs">
        <div class="p-2.5 bg-slate-50 rounded border">
          <span class="text-slate-500 block">Árvores Cadastradas</span>
          <span class="text-base font-bold text-slate-800">${t.totalArvores}</span>
        </div>
        <div class="p-2.5 bg-slate-50 rounded border">
          <span class="text-slate-500 block">Árvores Válidas (n)</span>
          <span class="text-base font-bold text-emerald-700">${t.arvoresValidas}</span>
        </div>
        <div class="p-2.5 bg-slate-50 rounded border ${t.arvoresIncompletas>0?`border-amber-400 bg-amber-50/50`:``}">
          <span class="text-slate-500 block">CAP Ausente / Incompleto</span>
          <span class="text-base font-bold ${t.arvoresIncompletas>0?`text-amber-800`:`text-slate-800`}">${t.arvoresIncompletas}</span>
        </div>
        <div class="p-2.5 bg-slate-50 rounded border">
          <span class="text-slate-500 block">Sem Espécie Identificada</span>
          <span class="text-base font-bold text-slate-800">${n}</span>
        </div>
      </div>

      <div class="text-xs text-slate-600 space-y-1">
        <p>• <strong>Inventariante:</strong> ${K.parcelaAtiva.inventariante||`Não especificado`}</p>
        <p>• <strong>Área da parcela:</strong> ${d(K.parcelaAtiva.areaM2,1)} m² (${d(K.parcelaAtiva.areaHa,4)} ha)</p>
        <p>• <strong>DAP médio preliminar:</strong> ${d(t.dapMedio,2,` cm`)}</p>
        <p>• <strong>Área basal G total:</strong> ${d(t.areaBasalTotal,4)} m² (${d(t.areaBasalPorHectare,2)} m²/ha)</p>
      </div>

      ${t.arvoresIncompletas>0?`
        <div class="p-3 bg-amber-50 rounded border border-amber-200 text-xs text-amber-900">
          ⚠️ <strong>Atenção:</strong> Existem ${t.arvoresIncompletas} árvore(s) sem medição válida de CAP. Elas serão preservadas nos registros para posterior conferência, mas não serão computadas nas médias e na área basal.
        </div>
      `:``}
    </div>
  `,`
    <button type="button" class="btn-secondary text-xs" onclick="document.getElementById('modal-close-btn').click()">
      Voltar à Coleta
    </button>
    <button type="button" id="btn-confirmar-finalizacao" class="btn-primary text-xs">
      Confirmar e Ver Estatísticas
    </button>
  `),document.getElementById(`btn-confirmar-finalizacao`)?.addEventListener(`click`,async()=>{K.parcelaAtiva&&K.inventarioAtivo&&K.grupoAtivo&&(K.parcelaAtiva.status=`concluida`,await M(K.parcelaAtiva),Y(),q(`Parcela ${K.parcelaAtiva.codigo} finalizada com sucesso!`),Z(`parcela-resultados`,K.inventarioAtivo.id,K.grupoAtivo.id,K.parcelaAtiva.id))})}function Ae(e,t){return e?`<div><strong>${t}:</strong> ${G(e.latitude,e.longitude)}${e.precisao==null?``:` (±${e.precisao.toFixed(1)} m)`}</div>`:`<div class="text-slate-400">${t}: ainda não capturado</div>`}function je(e){let t=e.formato===`circular`,n=e.coordenadas?.centro||null,r=[null,null,null,null];if(e.coordenadas?.cantos?.length)for(let t=0;t<4;t++)r[t]=e.coordenadas.cantos[t]||null;let i=()=>{let e=document.getElementById(`gps-status-feedback`);e&&(e.innerHTML=t?Ae(n,`Centro`):[0,1,2,3].map(e=>Ae(r[e],`Canto ${e+1}`)).join(``))},a=`
    <div class="space-y-4 text-xs">
      <div class="p-3 bg-emerald-50 rounded border border-emerald-200 text-emerald-950">
        <strong>Parcela ${e.codigo}</strong> — ${t?`registre o ponto central da parcela circular.`:`registre os 4 cantos (piquetes) da parcela retangular, na ordem do perímetro.`}
        <p class="text-xs text-emerald-800 mt-1">GPS nativo do dispositivo (WGS84). Funciona sem internet.</p>
      </div>

      <div id="gps-status-feedback" class="p-3 bg-slate-50 rounded border border-slate-200 text-slate-700 space-y-1 min-h-[80px]"></div>

      ${t?`
        <button type="button" id="btn-gps-capturar" class="btn-primary w-full text-xs py-2.5">
          📍 Capturar centro com GPS
        </button>
        <div class="border-t border-slate-200 pt-3 space-y-2">
          <span class="block font-bold text-slate-800 uppercase">Ou informe manualmente</span>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[0.7rem] text-slate-500">Latitude</label>
              <input type="number" step="0.000001" id="gps-manual-lat" class="field-input w-full py-1 text-xs font-mono"
                value="${n?.latitude??``}">
            </div>
            <div>
              <label class="text-[0.7rem] text-slate-500">Longitude</label>
              <input type="number" step="0.000001" id="gps-manual-lng" class="field-input w-full py-1 text-xs font-mono"
                value="${n?.longitude??``}">
            </div>
          </div>
        </div>
      `:`
        <div class="grid grid-cols-2 gap-2">
          ${[1,2,3,4].map(e=>`
            <button type="button" data-canto="${e}" class="btn-secondary text-xs py-2.5 btn-gps-canto">
              📍 Capturar canto ${e}
            </button>`).join(``)}
        </div>
      `}
    </div>
  `;J(t?`GPS — Centro (${e.codigo})`:`GPS — 4 Cantos (${e.codigo})`,a,`
    <button type="button" class="btn-secondary text-xs" id="btn-cancelar-gps-modal">Cancelar</button>
    <button type="button" id="btn-salvar-gps-modal" class="btn-primary text-xs">Salvar Coordenadas</button>
  `),i(),document.getElementById(`btn-cancelar-gps-modal`)?.addEventListener(`click`,Y),document.getElementById(`btn-gps-capturar`)?.addEventListener(`click`,async()=>{let e=document.getElementById(`gps-status-feedback`);e&&(e.innerHTML=`<span class="text-emerald-700 animate-pulse">Obtendo sinal GPS...</span>`);let t=await ie(`Centro da Parcela`);if(t.sucesso&&t.ponto){n=t.ponto;let e=document.getElementById(`gps-manual-lat`),r=document.getElementById(`gps-manual-lng`);e&&(e.value=t.ponto.latitude.toFixed(6)),r&&(r.value=t.ponto.longitude.toFixed(6)),i(),q(`Centro capturado.`)}else e&&(e.innerHTML=`<div class="text-rose-700"><strong>Falha:</strong> ${t.mensagemErro}</div>`)}),document.querySelectorAll(`.btn-gps-canto`).forEach(e=>{e.addEventListener(`click`,async e=>{let t=Number(e.currentTarget.getAttribute(`data-canto`));if(!t||t<1||t>4)return;let n=document.getElementById(`gps-status-feedback`);n&&(n.innerHTML=`<span class="text-emerald-700 animate-pulse">Capturando canto ${t}...</span>`);let a=await ie(`Canto ${t}`);a.sucesso&&a.ponto?(r[t-1]={...a.ponto,rotulo:`Canto ${t}`},i(),q(`Canto ${t} capturado.`)):n&&(n.innerHTML=`<div class="text-rose-700"><strong>Falha no canto ${t}:</strong> ${a.mensagemErro}</div>`)})}),document.getElementById(`btn-salvar-gps-modal`)?.addEventListener(`click`,async()=>{if(t){let t=document.getElementById(`gps-manual-lat`),r=document.getElementById(`gps-manual-lng`),i=Number(t?.value),a=Number(r?.value);if(n||isNaN(i)||isNaN(a)||i===0||a===0||(n={latitude:i,longitude:a,altitude:null,precisao:null,dataHora:new Date().toISOString(),rotulo:`Centro da Parcela`}),!n){q(`Capture ou informe o centro antes de salvar.`,`erro`);return}e.coordenadas={tipo:`centro`,centro:n,cantos:null}}else{if(r.filter(e=>!!e).length<4){q(`Capture os 4 cantos antes de salvar.`,`erro`);return}e.coordenadas={tipo:`cantos`,centro:null,cantos:r.map((e,t)=>({...e,rotulo:`Canto ${t+1}`}))}}await M(e),K.parcelaAtiva?.id===e.id&&(K.parcelaAtiva=e),Y(),q(`Coordenadas salvas com sucesso!`),Q()})}document.addEventListener(`DOMContentLoaded`,()=>{de().catch(e=>{console.error(`Falha na inicialização do aplicativo:`,e)})}),window.addEventListener(`unhandledrejection`,e=>{console.warn(`Alerta da aplicação:`,e.reason)});