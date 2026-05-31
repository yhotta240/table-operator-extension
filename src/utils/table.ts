/**
 * テーブルの論理的なセルマトリクスを構築するユーティリティ
 * rowspan/colspan を考慮して、[rowIndex][colIndex] -> cell のマッピングを返す
 */
export function buildTableCellMatrix(
  table: HTMLTableElement,
): (HTMLTableCellElement | undefined)[][] {
  const rows = Array.from(table.rows);
  const matrix: (HTMLTableCellElement | undefined)[][] = [];

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!matrix[r]) matrix[r] = [];

    let colCursor = 0;
    for (const cell of Array.from(row.cells)) {
      // 次の未使用カラムへ移動
      while (matrix[r][colCursor] !== undefined) {
        colCursor++;
      }

      const rowSpan = (cell as HTMLTableCellElement).rowSpan || 1;
      const colSpan = (cell as HTMLTableCellElement).colSpan || 1;

      for (let dr = 0; dr < rowSpan; dr++) {
        for (let dc = 0; dc < colSpan; dc++) {
          const rr = r + dr;
          const cc = colCursor + dc;
          if (!matrix[rr]) matrix[rr] = [];
          matrix[rr][cc] = cell as HTMLTableCellElement;
        }
      }

      colCursor += colSpan;
    }
  }

  return matrix;
}

/**
 * 指定したセル（通常は th）に対応する論理的な列インデックスを返す
 */
export function getLogicalColIndex(
  table: HTMLTableElement,
  cell: HTMLTableCellElement,
): number | null {
  const matrix = buildTableCellMatrix(table);
  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r];
    for (let c = 0; c < (row ? row.length : 0); c++) {
      if (row[c] === cell) return c;
    }
  }
  return null;
}

/**
 * 指定テーブルの tbody（または table 自体）内データ行に対して、
 * rowspan を考慮した「行グループ」を作成する。
 * 各グループは連続する行ブロックを持ち、ソート時はこのグループ単位で並べ替える。
 */
export function buildRowGroupsForSort(
  table: HTMLTableElement,
  container: HTMLTableSectionElement | HTMLTableElement,
  colIndex: number,
): { rows: HTMLTableRowElement[]; key: string; origIndex: number }[] {
  const matrix = buildTableCellMatrix(table);
  const tableRows = Array.from(table.rows);
  const dataRows = Array.from(container.querySelectorAll("tr")).filter(
    (r) => !r.querySelector("th"),
  );

  const groups: { rows: HTMLTableRowElement[]; key: string; origIndex: number }[] = [];

  const getBlockLen = (row: HTMLTableRowElement) =>
    Math.max(1, ...Array.from(row.cells).map((c) => (c as HTMLTableCellElement).rowSpan || 1));

  const cellTextAt = (row: HTMLTableRowElement) => {
    const idx = tableRows.indexOf(row);
    const cell = matrix[idx] ? matrix[idx][colIndex] : undefined;
    return cell ? cell.innerText.trim() : "";
  };

  let i = 0;
  while (i < dataRows.length) {
    const startRow = dataRows[i] as HTMLTableRowElement;
    const blockLen = getBlockLen(startRow);
    const blockRows = dataRows.slice(i, i + blockLen) as HTMLTableRowElement[];
    groups.push({ rows: blockRows, key: cellTextAt(startRow), origIndex: i });
    i += blockLen;
  }

  return groups;
}
