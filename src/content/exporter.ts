import type { Settings } from "../settings";
import { logError, logInfo } from "../utils/logger";
import { buildTableCellMatrix } from "../utils/table";

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
    filenameInput.value = this.getDefaultExportFileName();
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
    const downloadName = `${filename}${extension}`;

    try {
      // 全ての行を取得
      const rows = Array.from(this.table.rows);
      const matrix = buildTableCellMatrix(this.table) as (HTMLTableCellElement | undefined)[][];
      const fullRows = rows;
      const numCols = matrix.reduce((m: number, r) => Math.max(m, r ? r.length : 0), 0);
      if (rows.length === 0) return;

      // どの列が選択されているかインデックスを取得 (range === 'selected'用)
      const selectedColIndices: number[] = [];
      if (range === "selected") {
        for (let c = 0; c < numCols; c++) {
          let has = false;
          for (let r = 0; r < fullRows.length; r++) {
            const cell = matrix[r] ? matrix[r][c] : undefined;
            if (cell?.classList.contains("to-selected-cell")) {
              has = true;
              break;
            }
          }
          if (has) selectedColIndices.push(c);
        }
        if (selectedColIndices.length === 0) return;
      }

      const outputRows: string[] = [];

      for (let r = 0; r < fullRows.length; r++) {
        const row = fullRows[r];
        const isHeader = !!row.querySelector("th");

        if (range === "visible" && !isHeader && row.classList.contains("to-row-filtered")) continue;

        const cellsForRow: string[] = [];
        for (let c = 0; c < numCols; c++) {
          if (range === "selected" && !selectedColIndices.includes(c)) continue;
          const cell = matrix[r] ? matrix[r][c] : undefined;
          const text = cell ? cell.innerText.replace(/[\r\n\t]/g, " ").trim() : "";

          let out = text;
          const containsQuote = out.includes('"');
          const containsSeparator = out.includes(separator);
          if (containsQuote || containsSeparator || out.includes(",") || out.includes("\n")) {
            out = `"${out.replace(/"/g, '""')}"`;
          }
          cellsForRow.push(out);
        }

        if (cellsForRow.length === 0) continue;
        outputRows.push(cellsForRow.join(separator));
      }

      if (outputRows.length === 0) return;

      const fileContent = outputRows.join("\n");

      // Excel等での文字化けを防ぐため、BOMを追加 (UTF-8 BOM: \uFEFF)
      const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
      const blob = new Blob([bom, fileContent], { type: `text/${format};charset=utf-8;` });

      // ダウンロード実行用のa要素を作成してクリック
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      try {
        link.setAttribute("href", url);
        link.setAttribute("download", downloadName);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
      } finally {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
        URL.revokeObjectURL(url);
      }

      void logInfo(`${downloadName} をダウンロードしました`, "content");
    } catch (error) {
      void logError(`${downloadName} のエクスポートに失敗しました`, "content", error);
    }
  }

  private getDefaultExportFileName(): string {
    const caption = this.table.caption?.innerText.trim();
    if (caption) return caption;

    const title = document.title.trim();
    if (title) return title;

    return "table-data";
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
