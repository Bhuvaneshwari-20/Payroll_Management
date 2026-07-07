import { useState, useMemo, useEffect } from 'react';


export default function DataTable({
  columns,
  data,
  pageSizeOptions = [10, 25, 50, 100],
  defaultPageSize = 10,
  enableSearch = true,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No records found',
  rowKey = (row, i) => row.id ?? i,
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [page, setPage] = useState(1);

  const getValue = (row, col) => {
    if (col.accessor) return col.accessor(row);
    const v = row[col.key];
    return v === null || v === undefined ? '' : v;
  };

  const handleSort = (col) => {
    if (col.sortable === false) return;
    setSortConfig((prev) => {
      if (prev.key !== col.key) return { key: col.key, direction: 'asc' };
      if (prev.direction === 'asc') return { key: col.key, direction: 'desc' };
      return { key: null, direction: 'asc' };
    });
    setPage(1);
  };

  const filtered = useMemo(() => {
    if (!enableSearch || !search.trim()) return data;
    const q = search.trim().toLowerCase();
    return data.filter((row) =>
      columns.some((col) => String(getValue(row, col)).toLowerCase().includes(q))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, search, columns, enableSearch]);

  const sorted = useMemo(() => {
    if (!sortConfig.key) return filtered;
    const col = columns.find((c) => c.key === sortConfig.key);
    if (!col) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = getValue(a, col);
      const bVal = getValue(b, col);
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sortConfig, columns]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const pageRows = sorted.slice(startIdx, startIdx + pageSize);

  // Reset to page 1 whenever the underlying dataset size changes (new
  // upload, new employee added, etc.) so you don't get stranded on an
  // empty page.
  useEffect(() => { setPage(1); }, [data.length]);

  const goToPage = (p) => setPage(Math.min(Math.max(1, p), totalPages));

  // Windowed page numbers with ellipses, e.g. 1 2 3 ... 26 or 1 ... 12 13 14 ... 26
  const pageNumbers = useMemo(() => {
    const delta = 2;
    const range = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= safePage - delta && i <= safePage + delta)) {
        range.push(i);
      }
    }
    const withDots = [];
    let last = null;
    range.forEach((i) => {
      if (last !== null) {
        if (i - last === 2) withDots.push(last + 1);
        else if (i - last > 2) withDots.push('...');
      }
      withDots.push(i);
      last = i;
    });
    return withDots;
  }, [totalPages, safePage]);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <span className="text-muted small">Show</span>
          <select
            className="form-select form-select-sm"
            style={{ width: 80 }}
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
          >
            {pageSizeOptions.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <span className="text-muted small">entries</span>
        </div>
        {enableSearch && (
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted small">Search:</span>
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ width: 220 }}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={searchPlaceholder}
            />
          </div>
        )}
      </div>

      <div className="table-responsive">
        <table className="table table-hover" width="100%">
          <thead>
            <tr>
              {columns.map((col) => {
                const isActive = sortConfig.key === col.key;
                const isAsc = isActive && sortConfig.direction === 'asc';
                const isDesc = isActive && sortConfig.direction === 'desc';
                const sortable = col.sortable !== false;
                return (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col)}
                    style={{ cursor: sortable ? 'pointer' : 'default', whiteSpace: 'nowrap', userSelect: 'none' }}
                    title={sortable ? 'Click to sort' : undefined}
                  >
                    {col.label}
                    {sortable && (
                      <span style={{ display: 'inline-flex', flexDirection: 'column', marginLeft: 6, verticalAlign: 'middle', lineHeight: '0.7' }}>
                        <span style={{ fontSize: '0.6rem', color: isAsc ? '#0d6efd' : '#adb5bd' }}>▲</span>
                        <span style={{ fontSize: '0.6rem', color: isDesc ? '#0d6efd' : '#adb5bd' }}>▼</span>
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr><td colSpan={columns.length} className="text-center py-4">{emptyMessage}</td></tr>
            )}
            {pageRows.map((row, i) => (
              <tr key={rowKey(row, startIdx + i)}>
                {columns.map((col) => (
                  <td key={col.key}>{col.render ? col.render(row) : getValue(row, col)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-2">
        <div className="text-muted small">
          {total === 0
            ? 'Showing 0 entries'
            : `Showing ${startIdx + 1} to ${Math.min(startIdx + pageSize, total)} of ${total} entries`}
        </div>
        {totalPages > 1 && (
          <nav>
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${safePage === 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => goToPage(safePage - 1)}>Previous</button>
              </li>
              {pageNumbers.map((p, i) =>
                p === '...' ? (
                  <li key={`dots-${i}`} className="page-item disabled"><span className="page-link">...</span></li>
                ) : (
                  <li key={p} className={`page-item ${p === safePage ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => goToPage(p)}>{p}</button>
                  </li>
                )
              )}
              <li className={`page-item ${safePage === totalPages ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => goToPage(safePage + 1)}>Next</button>
              </li>
            </ul>
          </nav>
        )}
      </div>
    </div>
  );
}