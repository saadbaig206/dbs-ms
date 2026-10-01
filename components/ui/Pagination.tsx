"use client";

import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
  itemLabel?: string;
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize = 5,
  onPageChange,
  className = "",
  itemLabel = "records",
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  // Generate page numbers with smart ellipsis
  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push("...");
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (safePage < totalPages - 2) pages.push("...");
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  }, [safePage, totalPages]);

  if (totalItems === 0) return null;

  return (
    <div
      className={`px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-slate-50/50 dark:bg-slate-900/50 ${className}`}
    >
      <div className="text-slate-500 dark:text-slate-400 font-medium">
        Showing <span className="font-bold text-slate-800 dark:text-slate-200">{startItem}</span> to{" "}
        <span className="font-bold text-slate-800 dark:text-slate-200">{endItem}</span> of{" "}
        <span className="font-bold text-slate-800 dark:text-slate-200">{totalItems}</span> {itemLabel}
        {totalPages > 1 && (
          <span className="ml-2 text-[11px] text-slate-400">
            (Page {safePage} of {totalPages} • 5 per page)
          </span>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={safePage <= 1}
            aria-label="First page"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed transition shadow-2xs"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage <= 1}
            aria-label="Previous page"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed transition shadow-2xs"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-1 mx-1">
            {pageNumbers.map((p, idx) => {
              if (p === "...") {
                return (
                  <span key={`ellipsis-${idx}`} className="px-1.5 text-slate-400 font-bold select-none">
                    ...
                  </span>
                );
              }
              const num = p as number;
              const isActive = num === safePage;
              return (
                <button
                  type="button"
                  key={num}
                  onClick={() => onPageChange(num)}
                  className={`min-w-7 h-7 px-2 rounded-lg font-bold text-xs transition ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {num}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage >= totalPages}
            aria-label="Next page"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed transition shadow-2xs"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={safePage >= totalPages}
            aria-label="Last page"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed transition shadow-2xs"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Custom hook to manage 5-item-per-page pagination with automatic bounds clamping
 */
export function usePagination<T>(items: T[], initialPageSize: number = 5) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = initialPageSize;

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedItems = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }, [items, safePage, pageSize]);

  return {
    currentPage: safePage,
    setCurrentPage,
    pageSize,
    totalItems,
    totalPages,
    paginatedItems,
  };
}
