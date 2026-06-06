import { buildTableCellMatrix, getLogicalColIndex } from "../utils/table";

export class TableSelector {
  private table: HTMLTableElement;
  private active = false;

  // バインド用イベントリスナーの参照保持
  private mousedownListener = this.handleMousedown.bind(this);
  private documentMousedownListener = this.handleDocumentMousedown.bind(this);
  private copyListener = this.handleCopy.bind(this);

  constructor(table: HTMLTableElement) {
    this.table = table;
  }

  public enable(): void {
    if (this.active) return;
    this.active = true;

    this.table.addEventListener("mousedown", this.mousedownListener);
    document.addEventListener("mousedown", this.documentMousedownListener);
    document.addEventListener("copy", this.copyListener);
  }

  public disable(): void {
    if (!this.active) return;
    this.active = false;

    this.table.removeEventListener("mousedown", this.mousedownListener);
    document.removeEventListener("mousedown", this.documentMousedownListener);
    document.removeEventListener("copy", this.copyListener);

    // 選択状態のクリーンアップ
    this.clearSelection();
  }

  /**
   * mousedownイベントのハンドリング
   */
  private handleMousedown(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    // フィルターボタン、エクスポートボタン、ポップオーバー内部は選択トリガーから除外
    if (this.isControlElement(target)) {
      return;
    }

    if (!event.ctrlKey) {
      // Ctrlなしのクリック時は選択状態を解除
      this.clearSelection();
      return;
    }

    const cell = this.getTableCell(target);
    if (cell) this.selectColumn(cell);
  }

  /**
   * ドキュメント全体での mousedown イベントハンドリング（テーブル外クリック時の選択解除）
   */
  private handleDocumentMousedown(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.isControlElement(target)) return;

    if (event.ctrlKey) {
      if (!this.getTableCell(target)) {
        this.clearSelection();
      }
      return;
    }

    // テーブル外部かつ関連操作UI外部をクリックした場合に選択をクリア
    if (!this.table.contains(target)) {
      this.clearSelection();
    }
  }

  /**
   * コピー（Ctrl+C）イベントのインターセプト
   */
  private handleCopy(event: ClipboardEvent): void {
    const selectedCells = this.table.querySelectorAll(".to-selected-cell");
    if (selectedCells.length === 0) return;

    // もしアクティブなテキスト選択が存在し、その選択範囲がテーブル内部にある場合は、
    // ブラウザ標準の選択コピー（ドラッグした部分のみのコピー）を優先する
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      try {
        const range = selection.getRangeAt(0);
        if (this.table.contains(range.commonAncestorContainer)) {
          // イベントをpreventDefaultせず、ブラウザ標準のコピー処理に委ねる
          return;
        }
      } catch (_) {
        // 例外時は独自コピー処理へフォールバック
      }
    }

    // テキスト選択範囲がない、もしくはヘッダーをクリックして列全体を選択した場合は
    // 選択された列全体のデータをTSV形式（かつフィルター中の非表示行を除外）でコピーする
    event.preventDefault();

    const tsvLines: string[] = [];
    const rows = Array.from(this.table.rows);

    for (const row of rows) {
      // フィルターで非表示になっている行は除外
      if (row.classList.contains("to-row-filtered")) {
        continue;
      }

      const selectedCellsInRow = Array.from(row.cells).filter((cell) =>
        cell.classList.contains("to-selected-cell"),
      );

      if (selectedCellsInRow.length > 0) {
        const rowText = selectedCellsInRow
          .map((cell) => {
            // 改行やタブをスペースに置換してフォーマット崩れを防ぐ
            return cell.innerText.replace(/[\n\r\t]/g, " ").trim();
          })
          .join("\t");
        tsvLines.push(rowText);
      }
    }

    const tsvString = tsvLines.join("\n");

    if (event.clipboardData) {
      event.clipboardData.setData("text/plain", tsvString);
      console.log("Table Operator: 選択された列データをコピーしました（TSV形式）");
    }
  }

  /**
   * 選択ハイライトおよびスタイル制限をすべてクリア
   */
  private clearSelection(): void {
    this.table.classList.remove("to-column-selecting");
    for (const cell of Array.from(this.table.querySelectorAll(".to-selected-cell"))) {
      cell.classList.remove("to-selected-cell");
    }
  }

  private selectColumn(cell: HTMLTableCellElement): void {
    const logicalIndex = getLogicalColIndex(this.table, cell);
    if (logicalIndex === null) return;

    this.clearSelection();
    this.table.classList.add("to-column-selecting");

    const matrix = buildTableCellMatrix(this.table);
    for (const row of matrix) {
      row[logicalIndex]?.classList.add("to-selected-cell");
    }
  }

  private getTableCell(target: HTMLElement): HTMLTableCellElement | null {
    const cell = target.closest("td, th") as HTMLTableCellElement | null;
    return cell && this.table.contains(cell) ? cell : null;
  }

  private isControlElement(target: HTMLElement): boolean {
    return !!target.closest(".to-filter-button, .to-export-button, .to-popover");
  }
}
