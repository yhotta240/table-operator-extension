import type { Settings } from "../settings";

export class TableExporter {
  private table: HTMLTableElement;
  private wrapper: HTMLDivElement | null;
  private settings: Settings;
  private active = false;

  private exportBtn: HTMLButtonElement | null = null;
  private currentPopover: HTMLDivElement | null = null;

  // バインド用イベントリスナーの参照保持
  private clickOutsideListener = this.handleClickOutside.bind(this);
  private escListener = this.handleEsc.bind(this);

  constructor(table: HTMLTableElement, wrapper: HTMLDivElement | null, settings: Settings) {
    this.table = table;
    this.wrapper = wrapper;
    this.settings = settings;
  }

  public enable(): void {
    if (this.active) return;
    this.active = true;

    this.injectExportButton();
    document.addEventListener("click", this.clickOutsideListener);
    document.addEventListener("keydown", this.escListener);
  }

  public disable(): void {
    if (!this.active) return;
    this.active = false;

    document.removeEventListener("click", this.clickOutsideListener);
    document.removeEventListener("keydown", this.escListener);

    this.removePopover();
    this.removeExportButton();
  }

  /**
   * 親設定（ポップアップ側）の更新を通知されたときに呼び出す
   */
  public updateDefaultSettings(settings: Settings): void {
    this.settings = settings;
  }

  /**
   * エクスポートボタン（ダウンロードアイコン）をテーブル右上（ラッパー右上）に注入
   */
  private injectExportButton(): void {
    if (!this.wrapper || this.exportBtn) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "to-export-button";
    btn.title = "エクスポート";
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
    `;

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.togglePopover(btn);
    });

    this.wrapper.appendChild(btn);
    this.exportBtn = btn;
  }

  /**
   * エクスポートボタンの削除
   */
  private removeExportButton(): void {
    if (this.exportBtn) {
      this.exportBtn.remove();
      this.exportBtn = null;
    }
  }

  /**
   * エクスポート設定ポップオーバーの開閉トグル
   */
  private togglePopover(btn: HTMLButtonElement): void {
    if (this.currentPopover) {
      this.removePopover();
      return;
    }

    btn.classList.add("to-popover-open");

    const popover = document.createElement("div");
    popover.className = "to-popover";

    // ファイル名ラベル & 入力
    const labelName = document.createElement("label");
    labelName.textContent = "保存ファイル名";
    const filenameInput = document.createElement("input");
    filenameInput.type = "text";
    filenameInput.value = this.settings.defaultExportFileName || "table-data";
    filenameInput.placeholder = "ファイル名を入力";

    // フォーマット選択
    const labelFormat = document.createElement("label");
    labelFormat.textContent = "ファイル形式";
    const formatSelect = document.createElement("select");
    const optCsv = document.createElement("option");
    optCsv.value = "csv";
    optCsv.textContent = "CSV (.csv)";
    optCsv.selected = this.settings.defaultExportFormat === "csv";
    const optTsv = document.createElement("option");
    optTsv.value = "tsv";
    optTsv.textContent = "TSV (.txt)";
    optTsv.selected = this.settings.defaultExportFormat === "tsv";
    formatSelect.appendChild(optCsv);
    formatSelect.appendChild(optTsv);

    // エクスポート対象範囲の判別（選択中の列があるか検知）
    const hasSelectedCols = this.table.querySelectorAll(".to-selected-cell").length > 0;

    const labelRange = document.createElement("label");
    labelRange.textContent = "保存対象範囲";
    const rangeSelect = document.createElement("select");

    const optAll = document.createElement("option");
    optAll.value = "all";
    optAll.textContent = "すべてのデータ";

    const optVisible = document.createElement("option");
    optVisible.value = "visible";
    optVisible.textContent = "フィルター表示中のデータのみ";
    optVisible.selected = true; // フィルター表示のみをデフォルトにする

    rangeSelect.appendChild(optVisible);
    rangeSelect.appendChild(optAll);

    if (hasSelectedCols) {
      const optSelected = document.createElement("option");
      optSelected.value = "selected";
      optSelected.textContent = "選択された列のみ";
      rangeSelect.appendChild(optSelected);
      rangeSelect.value = "selected"; // 選択列がある場合はそれを優先選択
    }

    // フッター
    const footer = document.createElement("div");
    footer.className = "to-popover-footer";

    const btnCancel = document.createElement("button");
    btnCancel.type = "button";
    btnCancel.className = "to-btn";
    btnCancel.textContent = "キャンセル";
    btnCancel.addEventListener("click", () => this.removePopover());

    const btnDownload = document.createElement("button");
    btnDownload.type = "button";
    btnDownload.className = "to-btn to-btn-primary";
    btnDownload.textContent = "保存";
    btnDownload.addEventListener("click", () => {
      const filename = filenameInput.value.trim() || "table-data";
      const format = formatSelect.value as "csv" | "tsv";
      const range = rangeSelect.value as "all" | "visible" | "selected";

      this.executeExport(filename, format, range);
      this.removePopover();
    });

    footer.appendChild(btnCancel);
    footer.appendChild(btnDownload);

    popover.appendChild(labelName);
    popover.appendChild(filenameInput);
    popover.appendChild(labelFormat);
    popover.appendChild(formatSelect);
    popover.appendChild(labelRange);
    popover.appendChild(rangeSelect);
    popover.appendChild(footer);

    document.body.appendChild(popover);
    this.currentPopover = popover;

    // 表示位置の算出
    const rect = btn.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    const top = rect.bottom + scrollY + 4;
    let left = rect.left + scrollX - 150; // ボタンの左側に寄せる

    if (left < 10) left = 10;

    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
  }

  /**
   * ポップオーバーを削除
   */
  private removePopover(): void {
    if (this.currentPopover) {
      this.currentPopover.remove();
      this.currentPopover = null;
    }
    if (this.exportBtn) {
      this.exportBtn.classList.remove("to-popover-open");
    }
  }

  /**
   * 実際のエクスポート処理を実行する
   */
  private executeExport(
    filename: string,
    format: "csv" | "tsv",
    range: "all" | "visible" | "selected",
  ): void {
    const separator = format === "csv" ? "," : "\t";
    const extension = format === "csv" ? ".csv" : ".txt";

    // 全ての行を取得
    const rows = Array.from(this.table.rows);
    if (rows.length === 0) return;

    // どの列が選択されているかインデックスを取得 (range === 'selected'用)
    const selectedColIndices: number[] = [];
    if (range === "selected") {
      const firstRow = rows[0];
      if (firstRow) {
        for (let i = 0; i < firstRow.cells.length; i++) {
          const hasSelectedCells = Array.from(this.table.rows).some((r) =>
            r.cells[i]?.classList.contains("to-selected-cell"),
          );
          if (hasSelectedCells) {
            selectedColIndices.push(i);
          }
        }
      }
    }

    const outputRows: string[] = [];

    for (const row of rows) {
      const isHeader = !!row.querySelector("th");

      // 'visible' モードで、非表示のデータ行は除外（ヘッダー行は常に含める）
      if (range === "visible" && !isHeader && row.classList.contains("to-row-filtered")) {
        continue;
      }

      // セルデータを抽出
      let cells = Array.from(row.cells);

      // 'selected' モードなら、選択された列インデックスのセルのみに絞り込む
      if (range === "selected") {
        cells = cells.filter((_, idx) => selectedColIndices.includes(idx));
      }

      // 該当行にセルがない場合はスキップ
      if (cells.length === 0) continue;

      const formattedCells = cells.map((cell) => {
        let text = cell.innerText.replace(/[\r\n\t]/g, " ").trim();

        // CSV/TSV用にダブルクォーテーションのエスケープ処理
        // ダブルクォートが含まれる、または区切り文字が含まれる場合はダブルクォートで包む
        const containsQuote = text.includes('"');
        const containsSeparator = text.includes(separator);

        if (containsQuote || containsSeparator || text.includes(",") || text.includes("\n")) {
          text = `"${text.replace(/"/g, '""')}"`;
        }
        return text;
      });

      outputRows.push(formattedCells.join(separator));
    }

    const fileContent = outputRows.join("\n");

    // Excel等での文字化けを防ぐため、BOMを追加 (UTF-8 BOM: \uFEFF)
    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    const blob = new Blob([bom, fileContent], { type: `text/${format};charset=utf-8;` });

    // ダウンロード実行用のa要素を作成してクリック
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}${extension}`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log(`Table Operator: ${filename}${extension} をダウンロードしました。`);
  }

  /**
   * ポップオーバー外クリックでポップオーバーを閉じる
   */
  private handleClickOutside(event: MouseEvent): void {
    if (!this.currentPopover) return;

    const target = event.target as HTMLElement;
    if (!this.currentPopover.contains(target) && !this.exportBtn?.contains(target)) {
      this.removePopover();
    }
  }

  /**
   * ESCキー押下でポップオーバーを閉じる
   */
  private handleEsc(event: KeyboardEvent): void {
    if (event.key === "Escape" && this.currentPopover) {
      this.removePopover();
    }
  }
}
