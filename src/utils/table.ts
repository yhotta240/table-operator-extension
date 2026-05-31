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
