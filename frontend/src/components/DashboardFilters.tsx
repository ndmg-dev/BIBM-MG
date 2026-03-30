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
  const currentAno = searchParams.get('ano') || '';
  const currentTrimestre = searchParams.get('trimestre') || 'Todos';
  const currentMes = searchParams.get('mes') || 'Todos';

  const [company, setCompany] = useState(currentCompany);
  const [ano, setAno] = useState(currentAno);
  const [trimestre, setTrimestre] = useState(currentTrimestre);
  const [mes, setMes] = useState(currentMes);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [rawPeriods, setRawPeriods] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodsLoading, setPeriodsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    if (!company) { setRawPeriods([]); setAvailableYears([]); return; }
    setPeriodsLoading(true);
    fetch(`${CLIENT_API_BASE}/periods?company_id=${encodeURIComponent(company)}`)
      .then(r => r.json())
      .then((data: string[]) => {
        const p = data || [];
        setRawPeriods(p);
        
        const years = Array.from(new Set(p.filter(x => x.includes('/')).map(x => x.split('/')[1]))).sort();
        setAvailableYears(years);

        if (!currentAno && years.length > 0) {
          setAno(years[years.length - 1]);
        }
      })
      .catch(() => { setRawPeriods([]); setAvailableYears([]); })
      .finally(() => setPeriodsLoading(false));
  }, [company, currentAno]);

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

  const monthNames: Record<string, string> = {
    '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
    '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
    '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro',
  };

  const computePeriods = (y: string, t: string, m: string) => {
    let targetArr: string[] = [];
    let baseArr: string[] = [];
    
    if (m !== 'Todos') {
      targetArr = [`${m}/${y}`];
      let prevM = parseInt(m) - 1; let prevY = parseInt(y);
      if (prevM === 0) { prevM = 12; prevY -= 1; }
      baseArr = [`${prevM.toString().padStart(2, '0')}/${prevY}`];
    } else if (t !== 'Todos') {
      const quarters: Record<string, string[]> = {
        '1': ['01','02','03'], '2': ['04','05','06'], '3': ['07','08','09'], '4': ['10','11','12']
      };
      targetArr = quarters[t].map(mm => `${mm}/${y}`);
      
      let prevT = parseInt(t) - 1; let prevY = parseInt(y);
      if (prevT === 0) { prevT = 4; prevY -= 1; }
      baseArr = quarters[prevT.toString()].map(mm => `${mm}/${prevY}`);
    } else {
      const allMonths = ['01','02','03','04','05','06','07','08','09','10','11','12'];
      targetArr = allMonths.map(mm => `${mm}/${y}`);
      const prevY = parseInt(y) - 1;
      baseArr = allMonths.map(mm => `${mm}/${prevY}`);
    }
    
    return { target: targetArr.join(','), base: baseArr.join(',') };
  };

  const applyFilters = () => {
    if (!company || !ano) return;
    setOpen(false);
    
    const { target, base } = computePeriods(ano, trimestre, mes);
    
    router.push(
      `/?company_id=${encodeURIComponent(company)}` +
      `&target=${encodeURIComponent(target)}&base=${encodeURIComponent(base)}` +
      `&ano=${encodeURIComponent(ano)}&trimestre=${encodeURIComponent(trimestre)}&mes=${encodeURIComponent(mes)}`
    );
  };

  const selectClass = "bg-[#1a1a1c] border border-[#27272a] text-white text-sm rounded-lg focus:ring-[#d4af37] focus:border-[#d4af37] block w-full pl-3 pr-9 py-2.5 outline-none appearance-none cursor-pointer transition-colors hover:border-[#d4af37]/50 disabled:opacity-50 disabled:cursor-wait";

  const getAvailableMonths = () => {
    if (trimestre === 'Todos') return Object.keys(monthNames);
    if (trimestre === '1') return ['01', '02', '03'];
    if (trimestre === '2') return ['04', '05', '06'];
    if (trimestre === '3') return ['07', '08', '09'];
    if (trimestre === '4') return ['10', '11', '12'];
    return [];
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

      <div className="flex flex-col min-w-[120px]">
        <label className="text-[#a1a1aa] text-xs uppercase tracking-wider mb-1.5 font-semibold">Anos</label>
        <div className="relative">
          <select 
            value={ano} 
            onChange={e => { setAno(e.target.value); setTrimestre('Todos'); setMes('Todos'); }} 
            disabled={periodsLoading || availableYears.length === 0} 
            className={selectClass}
          >
            {periodsLoading && <option value="">...</option>}
            {!periodsLoading && availableYears.length === 0 && <option value="">Sem dados</option>}
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d4af37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </div>
      </div>

      <div className="flex flex-col min-w-[140px]">
        <label className="text-[#a1a1aa] text-xs uppercase tracking-wider mb-1.5 font-semibold">Trimestres</label>
        <div className="relative">
          <select 
            value={trimestre} 
            onChange={e => { setTrimestre(e.target.value); setMes('Todos'); }} 
            disabled={periodsLoading || !ano} 
            className={selectClass}
          >
            <option value="Todos">Todos</option>
            <option value="1">1º Trimestre</option>
            <option value="2">2º Trimestre</option>
            <option value="3">3º Trimestre</option>
            <option value="4">4º Trimestre</option>
          </select>
          <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d4af37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </div>
      </div>

      <div className="flex flex-col min-w-[140px]">
        <label className="text-[#a1a1aa] text-xs uppercase tracking-wider mb-1.5 font-semibold">Meses</label>
        <div className="relative">
          <select 
            value={mes} 
            onChange={e => setMes(e.target.value)} 
            disabled={periodsLoading || !ano} 
            className={selectClass}
          >
            <option value="Todos">Todos</option>
            {getAvailableMonths().map(m => (
              <option key={m} value={m}>{monthNames[m]}</option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d4af37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </div>
      </div>

      <button
        onClick={applyFilters}
        disabled={!company || !ano || loading || periodsLoading}
        className="text-black bg-[#d4af37] hover:bg-[#b5952f] disabled:opacity-40 disabled:cursor-not-allowed font-bold rounded-lg text-sm px-6 py-2.5 transition-all h-[42px] shadow-[0_0_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_20px_rgba(212,175,55,0.35)] active:scale-95"
      >
        Analisar
      </button>
    </div>
  );
}
