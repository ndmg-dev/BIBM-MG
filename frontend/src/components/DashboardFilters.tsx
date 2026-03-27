"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

interface Company {
  id: string;
  name: string;
}

const API_BASE = process.env.NODE_ENV === 'production'
  ? 'http://backend:8000/api/v1'
  : 'http://localhost:8000/api/v1';

export default function DashboardFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCompany = searchParams.get('company_id') || '';
  const currentTarget  = searchParams.get('target') || '01/2026';
  const currentBase    = searchParams.get('base')   || '02/2026';

  const [company, setCompany]   = useState(currentCompany);
  const [target,  setTarget]    = useState(currentTarget);
  const [base,    setBase]      = useState(currentBase);
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/companies`)
      .then(r => r.json())
      .then(data => {
        setCompanies(data);
        // Seleciona automaticamente a primeira empresa se nenhuma for selecionada
        if (!company && data.length > 0) {
          setCompany(data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const applyFilters = () => {
    router.push(
      `/?company_id=${encodeURIComponent(company)}&target=${encodeURIComponent(target)}&base=${encodeURIComponent(base)}`
    );
  };

  const periodOptions = ['01/2026', '02/2026', 'Saldo '];

  const selectClass =
    "bg-[#1a1a1c] border border-[#27272a] text-white text-sm rounded-lg focus:ring-[#d4af37] focus:border-[#d4af37] block w-full p-2.5 outline-none";

  return (
    <div className="flex flex-wrap items-end gap-3 bg-[#111111] p-4 rounded-xl border border-[#27272a] shadow-lg mb-8">
      
      {/* Seletor de Empresa */}
      <div className="flex flex-col min-w-[200px]">
        <label className="text-[#a1a1aa] text-xs uppercase tracking-wider mb-1 font-semibold">
          Empresa
        </label>
        <select
          value={company}
          onChange={e => setCompany(e.target.value)}
          className={selectClass}
        >
          <option value="" disabled>Selecione...</option>
          {companies.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Período Referência */}
      <div className="flex flex-col">
        <label className="text-[#a1a1aa] text-xs uppercase tracking-wider mb-1 font-semibold">
          Mês Atual (Referência)
        </label>
        <select value={target} onChange={e => setTarget(e.target.value)} className={selectClass}>
          {periodOptions.map(opt => (
            <option key={opt} value={opt}>
              {opt === 'Saldo ' ? 'Acumulado (YTD)' : opt}
            </option>
          ))}
        </select>
      </div>

      {/* Comparar Com */}
      <div className="flex flex-col">
        <label className="text-[#a1a1aa] text-xs uppercase tracking-wider mb-1 font-semibold">
          Comparar com
        </label>
        <select value={base} onChange={e => setBase(e.target.value)} className={selectClass}>
          {periodOptions.map(opt => (
            <option key={opt} value={opt}>
              {opt === 'Saldo ' ? 'Acumulado (YTD)' : opt}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={applyFilters}
        disabled={!company}
        className="text-black bg-[#d4af37] hover:bg-[#b5952f] disabled:opacity-40 disabled:cursor-not-allowed font-bold rounded-lg text-sm px-5 py-2.5 transition-colors h-[42px]"
      >
        Analisar
      </button>
    </div>
  );
}
