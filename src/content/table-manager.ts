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
}
