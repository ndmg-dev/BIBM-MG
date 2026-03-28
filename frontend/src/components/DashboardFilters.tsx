"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

interface Company {
  id: string;
  name: string;
}

// O next.config.ts já tem rewrite: /api/v1/* → backend:8000. Usar caminho relativo.
const CLIENT_API_BASE = '/api/v1';

export default function DashboardFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCompany = searchParams.get('company_id') || '';
  const currentTarget  = searchParams.get('target') || '';
  const currentBase    = searchParams.get('base')   || '';

  const [company, setCompany]     = useState(currentCompany);
  const [target, setTarget]       = useState(currentTarget);
  const [base, setBase]           = useState(currentBase);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [periods, setPeriods]     = useState<string[]>([]);
  const [loading, setLoading]     = useState(true);
  const [periodsLoading, setPeriodsLoading] = useState(false);
  const [open, setOpen]           = useState(false);
  const dropdownRef               = useRef<HTMLDivElement>(null);

  // Busca lista de empresas ao montar
  useEffect(() => {
    setLoading(true);
    fetch(`${CLIENT_API_BASE}/companies`)
      .then(r => r.json())
      .then((data: Company[]) => {
        setCompanies(data || []);
        if (!currentCompany && data?.length > 0) {
          setCompany(data[0].id);
        }
      })
      .catch(() => setCompanies([]))
      .finally(() => setLoading(false));
  }, []);

  // Busca períodos disponíveis sempre que a empresa muda
  useEffect(() => {
    if (!company) { setPeriods([]); return; }
    setPeriodsLoading(true);
    fetch(`${CLIENT_API_BASE}/periods?company_id=${encodeURIComponent(company)}`)
      .then(r => r.json())
      .then((data: string[]) => {
        const p = data || [];
        setPeriods(p);
        // Define target como o último período disponível (mais recente)
        if (p.length > 0) {
          const latestPeriod = p[p.length - 1];
          const secondLatest = p.length > 1 ? p[p.length - 2] : p[0];
          setTarget(prev => (prev && p.includes(prev)) ? prev : latestPeriod);
          setBase(prev  => (prev && p.includes(prev)) ? prev : secondLatest);
        }
      })
      .catch(() => setPeriods([]))
      .finally(() => setPeriodsLoading(false));
  }, [company]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCompany = companies.find(c => c.id === company);

  const applyFilters = () => {
    if (!company) return;
    setOpen(false);
    router.push(
      `/?company_id=${encodeURIComponent(company)}&target=${encodeURIComponent(target)}&base=${encodeURIComponent(base)}`
    );
  };

  // Formata "MM/YYYY" como "Mês Ano" legível
  const formatPeriod = (p: string) => {
    const months: Record<string, string> = {
      '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
      '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
      '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro',
    };
    if (p.includes('/')) {
      const [mm, yyyy] = p.split('/');
      return `${months[mm] || mm} ${yyyy}`;
    }
    return p.trim() === 'Saldo' || p.trim() === 'Saldo ' ? 'Acumulado (YTD)' : p;
  };

  const selectClass =
    "bg-[#1a1a1c] border border-[#27272a] text-white text-sm rounded-lg focus:ring-[#d4af37] focus:border-[#d4af37] block w-full pl-3 pr-9 py-2.5 outline-none appearance-none cursor-pointer transition-colors hover:border-[#d4af37]/50 disabled:opacity-50 disabled:cursor-wait";

  return (
    <div className="flex flex-wrap items-end gap-4 bg-[#111111] p-5 rounded-xl border border-[#27272a] shadow-lg mb-8">

      {/* Seletor de Empresa — Custom Dropdown */}
      <div className="flex flex-col min-w-[240px] flex-1" ref={dropdownRef}>
        <label className="text-[#a1a1aa] text-xs uppercase tracking-wider mb-1.5 font-semibold">
          Empresa
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(prev => !prev)}
            className={`w-full text-left flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all outline-none
              ${open
                ? 'border-[#d4af37] bg-[#1a1a1c] shadow-[0_0_0_3px_rgba(212,175,55,0.15)]'
                : 'border-[#27272a] bg-[#1a1a1c] hover:border-[#d4af37]/50'
              }
              ${loading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
            `}
            disabled={loading}
          >
            <span className={selectedCompany ? 'text-white font-medium' : 'text-[#71717a]'}>
              {loading
                ? 'Carregando empresas...'
                : selectedCompany
                  ? selectedCompany.name
                  : companies.length === 0
                    ? 'Nenhuma empresa cadastrada'
                    : 'Selecione uma empresa...'}
            </span>
            <svg
              className={`w-4 h-4 text-[#d4af37] transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {open && companies.length > 0 && (
            <div className="absolute z-50 mt-1 w-full bg-[#18181b] border border-[#d4af37]/30 rounded-lg shadow-2xl overflow-hidden">
              <div className="p-1">
                {companies.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setCompany(c.id); setOpen(false); }}
                    className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors flex items-center gap-3
                      ${company === c.id
                        ? 'bg-[#d4af37]/10 text-[#d4af37] font-semibold'
                        : 'text-[#d4d4d8] hover:bg-[#27272a] hover:text-white'
                      }
                    `}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                      ${company === c.id ? 'bg-[#d4af37] text-black' : 'bg-[#27272a] text-[#a1a1aa]'}
                    `}>
                      {c.name.charAt(0)}
                    </span>
                    {c.name}
                    {company === c.id && (
                      <svg className="w-4 h-4 ml-auto text-[#d4af37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Período Referência — dinâmico */}
      <div className="flex flex-col">
        <label className="text-[#a1a1aa] text-xs uppercase tracking-wider mb-1.5 font-semibold">
          Mês Atual (Referência)
        </label>
        <div className="relative">
          <select
            value={target}
            onChange={e => setTarget(e.target.value)}
            disabled={periodsLoading || periods.length === 0}
            className={selectClass}
          >
            {periodsLoading && <option value="">Carregando...</option>}
            {!periodsLoading && periods.length === 0 && <option value="">Sem dados</option>}
            {periods.map(opt => (
              <option key={opt} value={opt}>{formatPeriod(opt)}</option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d4af37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Comparar Com — dinâmico */}
      <div className="flex flex-col">
        <label className="text-[#a1a1aa] text-xs uppercase tracking-wider mb-1.5 font-semibold">
          Comparar com
        </label>
        <div className="relative">
          <select
            value={base}
            onChange={e => setBase(e.target.value)}
            disabled={periodsLoading || periods.length === 0}
            className={selectClass}
          >
            {periodsLoading && <option value="">Carregando...</option>}
            {!periodsLoading && periods.length === 0 && <option value="">Sem dados</option>}
            {periods.map(opt => (
              <option key={opt} value={opt}>{formatPeriod(opt)}</option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d4af37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      <button
        onClick={applyFilters}
        disabled={!company || loading || periodsLoading || periods.length === 0}
        className="text-black bg-[#d4af37] hover:bg-[#b5952f] disabled:opacity-40 disabled:cursor-not-allowed font-bold rounded-lg text-sm px-6 py-2.5 transition-all h-[42px] shadow-[0_0_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_20px_rgba(212,175,55,0.35)] active:scale-95"
      >
        Analisar
      </button>
    </div>
  );
}
