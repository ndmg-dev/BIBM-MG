'use client';
import React, { useState } from 'react';
import { Download, FileText, Table as TableIcon } from 'lucide-react';
import { DreNode } from './DRETable';

interface ExportButtonProps {
  dreData: DreNode[];
  companyName: string;
  targetPeriod: string;
}

export default function ExportButton({ dreData, companyName, targetPeriod }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const safeName = (companyName || 'empresa').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const safePeriod = (targetPeriod || 'periodo').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

  // ─── Flatten DRE tree into flat array for CSV ───
  const flattenDreData = (nodes: DreNode[], depth = 0): Record<string, string>[] => {
    let result: Record<string, string>[] = [];
    nodes.forEach(node => {
      const padding = '\u00a0'.repeat(depth * 4); // non-breaking spaces for indentation
      result.push({
        'Conta Contabil': padding + node.account_name,
        'Alvo (R$)': node.value.toFixed(2).replace('.', ','),
        'AV Alvo (%)': node.percentage.toFixed(2).replace('.', ',') + '%',
        'Base (R$)': node.base_value.toFixed(2).replace('.', ','),
        'AV Base (%)': node.base_percentage.toFixed(2).replace('.', ',') + '%',
        'AH Variacao (%)': node.ah_percentage.toFixed(2).replace('.', ',') + '%',
      });
      if (node.children && node.children.length > 0) {
        result = result.concat(flattenDreData(node.children, depth + 1));
      }
    });
    return result;
  };

  // ─── CSV Export ───
  const exportCSV = () => {
    const flatData = flattenDreData(dreData);
    if (flatData.length === 0) return;

    const headers = Object.keys(flatData[0]);
    const rows = flatData.map(row => headers.map(h => `"${row[h]}"`).join(';'));
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DRE_${safeName}_${safePeriod}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  // ─── PDF Export (dynamic imports to avoid SSR crash) ───
  const exportPDF = async () => {
    setLoading(true);
    setIsOpen(false);
    setError(null);

    try {
      // Dynamic imports — only loaded when user clicks, never on SSR
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const element = document.getElementById('dashboard-export-wrapper');
      if (!element) {
        setError('Elemento do painel não encontrado. Tente novamente.');
        return;
      }

      // Temporarily force visibility for capture
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'visible';

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#0c0c0c',
        useCORS: true,
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        scrollX: 0,
        scrollY: -window.scrollY,
      });

      document.body.style.overflow = originalOverflow;

      const imgData = canvas.toDataURL('image/jpeg', 0.85);

      // Landscape A4 for wide dashboards
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();   // 297mm landscape
      const pageHeight = pdf.internal.pageSize.getHeight(); // 210mm landscape

      const imgRatio = canvas.height / canvas.width;
      const imgHeightOnPage = pageWidth * imgRatio;

      // Add header
      pdf.setFillColor(12, 12, 12);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      if (imgHeightOnPage <= pageHeight) {
        // Fits in one page — center vertically
        const yOffset = (pageHeight - imgHeightOnPage) / 2;
        pdf.addImage(imgData, 'JPEG', 0, yOffset, pageWidth, imgHeightOnPage);
      } else {
        // Multi-page: slice the image
        let heightLeft = imgHeightOnPage;
        let srcY = 0;
        let firstPage = true;

        while (heightLeft > 0) {
          if (!firstPage) {
            pdf.addPage();
            pdf.setFillColor(12, 12, 12);
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');
          }
          pdf.addImage(imgData, 'JPEG', 0, -srcY, pageWidth, imgHeightOnPage);
          srcY += pageHeight;
          heightLeft -= pageHeight;
          firstPage = false;
        }
      }

      pdf.save(`Relatorio_BI_${safeName}_${safePeriod}.pdf`);
    } catch (e) {
      console.error('PDF export error:', e);
      setError('Erro ao gerar PDF. Verifique o console para detalhes.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => { setIsOpen(!isOpen); setError(null); }}
        className="flex items-center gap-2 bg-[#d4af37] text-black px-4 py-2 font-bold rounded-lg hover:bg-[#eacc59] transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)] disabled:opacity-60 text-sm"
        disabled={loading}
      >
        {loading
          ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
          : <Download size={16} />
        }
        {loading ? 'Gerando PDF...' : 'Exportar'}
      </button>

      {error && (
        <div className="absolute top-12 right-0 mt-2 bg-rose-900/80 border border-rose-700 text-rose-200 text-xs rounded-lg px-3 py-2 min-w-[240px] z-50">
          {error}
        </div>
      )}

      {isOpen && !loading && (
        <div className="absolute top-12 right-0 mt-2 bg-[#1a1a1c] border border-[#27272a] rounded-lg shadow-2xl overflow-hidden min-w-[240px] z-50">
          <div className="px-4 py-2 bg-[#111111] border-b border-[#27272a]">
            <span className="text-xs uppercase font-bold tracking-widest text-[#a1a1aa]">Formato de Exportação</span>
          </div>

          <button
            onClick={exportPDF}
            className="w-full text-left px-4 py-3 text-white hover:bg-[#27272a] transition-colors flex items-center gap-3 border-b border-[#27272a] focus:outline-none"
          >
            <div className="bg-[#d4af37]/10 p-2 rounded-md flex-shrink-0">
              <FileText size={18} className="text-[#d4af37]" />
            </div>
            <div>
              <p className="font-semibold text-sm">Painel Completo (PDF)</p>
              <p className="text-xs text-[#a1a1aa]">Snapshot do dashboard atual</p>
            </div>
          </button>

          <button
            onClick={exportCSV}
            className="w-full text-left px-4 py-3 text-white hover:bg-[#27272a] transition-colors flex items-center gap-3 focus:outline-none"
          >
            <div className="bg-emerald-500/10 p-2 rounded-md flex-shrink-0">
              <TableIcon size={18} className="text-emerald-500" />
            </div>
            <div>
              <p className="font-semibold text-sm">Dados da DRE (Excel/CSV)</p>
              <p className="text-xs text-[#a1a1aa]">Planilha com hierarquia completa</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
