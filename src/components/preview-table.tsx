'use client';

import React, { useState, useMemo } from 'react';
import { Download, FileSpreadsheet, Plus, Trash2, RotateCcw, Check, Sparkles, FileText, ArrowUpDown } from 'lucide-react';
import { Transaction, ConversionSummary } from '@/types/statement';
import { createExcelWorkbook, generateCsvString } from '@/lib/engine/excel-generator';
import * as XLSX from 'xlsx';

interface PreviewTableProps {
  fileName: string;
  initialTransactions: Transaction[];
  isScanned?: boolean;
  onReset: () => void;
}

export function PreviewTable({
  fileName,
  initialTransactions,
  isScanned,
  onReset,
}: PreviewTableProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [editingCell, setEditingCell] = useState<{ id: string; field: keyof Transaction } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Recalculate summary dynamically as user edits cells
  const summary: ConversionSummary = useMemo(() => {
    let totalDebits = 0;
    let totalCredits = 0;

    for (const t of transactions) {
      if (t.debit !== null && !isNaN(Number(t.debit))) {
        totalDebits += Math.abs(Number(t.debit));
      }
      if (t.credit !== null && !isNaN(Number(t.credit))) {
        totalCredits += Math.abs(Number(t.credit));
      }
    }

    totalDebits = Math.round(totalDebits * 100) / 100;
    totalCredits = Math.round(totalCredits * 100) / 100;
    const netChange = Math.round((totalCredits - totalDebits) * 100) / 100;

    return {
      totalDebits,
      totalCredits,
      netChange,
      transactionCount: transactions.length,
    };
  }, [transactions]);

  const handleStartEdit = (id: string, field: keyof Transaction, currentValue: unknown) => {
    setEditingCell({ id, field });
    setEditValue(currentValue !== null && currentValue !== undefined ? String(currentValue) : '');
  };

  const handleSaveEdit = () => {
    if (!editingCell) return;
    const { id, field } = editingCell;

    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;

        if (field === 'debit' || field === 'credit' || field === 'balance') {
          const num = editValue.trim() === '' ? null : parseFloat(editValue.replace(/[^0-9.-]/g, ''));
          return {
            ...t,
            [field]: num !== null && !isNaN(num) ? Math.round(num * 100) / 100 : null,
          };
        }

        return {
          ...t,
          [field]: editValue.trim(),
        };
      })
    );

    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const handleAddRow = () => {
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      description: 'New Transaction',
      debit: null,
      credit: null,
      balance: null,
    };
    setTransactions([newTx, ...transactions]);
  };

  const handleDeleteRow = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleDownloadExcel = () => {
    const workbook = createExcelWorkbook(transactions, fileName);
    const baseName = fileName.replace(/\.[^/.]+$/, '');
    XLSX.writeFile(workbook, `${baseName}_converted.xlsx`);
    setDownloadSuccess('xlsx');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handleDownloadCsv = () => {
    const csvContent = generateCsvString(transactions);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const baseName = fileName.replace(/\.[^/.]+$/, '');
    link.setAttribute('href', url);
    link.setAttribute('download', `${baseName}_converted.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloadSuccess('csv');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="w-full space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              {fileName}
            </h3>
            {isScanned && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                <Sparkles className="h-3 w-3" />
                Gemini Vision OCR
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Click any cell to edit before downloading. Changes update totals in real-time.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={handleAddRow}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Row
          </button>

          <button
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5 text-neutral-500" />
            {downloadSuccess === 'csv' ? 'Downloaded!' : 'CSV'}
          </button>

          <button
            onClick={handleDownloadExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {downloadSuccess === 'xlsx' ? 'Downloaded!' : 'Excel (.xlsx)'}
          </button>

          <button
            onClick={onReset}
            title="Convert Another Statement"
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
          <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Total Debits
          </span>
          <p className="text-lg font-bold text-red-600 dark:text-red-400 mt-0.5">
            {formatCurrency(summary.totalDebits)}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
          <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Total Credits
          </span>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {formatCurrency(summary.totalCredits)}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
          <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Net Change
          </span>
          <p
            className={`text-lg font-bold mt-0.5 ${
              summary.netChange >= 0
                ? 'text-neutral-900 dark:text-white'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {formatCurrency(summary.netChange)}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
          <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Transactions
          </span>
          <p className="text-lg font-bold text-neutral-900 dark:text-white mt-0.5">
            {summary.transactionCount}
          </p>
        </div>
      </div>

      {/* 5-Column Table */}
      <div className="overflow-hidden rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
        {/* Mobile Horizontal Scroll Hint */}
        <div className="sm:hidden px-3.5 py-1.5 text-[11px] text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between font-medium">
          <span>Swipe horizontally to view all 5 columns</span>
          <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Scroll &rarr;</span>
        </div>
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-800 font-semibold text-neutral-600 dark:text-neutral-300">
              <tr>
                <th className="py-3 px-4 w-32">Date</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 w-28 text-right">Debit</th>
                <th className="py-3 px-4 w-28 text-right">Credit</th>
                <th className="py-3 px-4 w-32 text-right">Balance</th>
                <th className="py-3 px-2 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">
                    No transactions found in this document. Click &quot;Add Row&quot; or upload another PDF.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors group"
                  >
                    {/* Date */}
                    <td
                      onClick={() => handleStartEdit(t.id!, 'date', t.date)}
                      className="py-2.5 px-4 cursor-pointer font-mono text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                    >
                      {editingCell?.id === t.id && editingCell?.field === 'date' ? (
                        <input
                          type="text"
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleSaveEdit}
                          onKeyDown={handleKeyDown}
                          className="w-full px-1.5 py-0.5 text-xs rounded border border-emerald-500 bg-white dark:bg-neutral-800 focus:outline-none"
                        />
                      ) : (
                        t.date || '—'
                      )}
                    </td>

                    {/* Description */}
                    <td
                      onClick={() => handleStartEdit(t.id!, 'description', t.description)}
                      className="py-2.5 px-4 cursor-pointer font-medium text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                    >
                      {editingCell?.id === t.id && editingCell?.field === 'description' ? (
                        <input
                          type="text"
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleSaveEdit}
                          onKeyDown={handleKeyDown}
                          className="w-full px-1.5 py-0.5 text-xs rounded border border-emerald-500 bg-white dark:bg-neutral-800 focus:outline-none"
                        />
                      ) : (
                        t.description || '—'
                      )}
                    </td>

                    {/* Debit */}
                    <td
                      onClick={() => handleStartEdit(t.id!, 'debit', t.debit)}
                      className="py-2.5 px-4 text-right cursor-pointer font-mono text-red-600 dark:text-red-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                    >
                      {editingCell?.id === t.id && editingCell?.field === 'debit' ? (
                        <input
                          type="text"
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleSaveEdit}
                          onKeyDown={handleKeyDown}
                          className="w-full px-1.5 py-0.5 text-xs text-right rounded border border-emerald-500 bg-white dark:bg-neutral-800 focus:outline-none"
                        />
                      ) : t.debit !== null ? (
                        formatCurrency(t.debit)
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Credit */}
                    <td
                      onClick={() => handleStartEdit(t.id!, 'credit', t.credit)}
                      className="py-2.5 px-4 text-right cursor-pointer font-mono text-emerald-600 dark:text-emerald-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                    >
                      {editingCell?.id === t.id && editingCell?.field === 'credit' ? (
                        <input
                          type="text"
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleSaveEdit}
                          onKeyDown={handleKeyDown}
                          className="w-full px-1.5 py-0.5 text-xs text-right rounded border border-emerald-500 bg-white dark:bg-neutral-800 focus:outline-none"
                        />
                      ) : t.credit !== null ? (
                        formatCurrency(t.credit)
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Balance */}
                    <td
                      onClick={() => handleStartEdit(t.id!, 'balance', t.balance)}
                      className="py-2.5 px-4 text-right cursor-pointer font-mono text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                    >
                      {editingCell?.id === t.id && editingCell?.field === 'balance' ? (
                        <input
                          type="text"
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleSaveEdit}
                          onKeyDown={handleKeyDown}
                          className="w-full px-1.5 py-0.5 text-xs text-right rounded border border-emerald-500 bg-white dark:bg-neutral-800 focus:outline-none"
                        />
                      ) : t.balance !== null ? (
                        formatCurrency(t.balance)
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Row Delete Action */}
                    <td className="py-2.5 px-2 text-center">
                      <button
                        onClick={() => handleDeleteRow(t.id!)}
                        className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                        title="Delete Row"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
