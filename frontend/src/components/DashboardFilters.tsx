"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

interface Company {
  id: string;
  name: string;
}

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
  const [rawPeriods, setRawPeriods] = useState<string[]>([]);
  const [filterOptions, setFilterOptions] = useState<{label: string, value: string, group: string}[]>([]);
  const [loading, setLoading]     = useState(true);
  const [periodsLoading, setPeriodsLoading] = useState(false);
  const [open, setOpen]           = useState(false);
  const dropdownRef               = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!company) { setRawPeriods([]); setFilterOptions([]); return; }
    setPeriodsLoading(true);
    fetch(`${CLIENT_API_BASE}/periods?company_id=${encodeURIComponent(company)}`)
      .then(r => r.json())
      .then((data: string[]) => {
        const p = data || [];
        setRawPeriods(p);
        
        // Build grouped options
        const months = p.filter(x => x.includes('/'));
        const rest = p.filter(x => !x.includes('/'));
        
        const years: Record<string, string[]> = {};
        months.forEach(m => {
          const [mm, yyyy] = m.split('/');
          if(!years[yyyy]) years[yyyy] = [];
          years[yyyy].push(m);
        });
        
        const options: {label: string, value: string, group: string}[] = [];
        
        // Add Years
        for (const [y, mList] of Object.entries(years)) {
          options.push({ label: `Ano ${y}`, value: mList.join(','), group: 'Anuais' });
        }
        
        // Add Quarters
        for (const [y, mList] of Object.entries(years)) {
          const q1 = mList.filter(m => ['01','02','03'].includes(m.split('/')[0]));
          const q2 = mList.filter(m => ['04','05','06'].includes(m.split('/')[0]));
          const q3 = mList.filter(m => ['07','08','09'].includes(m.split('/')[0]));
          const q4 = mList.filter(m => ['10','11','12'].includes(m.split('/')[0]));
          
          if(q1.length) options.push({ label: `1º Trimestre ${y}`, value: q1.join(','), group: 'Trimestrais' });
          if(q2.length) options.push({ label: `2º Trimestre ${y}`, value: q2.join(','), group: 'Trimestrais' });
          if(q3.length) options.push({ label: `3º Trimestre ${y}`, value: q3.join(','), group: 'Trimestrais' });
          if(q4.length) options.push({ label: `4º Trimestre ${y}`, value: q4.join(','), group: 'Trimestrais' });
        }
        
        // Add Months
        const monthNames: Record<string, string> = {
          '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
          '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
          '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro',
        };
        months.forEach(m => {
          const [mm, yyyy] = m.split('/');
          options.push({ label: `${monthNames[mm] || mm} ${yyyy}`, value: m, group: 'Mensais' });
        });
        
        // Add Rest (Saldo)
        rest.forEach(r => {
          options.push({ label: r.trim() === 'Saldo' ? 'Acumulado (YTD)' : r, value: r, group: 'Gerais' });
        });
        
        setFilterOptions(options);

        // Define target/base only if they are not already validly selected (or if first load without initial state)
        if (options.length > 0) {
          if (!currentTarget && !currentBase) {
            const lastMonth = months.length > 0 ? months[months.length - 1] : options[0].value;
            const prevMonth = months.length > 1 ? months[months.length - 2] : options[0].value;
            setTarget(lastMonth);
            setBase(prevMonth);
          }
        }
      })
      .catch(() => { setRawPeriods([]); setFilterOptions([]); })
      .finally(() => setPeriodsLoading(false));
  }, [company, currentTarget, currentBase]);

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

  const selectClass =
    "bg-[#1a1a1c] border border-[#27272a] text-white text-sm rounded-lg focus:ring-[#d4af37] focus:border-[#d4af37] block w-full pl-3 pr-9 py-2.5 outline-none appearance-none cursor-pointer transition-colors hover:border-[#d4af37]/50 disabled:opacity-50 disabled:cursor-wait";

  // Agrupa as options para o select
  const renderOptions = () => {
    const groups = ['Anuais', 'Trimestrais', 'Mensais', 'Gerais'];
    return groups.map(g => {
      const opts = filterOptions.filter(o => o.group === g);
      if (opts.length === 0) return null;
      return (
        <optgroup key={g} label={g} className="bg-[#111] text-[#a1a1aa] font-semibold">
          {opts.map(o => (
            <option key={`${g}-${o.label}`} value={o.value} className="text-white font-normal bg-[#1a1a1c]">
              {o.label}
            </option>
          ))}
        </optgroup>
      );
    });
  };

  return (
    <div className="flex flex-wrap items-end gap-4 bg-[#111111] p-5 rounded-xl border border-[#27272a] shadow-lg mb-8">
      <div className="flex flex-col min-w-[240px] flex-1" ref={dropdownRef}>
        <label className="text-[#a1a1aa] text-xs uppercase tracking-wider mb-1.5 font-semibold">
          Empresa
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(prev => !prev)}
            className={`w-full text-left flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all outline-none
              ${open ? 'border-[#d4af37] bg-[#1a1a1c] shadow-[0_0_0_3px_rgba(212,175,55,0.15)]' : 'border-[#27272a] bg-[#1a1a1c] hover:border-[#d4af37]/50'}
              ${loading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
            `}
            disabled={loading}
          >
            <span className={selectedCompany ? 'text-white font-medium' : 'text-[#71717a]'}>
              {loading ? 'Carregando empresas...' : selectedCompany ? selectedCompany.name : (companies.length === 0 ? 'Nenhuma empresa cadastrada' : 'Selecione uma empresa...')}
            </span>
            <svg className={`w-4 h-4 text-[#d4af37] transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                      ${company === c.id ? 'bg-[#d4af37]/10 text-[#d4af37] font-semibold' : 'text-[#d4d4d8] hover:bg-[#27272a] hover:text-white'}
                    `}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${company === c.id ? 'bg-[#d4af37] text-black' : 'bg-[#27272a] text-[#a1a1aa]'}`}>
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

      <div className="flex flex-col">
        <label className="text-[#a1a1aa] text-xs uppercase tracking-wider mb-1.5 font-semibold">
          ALVO (PERÍODO ATUAL)
        </label>
        <div className="relative">
          <select
            value={target}
            onChange={e => setTarget(e.target.value)}
            disabled={periodsLoading || filterOptions.length === 0}
            className={selectClass}
          >
            {periodsLoading && <option value="">Carregando...</option>}
            {!periodsLoading && filterOptions.length === 0 && <option value="">Sem dados</option>}
            {renderOptions()}
          </select>
          <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d4af37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      <div className="flex flex-col">
        <label className="text-[#a1a1aa] text-xs uppercase tracking-wider mb-1.5 font-semibold">
          BASE (COMPARAR COM)
        </label>
        <div className="relative">
          <select
            value={base}
            onChange={e => setBase(e.target.value)}
            disabled={periodsLoading || filterOptions.length === 0}
            className={selectClass}
          >
            {periodsLoading && <option value="">Carregando...</option>}
            {!periodsLoading && filterOptions.length === 0 && <option value="">Sem dados</option>}
            {renderOptions()}
          </select>
          <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d4af37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      <button
        onClick={applyFilters}
        disabled={!company || loading || periodsLoading || filterOptions.length === 0}
        className="text-black bg-[#d4af37] hover:bg-[#b5952f] disabled:opacity-40 disabled:cursor-not-allowed font-bold rounded-lg text-sm px-6 py-2.5 transition-all h-[42px] shadow-[0_0_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_20px_rgba(212,175,55,0.35)] active:scale-95"
      >
        Analisar
      </button>
    </div>
  );
}
