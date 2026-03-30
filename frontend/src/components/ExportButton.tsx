'use client';
import React, { useState } from 'react';
import { Download, FileText, Table as TableIcon } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { DreNode } from './DRETable';

interface ExportButtonProps {
  dreData: DreNode[];
  companyName: string;
  targetPeriod: string;
}

export default function ExportButton({ dreData, companyName, targetPeriod }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const flattenDreData = (nodes: DreNode[], depth = 0): any[] => {
    let result: any[] = [];
    nodes.forEach(node => {
      // pad name with spaces according to depth for visual hierarchy in excel
      const padding = ' '.repeat(depth * 4);
      result.push({
        'Conta Contabil': padding + node.account_name,
        'Alvo (R$)': node.value.toFixed(2),
        'AV Alvo (%)': node.percentage.toFixed(2) + '%',
        'Base (R$)': node.base_value.toFixed(2),
        'AV Base (%)': node.base_percentage.toFixed(2) + '%',
        'AH Variação (%)': node.ah_percentage.toFixed(2) + '%'
      });
      if (node.children && node.children.length > 0) {
        result = result.concat(flattenDreData(node.children, depth + 1));
      }
    });
    return result;
  };

  const exportCSV = () => {
    const flatData = flattenDreData(dreData);
    if (flatData.length === 0) return;

    // Build CSV string (Excel treats UTF-8 with BOM correctly)
    const headers = Object.keys(flatData[0]);
    const csvRows = [];
    csvRows.push(headers.join(';')); // Header row

    flatData.forEach(row => {
      const values = headers.map(h => `"${row[h]}"`);
      csvRows.push(values.join(';'));
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const safeName = companyName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const safePeriod = targetPeriod.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    link.setAttribute('download', `DRE_${safeName}_${safePeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsOpen(false);
  };

  const exportPDF = async () => {
    setLoading(true);
    setIsOpen(false);
    
    // We target the main wrapper element
    const element = document.getElementById('dashboard-export-wrapper');
    if (!element) {
      alert("Erro ao localizar conteúdo para PDF.");
      setLoading(false);
      return;
    }

    try {
      const canvas = await html2canvas(element, { 
        scale: 1.5, // 1.5 is enough for reading, keeps file tiny
        backgroundColor: '#0c0c0c',
        windowWidth: 1400 // force desktop width rendering
      });
      const imgData = canvas.toDataURL('image/png', 0.8);
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // If it fits in one page, awesome. If it exceeds A4, we must split or just accept the A4 clipping.
      // Usually Dashboards look great stretched into 1 page vertically if it's not too long.
      let position = 0;
      let heightLeft = pdfHeight;
      const pageHeight = pdf.internal.pageSize.getHeight();

      // For a very long dashboard, we can add pages
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      
      const safeName = companyName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      pdf.save(`Relatorio_BIMM_MG_${safeName}.pdf`);
    } catch (e) {
      console.error('Error creating PDF', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-[#d4af37] text-black px-4 py-2 font-bold rounded-lg hover:bg-[#eacc59] transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)] disabled:opacity-50"
        disabled={loading}
      >
        {loading ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div> : <Download size={18} />}
        {loading ? 'Gerando...' : 'Exportar Relatório'}
      </button>

      {isOpen && (
        <div className="absolute top-12 right-0 mt-2 bg-[#1a1a1c] border border-[#27272a] rounded-lg shadow-2xl overflow-hidden min-w-[240px] z-50">
          <div className="px-4 py-2 bg-[#111111] border-b border-[#27272a]">
            <span className="text-xs uppercase font-bold tracking-widest text-[#a1a1aa]">Formato de Exportação</span>
          </div>
          <button 
            onClick={exportPDF}
            className="w-full text-left px-4 py-3 text-white hover:bg-[#27272a] transition-colors flex items-center gap-3 border-b border-[#27272a] focus:outline-none"
          >
            <div className="bg-[#d4af37]/10 p-2 rounded-md">
              <FileText size={18} className="text-[#d4af37]" />
            </div>
            <div>
              <p className="font-semibold text-sm">Painel Completo (PDF)</p>
              <p className="text-xs text-[#a1a1aa]">Ideal para impressões</p>
            </div>
          </button>
          <button 
            onClick={exportCSV}
            className="w-full text-left px-4 py-3 text-white hover:bg-[#27272a] transition-colors flex items-center gap-3 focus:outline-none"
          >
            <div className="bg-emerald-500/10 p-2 rounded-md">
               <TableIcon size={18} className="text-emerald-500" />
            </div>
            <div>
              <p className="font-semibold text-sm">Dados da DRE (Excel)</p>
              <p className="text-xs text-[#a1a1aa]">Planilha com formato CSV</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
