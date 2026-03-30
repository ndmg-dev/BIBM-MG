"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface EvolutionChartProps {
  data: any[];
}

export default function EvolutionChart({ data }: EvolutionChartProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="bg-[#111111] border border-[#27272a] rounded-xl p-6 shadow-xl h-full flex flex-col">
      <h3 className="text-white text-lg font-bold mb-4">Evolução de Margens e Resultados</h3>
      <div className="flex-1 w-full min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="period" stroke="#71717a" tick={{fill: '#71717a'}} axisLine={false} tickLine={false} />
            <YAxis 
               yAxisId="left" 
               stroke="#71717a" 
               tick={{fill: '#71717a'}} 
               axisLine={false} 
               tickLine={false} 
               tickFormatter={(val) => `R$ ${(val/1000).toFixed(0)}k`} 
            />
            <YAxis 
               yAxisId="right" 
               orientation="right" 
               stroke="#71717a" 
               tick={{fill: '#71717a'}} 
               axisLine={false} 
               tickLine={false} 
               tickFormatter={(val) => `${val}%`} 
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1a1a1c', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
              itemStyle={{ color: '#fff' }}
              formatter={(value: number, name: string) => {
                const isMargin = name === 'margem_bruta' || name === 'margem_liquida';
                const formattedValue = isMargin 
                  ? `${value.toFixed(2)}%` 
                  : `R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
                  
                let labelName = name;
                if (name === 'receita') labelName = 'Receita Líquida';
                if (name === 'custos') labelName = 'Regimes / Custos';
                if (name === 'lucro_liquido') labelName = 'Lucro Líquido';
                if (name === 'margem_bruta') labelName = 'Margem Bruta';
                if (name === 'margem_liquida') labelName = 'Margem Líquida';
                
                return [formattedValue, labelName];
              }}
              labelStyle={{ color: '#d4af37', fontWeight: 'bold', marginBottom: '8px' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Line yAxisId="left" type="monotone" dataKey="receita" stroke="#e4e4e7" strokeWidth={3} dot={{r: 4, fill: '#e4e4e7', strokeWidth: 0}} activeDot={{r: 6}} name="Receita" />
            <Line yAxisId="left" type="monotone" dataKey="custos" stroke="#f43f5e" strokeWidth={3} dot={{r: 4, fill: '#f43f5e', strokeWidth: 0}} activeDot={{r: 6}} name="Custos" />
            <Line yAxisId="left" type="monotone" dataKey="lucro_liquido" stroke="#d4af37" strokeWidth={4} dot={{r: 5, fill: '#111', stroke: '#d4af37', strokeWidth: 2}} activeDot={{r: 8}} name="Lucro" />
            <Line yAxisId="right" type="monotone" dataKey="margem_bruta" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Margem Bruta %" />
            <Line yAxisId="right" type="monotone" dataKey="margem_liquida" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Margem Liq. %" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
