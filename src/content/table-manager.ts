import type { Settings } from "../settings";
import { TableExporter } from "./exporter";
import { TableFilter } from "./filter";
import { TableSelector } from "./selector";
import { TableSorter } from "./sorter";

export class TableManager {
  private table: HTMLTableElement;
  private wrapper: HTMLDivElement | null = null;
  private settings: Settings;
  private enabled: boolean;

  private selector: TableSelector | null = null;
  private sorter: TableSorter | null = null;
  private filter: TableFilter | null = null;
  private exporter: TableExporter | null = null;

  constructor(table: HTMLTableElement, settings: Settings, enabled: boolean) {
    this.table = table;
    this.settings = settings;
    this.enabled = enabled;

    this.initialize();
  }

  private initialize(): void {
    // 重複初期化防止用のマーク
    if (this.table.dataset.toInitialized === "true") return;
    this.table.dataset.toInitialized = "true";

    // テーブル全体をラッパーdivで包む（エクスポートボタンを絶対配置するため）
    const parent = this.table.parentNode;
    if (parent) {
      this.wrapper = document.createElement("div");
      this.wrapper.className = "to-table-wrapper";
      parent.insertBefore(this.wrapper, this.table);
      this.wrapper.appendChild(this.table);
    }

    // 各機能のインスタンス生成
    this.selector = new TableSelector(this.table);
    this.sorter = new TableSorter(this.table);
    this.filter = new TableFilter(this.table);
    // exporter には wrapper と現在のグローバル設定を渡す
    this.exporter = new TableExporter(this.table, this.wrapper, this.settings);

    // 初期設定の適用
    this.applySettings(this.settings, this.enabled);
  }

  /**
   * ポップアップ等からの設定変更を、リロードなしで即座に反映します。
   */
  public applySettings(settings: Settings, enabled: boolean): void {
    this.settings = settings;
    this.enabled = enabled;

    const isSel = enabled && settings.columnSelectionEnabled;
    const isSort = enabled && settings.sortingEnabled;
    const isFil = enabled && settings.filterEnabled;
    const isExp = enabled && settings.exportEnabled;

    // ソートまたはフィルターが有効な場合はヘッダーDOM構造を準備する
    if (isSort || isFil) {
      this.prepareHeaders();
    }

    // 各サブモジュールの有効/無効状態を更新
    if (this.selector) {
      if (isSel) this.selector.enable();
      else this.selector.disable();
    }

    if (this.sorter) {
      if (isSort) this.sorter.enable();
      else this.sorter.disable();
    }

    if (this.filter) {
      if (isFil) this.filter.enable();
      else this.filter.disable();
    }

    // ソートとフィルターが両方オフの場合のみ to-header-container を除去する
    if (!isSort && !isFil) {
      this.restoreHeaders();
    }

    if (this.exporter) {
      // エクスポート側のデフォルト設定を更新しつつ有効無効化
      this.exporter.updateDefaultSettings(settings);
      if (isExp) this.exporter.enable();
      else this.exporter.disable();
    }
  }

  /**
   * テーブル操作を完全に解除し、元のDOM構造に戻します。
   */
  public destroy(): void {
    if (this.table.dataset.toInitialized !== "true") return;

    // 各モジュールの無効化・クリーンアップ
    this.selector?.disable();
    this.sorter?.disable();
    this.filter?.disable();
    this.exporter?.disable();
    this.restoreHeaders();

    this.selector = null;
    this.sorter = null;
    this.filter = null;
    this.exporter = null;

    // ラッパーの解除（テーブルを元の親ノードに戻す）
    if (this.wrapper?.parentNode) {
      const parent = this.wrapper.parentNode;
      parent.insertBefore(this.table, this.wrapper);
      parent.removeChild(this.wrapper);
      this.wrapper = null;
    }

    delete this.table.dataset.toInitialized;
  }

  /**
   * ヘッダーセルのDOM構造を準備（thの中身をラッパーで包み、インジケータ領域を作成）
   * ソートまたはフィルターが有効な場合に呼び出す。両方有効な場合でも1回だけ呼び出せばOK。
   */
  private prepareHeaders(): void {
    const ths = this.table.querySelectorAll("th");
    for (const th of Array.from(ths)) {
      if (th.querySelector(".to-header-container")) continue;

      const container = document.createElement("div");
      container.className = "to-header-container";

      const sortableHeader = document.createElement("span");
      sortableHeader.className = "to-sortable-header";

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
   * prepareHeaders() で挿入した to-header-container を除去し、元のDOM構造に復元する
   * ソートとフィルターが両方オフになったタイミングで呼び出す
   */
  private restoreHeaders(): void {
    const ths = this.table.querySelectorAll("th");
    for (const th of Array.from(ths)) {
      const container = th.querySelector(".to-header-container");
      if (!container) continue;

      const sortableHeader = container.querySelector(".to-sortable-header");
      if (sortableHeader) {
        while (sortableHeader.firstChild) {
          th.insertBefore(sortableHeader.firstChild, container);
        }
      }

      container.parentNode?.removeChild(container);
    }
  }
}
