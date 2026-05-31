import { getLogicalColIndex, buildRowGroupsForSort } from "../utils/table";

export class TableSorter {
  private table: HTMLTableElement;
  private active = false;
  private currentSortCol: number | null = null;
  private currentSortDir: "asc" | "desc" | null = null;

  // バインド用イベントリスナーの参照保持
  private clickListener = this.handleClick.bind(this);

  constructor(table: HTMLTableElement) {
    this.table = table;
  }

  public enable(): void {
    if (this.active) return;
    this.active = true;

    this.table.addEventListener("click", this.clickListener);

    // ソート可能表示の有効化
    const headers = this.table.querySelectorAll(".to-sortable-header");
    for (const h of Array.from(headers)) {
      h.classList.add("to-sortable-active");
      (h as HTMLElement).style.pointerEvents = "auto";
    }
  }

  public disable(): void {
    if (!this.active) return;
    this.active = false;

    this.table.removeEventListener("click", this.clickListener);
    this.currentSortCol = null;
    this.currentSortDir = null;

    // ソート可能表示の無効化
    const headers = this.table.querySelectorAll(".to-sortable-header");
    for (const h of Array.from(headers)) {
      h.classList.remove("to-sortable-active");
      (h as HTMLElement).style.pointerEvents = "";
    }

    // インジケータのリセット
    const indicators = this.table.querySelectorAll(".to-sort-indicator");
    for (const ind of Array.from(indicators)) {
      ind.textContent = "";
    }
  }

  /**
   * クリックイベントハンドリング
   */
  private handleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const sortableHeader = target.closest(".to-sortable-header");
    if (!sortableHeader || !this.table.contains(sortableHeader)) return;

    // Shiftキーが押されている場合は、列選択を優先するためソートは無視する
    if (event.shiftKey) return;

    const th = sortableHeader.closest("th") as HTMLTableCellElement | null;
    if (!th) return;

    const logicalIndex = getLogicalColIndex(this.table, th);
    if (logicalIndex === null) return;
    const cellIndex = logicalIndex;
    let dir: "asc" | "desc" = "asc";

    if (this.currentSortCol === cellIndex) {
      dir = this.currentSortDir === "asc" ? "desc" : "asc";
    }

    this.sortTable(cellIndex, dir);
  }

  /**
   * 指定した列インデックスでテーブルをソート
   */
  private sortTable(colIndex: number, dir: "asc" | "desc"): void {
    const tbody = this.table.querySelector("tbody") || this.table;
    const rows = Array.from(tbody.querySelectorAll("tr")).filter((row) => {
      // ヘッダー行（thを含む行）はソート対象外
      return !row.querySelector("th");
    });

    if (rows.length === 0) return;

    // ソート実行（rowspan ブロックを考慮したグルーピングをユーティリティで生成）
    const groups = buildRowGroupsForSort(this.table, tbody as HTMLTableElement, colIndex);
    groups.sort((a, b) => {
      const cmp = this.compareValues(a.key, b.key, dir);
      return cmp !== 0 ? cmp : a.origIndex - b.origIndex;
    });
    for (const g of groups) {
      for (const row of g.rows) tbody.appendChild(row);
    }

    // ソート状態を更新
    this.currentSortCol = colIndex;
    this.currentSortDir = dir;

    // インジケータ表示の更新
    // インジケータ表示の更新（論理列インデックスで比較）
    const ths = Array.from(this.table.querySelectorAll("th")) as HTMLTableCellElement[];
    for (const th of ths) {
      const ind = th.querySelector(".to-sort-indicator");
      if (!ind) continue;
      const li = getLogicalColIndex(this.table, th);
      if (li === null) {
        ind.textContent = "";
        continue;
      }
      ind.textContent = li === colIndex ? (dir === "asc" ? "▲" : "▼") : "";
    }
  }

  /**
   * 値の比較ロジック（数値、日付、文字列を自動判別）
   */
  private compareValues(a: string, b: string, dir: "asc" | "desc"): number {
    if (a === b) return 0;

    // 数値での比較を試みる
    const numA = Number(a.replace(/,/g, ""));
    const numB = Number(b.replace(/,/g, ""));
    if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
      return dir === "asc" ? numA - numB : numB - numA;
    }

    // 日付での比較を試みる
    const timeA = Date.parse(a);
    const timeB = Date.parse(b);
    if (!Number.isNaN(timeA) && !Number.isNaN(timeB)) {
      return dir === "asc" ? timeA - timeB : timeB - timeA;
    }

    // 一般文字列（日本語等）での比較
    const comparison = a.localeCompare(b, "ja");
    return dir === "asc" ? comparison : -comparison;
  }
}
