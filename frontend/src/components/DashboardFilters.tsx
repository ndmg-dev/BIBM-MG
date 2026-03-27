"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function DashboardFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const currentTarget = searchParams.get('target') || '01/2026';
  const currentBase = searchParams.get('base') || '02/2026'; // Mocking options based on data

  const [target, setTarget] = useState(currentTarget);
  const [base, setBase] = useState(currentBase);

  const applyFilters = () => {
    router.push(`/?target=${encodeURIComponent(target)}&base=${encodeURIComponent(base)}`);
  };

  const options = ['01/2026', '02/2026', 'Saldo ']; // The strings exactly as they are in DB

  return (
    <div className="flex items-end gap-3 bg-[#111111] p-4 rounded-xl border border-[#27272a] shadow-lg mb-8">
      <div className="flex flex-col">
        <label className="text-[#a1a1aa] text-xs uppercase tracking-wider mb-1 font-semibold">Mês Atual (Referência)</label>
        <select 
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="bg-[#1a1a1c] border border-[#27272a] text-white text-sm rounded-lg focus:ring-[#d4af37] focus:border-[#d4af37] block w-full p-2.5 outline-none"
        >
          {options.map(opt => <option key={opt} value={opt}>{opt === 'Saldo ' ? 'Acumulado (YTD)' : opt}</option>)}
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-[#a1a1aa] text-xs uppercase tracking-wider mb-1 font-semibold">Comparar com</label>
        <select 
          value={base}
          onChange={(e) => setBase(e.target.value)}
          className="bg-[#1a1a1c] border border-[#27272a] text-white text-sm rounded-lg focus:ring-[#d4af37] focus:border-[#d4af37] block w-full p-2.5 outline-none"
        >
          {options.map(opt => <option key={opt} value={opt}>{opt === 'Saldo ' ? 'Acumulado (YTD)' : opt}</option>)}
        </select>
      </div>

      <button 
        onClick={applyFilters}
        className="text-black bg-[#d4af37] hover:bg-[#b5952f] font-bold rounded-lg text-sm px-5 py-2.5 transition-colors h-[42px]"
      >
        Analisar
      </button>
    </div>
  );
}
