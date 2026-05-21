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

    this.prepareHeaders();
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

    // インジケータとスタイルのクリーンアップ
    const indicators = this.table.querySelectorAll(".to-sort-indicator");
    for (const ind of Array.from(indicators)) {
      ind.textContent = "";
    }

    const headers = this.table.querySelectorAll(".to-sortable-header");
    for (const h of Array.from(headers)) {
      h.classList.remove("to-sortable-active");
      (h as HTMLElement).style.pointerEvents = "none";
    }

    this.currentSortCol = null;
    this.currentSortDir = null;
  }

  /**
   * ヘッダーセルのDOM構造を準備（thの中身をラッパーで包み、インジケータ領域を作成）
   */
  private prepareHeaders(): void {
    const ths = this.table.querySelectorAll("th");
    for (const th of Array.from(ths)) {
      // すでに初期化済みの場合はスキップ
      if (th.querySelector(".to-header-container")) continue;

      const container = document.createElement("div");
      container.className = "to-header-container";

      const sortableHeader = document.createElement("span");
      sortableHeader.className = "to-sortable-header";

      // 既存のthの全子要素をsortableHeaderに移動
      while (th.firstChild) {
        sortableHeader.appendChild(th.firstChild);
      }

      const indicator = document.createElement("span");
      indicator.className = "to-sort-indicator";

      container.appendChild(sortableHeader);
      container.appendChild(indicator);
      th.appendChild(container);
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

    const th = sortableHeader.closest("th");
    if (!th) return;

    const cellIndex = th.cellIndex;
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

    // ソート実行
    rows.sort((rowA, rowB) => {
      const cellA = rowA.cells[colIndex];
      const cellB = rowB.cells[colIndex];

      const valA = cellA ? cellA.innerText.trim() : "";
      const valB = cellB ? cellB.innerText.trim() : "";

      return this.compareValues(valA, valB, dir);
    });

    // ソート結果をDOMに再挿入（再アペンドすることで並びが順次反映される）
    for (const row of rows) {
      tbody.appendChild(row);
    }

    // ソート状態を更新
    this.currentSortCol = colIndex;
    this.currentSortDir = dir;

    // インジケータ表示の更新
    const ths = this.table.querySelectorAll("th");
    for (const th of Array.from(ths)) {
      const ind = th.querySelector(".to-sort-indicator");
      if (ind) {
        if (th.cellIndex === colIndex) {
          ind.textContent = dir === "asc" ? "▲" : "▼";
        } else {
          ind.textContent = "";
        }
      }
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
