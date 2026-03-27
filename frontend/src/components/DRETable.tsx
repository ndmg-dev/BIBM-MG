'use client';
import React, { useState } from 'react';

export interface DreNode {
  account_name: string;
  value: number;
  percentage: number;
  children: DreNode[];
}

interface DRETableProps {
  data: DreNode[];
}

function DRETableRow({ node, depth = 0 }: { node: DreNode; depth?: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <>
      <tr 
        className={`border-b border-[#27272a] hover:bg-[#202022] transition-colors ${depth === 0 ? 'bg-[#151515] font-semibold' : ''}`}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
        style={{ cursor: hasChildren ? 'pointer' : 'default' }}
      >
        <td className="py-3 px-4 text-sm text-gray-200" style={{ paddingLeft: `${(depth * 1.5) + 1}rem` }}>
          <div className="flex items-center">
            {hasChildren && (
              <span className="mr-2 text-[#D4AF37] text-xs w-4">
                {isExpanded ? '▼' : '▶'}
              </span>
            )}
            {!hasChildren && <span className="mr-2 w-4"></span>}
            <span className={depth === 0 ? 'text-[#D4AF37]' : ''}>{node.account_name}</span>
          </div>
        </td>
        <td className="py-3 px-4 text-sm text-right text-gray-200">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(node.value)}
        </td>
        <td className="py-3 px-4 text-sm text-right text-gray-400">
          {node.percentage.toFixed(2)}%
        </td>
      </tr>
      {isExpanded && hasChildren && node.children.map((child, idx) => (
        <DRETableRow key={`${child.account_name}-${idx}`} node={child} depth={depth + 1} />
      ))}
    </>
  );
}

export default function DRETable({ data }: DRETableProps) {
  return (
    <div className="bg-[#1a1a1c] border border-[#27272a] rounded-xl overflow-hidden shadow-2xl">
      <div className="p-5 border-b border-[#27272a] flex justify-between items-center bg-[#151517]">
        <h2 className="text-white font-semibold text-lg">Demonstração do Resultado do Exercício</h2>
        <span className="text-[#a1a1aa] text-sm">Visão Vertical</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0c0c0c] border-b border-[#27272a] text-[#a1a1aa] text-xs uppercase tracking-wider">
              <th className="py-3 px-4 font-medium">Conta Contábil</th>
              <th className="py-3 px-4 font-medium text-right">Valor Período</th>
              <th className="py-3 px-4 font-medium text-right">Análise Vertical (%)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((node, idx) => (
              <DRETableRow key={idx} node={node} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
