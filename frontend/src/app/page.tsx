import KPICard from '@/components/KPICard';
import DRETable from '@/components/DRETable';
import EvolutionChart from '@/components/EvolutionChart';
import CompositionChart from '@/components/CompositionChart';
import DashboardFilters from '@/components/DashboardFilters';

async function fetchAPI(endpoint: string) {
  try {
    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'http://backend:8000/api/v1'
      : 'http://localhost:8000/api/v1';

    // Using string interpolation securely based on Next.js standard SSR architecture
    const res = await fetch(`${baseUrl}${endpoint}`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch (err) {
    console.error("API error for", endpoint, err);
    return [];
  }
}

export default async function Home(props: { searchParams: Promise<any> | any }) {
  // Await search Params in Next.js 15
  const searchParams = await props.searchParams;
  const targetPeriod = searchParams?.target || '01/2026';
  const basePeriod = searchParams?.base || '02/2026'; // Por padrao comparando com mes 02 como mockup se nao selecionado

  // Fetching all dashboard widgets concurrently
  const [kpis, evolution, composition, dreTree] = await Promise.all([
    fetchAPI(`/kpis/comparison?target_period=${encodeURIComponent(targetPeriod)}&base_period=${encodeURIComponent(basePeriod)}`),
    fetchAPI('/charts/evolution'),
    fetchAPI(`/charts/composition?period=${encodeURIComponent(targetPeriod)}`),
    fetchAPI(`/dre?period=${encodeURIComponent(targetPeriod)}`)
  ]);

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-white p-8 font-sans">
      <header className="mb-8 border-b border-[#27272a] pb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Casa Brasilis <span className="text-[#D4AF37]">Marine</span></h1>
          <p className="text-[#a1a1aa] text-sm hidden sm:block">Painel Executivo e D.R.E. Analítica</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-[#1a1a1c] border border-[#d4af37]/30 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.15)]">
            <span className="text-[#D4AF37] font-bold text-sm">MG</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-8">
        {/* Global Filter Bar */}
        <DashboardFilters />

        {/* Top KPIs Row */}
        {kpis.length === 0 ? (
          <div className="text-[#D4AF37] p-8 border border-[#27272a] rounded-xl bg-[#111] text-center">Nenhum dado encontrado para as métricas exatas do período selecionado. Tente alterar os meses no filtro acima.</div>
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

        {/* Charts Middle Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <EvolutionChart data={evolution} />
          </div>
          <div className="lg:col-span-1">
            <CompositionChart data={composition} />
          </div>
        </section>

        {/* Data Table Bottom Section */}
        {dreTree.length > 0 && (
          <section className="bg-[#111111] border border-[#27272a] rounded-xl p-6 shadow-xl w-full">
            <h3 className="text-white text-lg font-bold mb-4">Demonstração do Resultado Analítica - Ref: {targetPeriod === 'Saldo ' ? 'Acumulado YTD' : targetPeriod}</h3>
            <DRETable data={dreTree} />
          </section>
        )}
      </main>
    </div>
  );
}
