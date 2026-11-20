/**
 * UTILITÁRIO CENTRAL DE EXPORTAÇÃO REAL (CSV UTF-8 & PDF 1.4 VÁLIDO)
 * Zero dependências externas — funciona 100% local e em produção para todos os perfis.
 */

import { auth } from '../auth.js';

/**
 * Normaliza texto para WinAnsiEncoding (ISO-8859-1) usado em fontes Type1 padrão do PDF 1.4.
 */
function pdfEscapeWinAnsi(str) {
  const s = String(str ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[•–—]/g, '-')
    .replace(/[≥]/g, '>=')
    .replace(/[≤]/g, '<=')
    .replace(/[→]/g, '->');

  let out = '';
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code === 40 || code === 41 || code === 92) {
      out += '\\' + s[i];
    } else if (code >= 32 && code <= 126) {
      out += s[i];
    } else if (code >= 160 && code <= 255) {
      out += '\\' + code.toString(8).padStart(3, '0');
    } else {
      out += '?';
    }
  }
  return out;
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Baixa um arquivo CSV válido em UTF-8 com BOM (abre com acentos corretos no Excel pt-BR).
 */
export function downloadCSV(filename, headers, rows) {
  const safeName = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  const escapeCell = (val) => `"${String(val ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
  const lines = [
    headers.map(escapeCell).join(';'),
    ...rows.map(row => row.map(escapeCell).join(';'))
  ];
  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerBlobDownload(blob, safeName);
}

/**
 * Gera e baixa um arquivo PDF 1.4 100% válido (abre em Chrome, Edge, Adobe Reader, Preview).
 */
export function downloadPDF(filename, options = {}) {
  const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const profile = auth.getProfileData ? auth.getProfileData() : { nome: 'Usuário RAIZ', cargo: 'Operação' };
  const nowStr = new Date().toLocaleString('pt-BR');

  const title = options.title || 'Relatório Oficial - RAIZ Agro IoT';
  const subtitle = options.subtitle || 'Plataforma de Monitoramento Climático, Agronômico e Logístico';
  const metadata = options.metadata || [
    `Emitido por: ${profile.nome} (${profile.cargo || profile.tituloCompleto || 'RAIZ'})`,
    `Data/Hora de Emissão: ${nowStr}`,
    `Unidade: ${profile.farm || 'Vale das Uvas'} - ${profile.farmSub || 'Petrolina - Setor 04'}`,
  ];
  const headers = options.headers || [];
  const rows = options.rows || [];
  const notes = options.notes || [
    'Documento gerado eletronicamente pela plataforma RAIZ Agro IoT.',
    'Conformidade: GlobalG.A.P. / MAPA / Embrapa Semiárido.'
  ];

  // Quebra linhas em páginas A4 (595 x 842 pt)
  const pageWidth = 595;
  const pageHeight = 842;
  const marginX = 42;
  const usableWidth = pageWidth - marginX * 2;

  const pagesOps = [];
  let ops = [];
  let y = pageHeight - 46;

  const startPage = (isFirst) => {
    ops = [];
    // Faixa superior verde RAIZ
    ops.push('0.094 0.239 0.180 rg');
    ops.push(`0 ${pageHeight - 72} ${pageWidth} 72 re f`);

    // Título no cabeçalho
    ops.push('1 1 1 rg');
    ops.push(`BT /F2 15 Tf ${marginX} ${pageHeight - 34} Td (${pdfEscapeWinAnsi(title.slice(0, 68))}) Tj ET`);
    ops.push('0.82 0.95 0.88 rg');
    ops.push(`BT /F1 9 Tf ${marginX} ${pageHeight - 52} Td (${pdfEscapeWinAnsi(subtitle.slice(0, 95))}) Tj ET`);

    y = pageHeight - 94;

    if (isFirst && metadata.length) {
      const boxH = metadata.length * 14 + 16;
      ops.push('0.96 0.97 0.98 rg');
      ops.push(`${marginX} ${y - boxH + 10} ${usableWidth} ${boxH} re f`);
      ops.push('0.88 0.91 0.94 RG 0.6 w');
      ops.push(`${marginX} ${y - boxH + 10} ${usableWidth} ${boxH} re S`);

      ops.push('0.15 0.23 0.31 rg');
      metadata.forEach((line, idx) => {
        ops.push(`BT /F1 9 Tf ${marginX + 10} ${y - 6 - idx * 14} Td (${pdfEscapeWinAnsi(line.slice(0, 95))}) Tj ET`);
      });
      y -= boxH + 18;
    }

    // Cabeçalho da tabela se houver colunas
    if (headers.length) {
      ops.push('0.094 0.239 0.180 rg');
      ops.push(`${marginX} ${y - 16} ${usableWidth} 20 re f`);
      const colW = usableWidth / headers.length;
      ops.push('1 1 1 rg');
      headers.forEach((h, i) => {
        const maxChars = Math.max(8, Math.floor(colW / 5.5));
        ops.push(`BT /F2 8.5 Tf ${marginX + 5 + i * colW} ${y - 10} Td (${pdfEscapeWinAnsi(String(h).slice(0, maxChars))}) Tj ET`);
      });
      y -= 26;
    }
  };

  const finishPage = (pageNum) => {
    ops.push('0.88 0.91 0.94 RG 0.5 w');
    ops.push(`${marginX} 44 m ${pageWidth - marginX} 44 l S`);
    ops.push('0.45 0.52 0.60 rg');
    ops.push(`BT /F1 8 Tf ${marginX} 30 Td (${pdfEscapeWinAnsi(`RAIZ Agro IoT • Emitido em ${nowStr}`)}) Tj ET`);
    ops.push(`BT /F1 8 Tf ${pageWidth - marginX - 55} 30 Td (${pdfEscapeWinAnsi(`Pagina ${pageNum}`)}) Tj ET`);
    pagesOps.push(ops.join('\n'));
  };

  startPage(true);

  if (rows.length && headers.length) {
    const colW = usableWidth / headers.length;
    const maxChars = Math.max(8, Math.floor(colW / 5.2));
    rows.forEach((row, rIdx) => {
      if (y < 90) {
        finishPage(pagesOps.length + 1);
        startPage(false);
      }
      if (rIdx % 2 === 1) {
        ops.push('0.97 0.98 0.99 rg');
        ops.push(`${marginX} ${y - 13} ${usableWidth} 17 re f`);
      }
      ops.push('0.12 0.16 0.23 rg');
      row.forEach((cell, cIdx) => {
        const txt = String(cell ?? '').slice(0, maxChars);
        ops.push(`BT /F1 8 Tf ${marginX + 5 + cIdx * colW} ${y - 8} Td (${pdfEscapeWinAnsi(txt)}) Tj ET`);
      });
      y -= 17;
    });
    y -= 12;
  }

  if (notes.length) {
    if (y < 95) {
      finishPage(pagesOps.length + 1);
      startPage(false);
    }
    ops.push('0.094 0.239 0.180 rg');
    ops.push(`BT /F2 9.5 Tf ${marginX} ${y} Td (${pdfEscapeWinAnsi('Observacoes e Homologacao:')}) Tj ET`);
    y -= 14;
    ops.push('0.30 0.37 0.45 rg');
    notes.forEach(note => {
      if (y < 65) {
        finishPage(pagesOps.length + 1);
        startPage(false);
      }
      ops.push(`BT /F1 8.5 Tf ${marginX} ${y} Td (${pdfEscapeWinAnsi('- ' + String(note).slice(0, 96))}) Tj ET`);
      y -= 13;
    });
  }

  finishPage(pagesOps.length + 1);

  // Monta objetos PDF 1.4 válidos
  // 1: Catalog, 2: Pages, 3: Font F1 (Helvetica), 4: Font F2 (Helvetica-Bold)
  // Para cada página k: obj 5+2k = Page, obj 6+2k = Content stream
  const objects = [];
  const pageObjIds = [];

  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
  objects.push('PLACEHOLDER_PAGES');
  objects.push('3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj');
  objects.push('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj');

  pagesOps.forEach((streamContent, idx) => {
    const pageObjId = 5 + idx * 2;
    const contentObjId = 6 + idx * 2;
    pageObjIds.push(`${pageObjId} 0 R`);

    objects.push(
      `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjId} 0 R >>\nendobj`
    );
    objects.push(
      `${contentObjId} 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream\nendobj`
    );
  });

  objects[1] = `2 0 obj\n<< /Type /Pages /Kids [${pageObjIds.join(' ')}] /Count ${pageObjIds.length} >>\nendobj`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj + '\n';
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdf += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const blob = new Blob([pdf], { type: 'application/pdf' });
  triggerBlobDownload(blob, safeName);
}

/**
 * Abre um modal para o usuário escolher entre CSV, PDF dedicado ou Ambos (PDF + CSV).
 */
export function openExportChoiceModal(Modal, titulo, onCSV, onPDF) {
  Modal.open(titulo, `
    <div style="font-size: 13px; color: #475569; display: flex; flex-direction: column; gap: 12px;">
      <p style="margin: 0; line-height: 1.5;">Escolha o formato para baixar o documento desta seção com os dados atualizados:</p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <button id="modal-choice-csv" type="button" style="padding: 13px; background: #ECFDF5; border: 1.5px solid #10B981; border-radius: 10px; cursor: pointer; text-align: left;">
          <div style="font-size: 13px; font-weight: 800; color: #065F46;">Planilha CSV (Excel)</div>
          <div style="font-size: 11px; color: #047857; margin-top: 3px;">UTF-8 estruturado para análise</div>
        </button>
        <button id="modal-choice-pdf" type="button" style="padding: 13px; background: #FEF2F2; border: 1.5px solid #EF4444; border-radius: 10px; cursor: pointer; text-align: left;">
          <div style="font-size: 13px; font-weight: 800; color: #991B1B;">Documento PDF Oficial</div>
          <div style="font-size: 11px; color: #B91C1C; margin-top: 3px;">PDF dedicado desta tela</div>
        </button>
      </div>
      <button id="modal-choice-ambos" type="button" style="padding: 11px 14px; background: #183D2E; border: none; border-radius: 9px; cursor: pointer; color: #FFFFFF; font-size: 12px; font-weight: 700; text-align: center;">
        Baixar PDF + CSV (Pacote Completo)
      </button>
    </div>
  `, () => {
    if (onPDF) onPDF();
  }, 'Baixar PDF');

  setTimeout(() => {
    const closeModal = () => {
      if (typeof Modal.close === 'function') {
        Modal.close();
      } else {
        document.querySelector('.modal-overlay, #modal-overlay')?.remove();
      }
    };
    document.getElementById('modal-choice-csv')?.addEventListener('click', () => {
      if (onCSV) onCSV();
      closeModal();
    });
    document.getElementById('modal-choice-pdf')?.addEventListener('click', () => {
      if (onPDF) onPDF();
      closeModal();
    });
    document.getElementById('modal-choice-ambos')?.addEventListener('click', () => {
      if (onPDF) onPDF();
      setTimeout(() => { if (onCSV) onCSV(); }, 220);
      closeModal();
    });
  }, 30);
}

