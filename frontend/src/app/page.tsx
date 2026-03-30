import KPICard from '@/components/KPICard';
import DRETable from '@/components/DRETable';
import EvolutionChart from '@/components/EvolutionChart';
import CompositionChart from '@/components/CompositionChart';
import DashboardFilters from '@/components/DashboardFilters';
import ExportButton from '@/components/ExportButton';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

async function fetchAPI(endpoint: string) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function Home(props: { searchParams: Promise<any> | any }) {
  const searchParams  = await props.searchParams;
  const companyId     = searchParams?.company_id || '';
  const companyFilter = companyId ? `&company_id=${encodeURIComponent(companyId)}` : '';
  const targetPeriod  = searchParams?.target || '01/2026';
  const basePeriod    = searchParams?.base   || '02/2026';

  // Resolve o nome da empresa para exibir no header
  let companyName = 'Selecione uma empresa';
  if (companyId) {
    try {
      const companies: { id: string; name: string }[] = await fetchAPI('/companies');
      const found = companies.find(c => c.id === companyId);
      if (found) companyName = found.name;
    } catch {}
  }

  const [kpis, evolution, composition, dreTree] = await Promise.all([
    fetchAPI(`/kpis/comparison?target_period=${encodeURIComponent(targetPeriod)}&base_period=${encodeURIComponent(basePeriod)}${companyFilter}`),
    fetchAPI(`/charts/evolution?${companyFilter.replace('&', '')}`),
    fetchAPI(`/charts/composition?period=${encodeURIComponent(targetPeriod)}${companyFilter}`),
    fetchAPI(`/dre?target_period=${encodeURIComponent(targetPeriod)}&base_period=${encodeURIComponent(basePeriod)}${companyFilter}`),
  ]);

  // Divide o nome da empresa em palavras para estilizar a última em dourado
  const nameParts   = companyName.trim().split(' ');
  const lastWord    = nameParts.pop();
  const firstName   = nameParts.join(' ');

  const getLabel = (periods: string) => {
    if(!periods) return 'Período';
    const arr = periods.split(',');
    if(arr.length === 1) return arr[0] === 'Saldo ' || arr[0] === 'Saldo' ? 'YTD' : arr[0];
    if(arr.length === 3) return `Trimestre (${arr[0].substring(3)} - ${arr[1].substring(3)} - ${arr[2].substring(3)})`;
    if(arr.length > 3) return `Agrupado (${arr.length} Meses)`;
    return `Agrupado (${arr.length})`;
  };

  const targetLabelName = getLabel(targetPeriod);
  const baseLabelName = getLabel(basePeriod);

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-white p-8 font-sans">
      <header className="mb-8 border-b border-[#27272a] pb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
            {firstName ? (
              <>{firstName} <span className="text-[#D4AF37]">{lastWord}</span></>
            ) : (
              <span className="text-[#D4AF37]">{lastWord}</span>
            )}
          </h1>
          <p className="text-[#a1a1aa] text-sm hidden sm:block">Painel Executivo e D.R.E. Analítica</p>
        </div>
        <div className="flex items-center gap-4">
          {companyId && dreTree?.length > 0 && (
            <ExportButton 
              dreData={dreTree} 
              companyName={companyName} 
              targetPeriod={targetLabelName}
              basePeriod={baseLabelName}
            />
          )}
          <div className="h-10 w-10 bg-[#1a1a1c] border border-[#d4af37]/30 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.15)] flex-shrink-0">
            <span className="text-[#D4AF37] font-bold text-sm">MG</span>
          </div>
        </div>
      </header>

      <main id="dashboard-export-wrapper" className="max-w-7xl mx-auto space-y-8">
        <DashboardFilters />

        {!companyId ? (
          <div className="text-[#a1a1aa] p-12 border border-[#27272a] rounded-xl bg-[#111] text-center">
            <p className="text-lg font-semibold text-white mb-2">Bem-vindo ao Painel Executivo</p>
            <p className="text-sm">Selecione uma empresa no filtro acima para visualizar a análise.</p>
          </div>
        ) : (
          <>
            {kpis.length === 0 ? (
              <div className="text-[#D4AF37] p-8 border border-[#27272a] rounded-xl bg-[#111] text-center">
                Nenhum dado encontrado para o período selecionado. Tente alterar os filtros.
              </div>
            ) : (
              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map((kpi: any, idx: number) => (
                  <KPICard
                    key={idx}
                    title={kpi.title}
                    target_value={kpi.target_value}
                    delta_percentage={kpi.delta_percentage}
                    delta_absolute={kpi.delta_absolute}
                  />
                ))}
              </section>
            )}

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <EvolutionChart data={evolution} />
              </div>
              <div className="lg:col-span-1">
                <CompositionChart data={composition} />
              </div>
            </section>

            {dreTree.length > 0 && (
              <section className="bg-[#111111] border border-[#27272a] rounded-xl p-6 shadow-xl w-full">
                <DRETable 
                  data={dreTree} 
                  targetLabel={targetLabelName}
                  baseLabel={baseLabelName}
                />
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
