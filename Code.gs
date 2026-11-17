/**
 * Matrimonio Empis - Backend (Google Apps Script)
 * Cole este código em: Planilha Google > Extensões > Apps Script
 */
const TZ = 'America/Sao_Paulo';
const NOME_SITE = 'Matrimonio Empis';
const ABA_EMP = 'Empréstimos';
const ABA_EQP = 'Equipamentos';
const COL_EMP = ['Responsável', 'Setor', 'Equipamento', 'Número', 'Quantidade', 'Retirada',
  'Devolução prevista', 'Devolução', 'Autorizado por', 'E-mail', 'Telefone', 'Status'];
const COL_EQP = ['Número', 'Equipamento', 'Categoria', 'Status'];

function aba_(nome, cab) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(nome);
  if (!s) {
    s = ss.insertSheet(nome);
    s.getRange(1, 1, 1, cab.length).setValues([cab]).setFontWeight('bold')
      .setBackground('#1f3d36').setFontColor('#ffffff');
    s.setFrozenRows(1);
  }
  return s;
}

function agora_() { return Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm'); }
function iso2br_(iso) { // 2026-11-13T15:30 -> 13/11/2026 15:30
  if (!iso) return '';
  const [d, h] = iso.split('T'); const [a, m, di] = d.split('-');
  return di + '/' + m + '/' + a + ' ' + (h || '00:00');
}
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function linhas_(s) {
  const v = s.getDataRange().getDisplayValues(); v.shift(); return v;
}
function htmlEsc_(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function doGet() {
  const eqp = linhas_(aba_(ABA_EQP, COL_EQP)).map(r => ({ codigo: r[0], nome: r[1], categoria: r[2], status: r[3] }));
  const emp = linhas_(aba_(ABA_EMP, COL_EMP)).map(r => ({
    responsavel: r[0], setor: r[1], equipamento: r[2], codigo: r[3], quantidade: r[4], retirada: r[5],
    prevista: r[6], devolucao: r[7], autorizado: r[8], email: r[9], telefone: r[10], status: r[11]
  })).reverse().slice(0, 300);
  return json_({ ok: true, equipamentos: eqp, emprestimos: emp });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.acao === 'registrar') return json_(registrar_(d));
    if (d.acao === 'emprestar') return json_(emprestar_(d));
    if (d.acao === 'devolver') return json_(devolver_(d));
    return json_({ ok: false, erro: 'Ação desconhecida.' });
  } catch (err) {
    return json_({ ok: false, erro: String(err) });
  } finally { lock.releaseLock(); }
}

function acharEqp_(s, codigo) {
  const v = s.getDataRange().getValues();
  for (let i = 1; i < v.length; i++)
    if (String(v[i][0]).trim().toLowerCase() === String(codigo).trim().toLowerCase()) return { linha: i + 1, dados: v[i] };
  return null;
}

function registrar_(d) {
  const s = aba_(ABA_EQP, COL_EQP);
  if (!d.codigo || !d.nome) return { ok: false, erro: 'Informe número e nome do equipamento.' };
  if (acharEqp_(s, d.codigo)) return { ok: false, erro: 'Já existe um equipamento com o número ' + d.codigo + '.' };
  s.appendRow([d.codigo, d.nome, d.categoria || '', 'Disponível']);
  return { ok: true };
}

function emprestar_(d) {
  const se = aba_(ABA_EQP, COL_EQP), sl = aba_(ABA_EMP, COL_EMP);
  // Compatível com o formulário antigo (um único codigo e quantidade).
  const codigos = Array.isArray(d.codigos) ? d.codigos : (d.codigo ? [d.codigo] : []);
  const unicos = [], vistos = {};
  codigos.forEach(c => {
    const codigo = String(c || '').trim(), chave = codigo.toLowerCase();
    if (codigo && !vistos[chave]) { vistos[chave] = true; unicos.push(codigo); }
  });
  if (!d.nome || !d.email || !d.setor || !d.tecnico) return { ok: false, erro: 'Preencha nome, e-mail, setor e técnico responsável.' };
  if (!unicos.length) return { ok: false, erro: 'Selecione ao menos um equipamento.' };

  // Valida todos antes de alterar a planilha para evitar empréstimos parciais.
  const equipamentos = [];
  for (let i = 0; i < unicos.length; i++) {
    const eq = acharEqp_(se, unicos[i]);
    if (!eq) return { ok: false, erro: 'Equipamento ' + unicos[i] + ' não cadastrado. Nenhum empréstimo foi registrado.' };
    if (String(eq.dados[3]).trim() !== 'Disponível') return { ok: false, erro: 'O equipamento ' + unicos[i] + ' já está emprestado. Nenhum empréstimo foi registrado.' };
    equipamentos.push(eq);
  }
  const retirada = agora_(), prevista = iso2br_(d.prevista);
  const quantidadeLegada = d.codigos ? 1 : (Number(d.quantidade) || 1);
  equipamentos.forEach(eq => {
    sl.appendRow([d.nome, d.setor, eq.dados[1], eq.dados[0], quantidadeLegada, retirada,
      prevista, '', d.tecnico, d.email, d.telefone || '', 'Em aberto']);
    se.getRange(eq.linha, 4).setValue('Emprestado');
  });
  const listaHtml = equipamentos.map(eq => '<li><b>' + htmlEsc_(eq.dados[1]) + '</b> — nº ' + htmlEsc_(eq.dados[0]) + '</li>').join('');
  const descricao = equipamentos.length === 1 ? 'o equipamento abaixo' : 'os ' + equipamentos.length + ' equipamentos abaixo';
  email_(d.email, 'Empréstimo registrado - ' + equipamentos.length + ' equipamento' + (equipamentos.length === 1 ? '' : 's'),
    'Olá, <b>' + htmlEsc_(d.nome) + '</b>!<br><br>Você retirou ' + descricao + ':<br><ul>' + listaHtml + '</ul>' +
    '<b>Total de equipamentos:</b> ' + equipamentos.length + '<br>' +
    '<b>Setor:</b> ' + htmlEsc_(d.setor) + '<br>' +
    '<b>Retirada:</b> ' + retirada + '<br>' +
    '<b>Devolver até:</b> ' + htmlEsc_(prevista || 'não definido') + '<br>' +
    '<b>Autorizado por:</b> ' + htmlEsc_(d.tecnico) + '<br><br>Devolva na sala de suporte ou no laboratório de informática.');
  return { ok: true, quantidade: equipamentos.length, codigos: unicos };
}

function devolver_(d) {
  const se = aba_(ABA_EQP, COL_EQP), sl = aba_(ABA_EMP, COL_EMP);
  const v = sl.getDataRange().getValues();
  for (let i = v.length - 1; i >= 1; i--) {
    if (String(v[i][3]).trim().toLowerCase() === String(d.codigo).trim().toLowerCase() && v[i][11] === 'Em aberto') {
      const dev = agora_();
      sl.getRange(i + 1, 8).setValue(dev);
      sl.getRange(i + 1, 12).setValue('Devolvido');
      const eq = acharEqp_(se, d.codigo);
      if (eq) se.getRange(eq.linha, 4).setValue('Disponível');
      email_(v[i][9], 'Devolução confirmada - ' + v[i][2],
        'Olá, <b>' + htmlEsc_(v[i][0]) + '</b>!<br><br>Recebemos o equipamento <b>' + htmlEsc_(v[i][2]) + '</b> (nº ' + htmlEsc_(v[i][3]) +
        ').<br><b>Devolvido em:</b> ' + dev + '<br><br>O chamado foi encerrado. Obrigado!');
      return { ok: true, responsavel: v[i][0], equipamento: v[i][2] };
    }
  }
  return { ok: false, erro: 'Nenhum empréstimo em aberto para o número ' + d.codigo + '.' };
}

function email_(para, assunto, corpo) {
  if (!para) return;
  MailApp.sendEmail({ to: para, subject: '[' + NOME_SITE + '] ' + assunto, name: NOME_SITE,
    htmlBody: '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5">' + corpo + '</div>' });
}

// Execute esta função UMA vez no editor para criar as abas e autorizar o envio de e-mails.
function configurar() {
  aba_(ABA_EQP, COL_EQP); aba_(ABA_EMP, COL_EMP);
  MailApp.getRemainingDailyQuota();
}
