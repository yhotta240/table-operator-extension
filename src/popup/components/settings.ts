import type { Settings } from "../../settings";

export function setupSettingsTab(
  settings: Settings,
  onUpdate: (
    patch: Partial<Settings>,
    successMessage: string,
    failedMessage: string,
  ) => Promise<void>,
): void {
  const columnSelectionToggle = document.getElementById(
    "setting-column-selection",
  ) as HTMLInputElement | null;
  const sortingToggle = document.getElementById("setting-sorting") as HTMLInputElement | null;
  const filterToggle = document.getElementById("setting-filter") as HTMLInputElement | null;
  const exportToggle = document.getElementById("setting-export") as HTMLInputElement | null;
  const exportFilenameInput = document.getElementById(
    "setting-export-filename",
  ) as HTMLInputElement | null;
  const exportFormatSelect = document.getElementById(
    "setting-export-format",
  ) as HTMLSelectElement | null;

  // 初期値のロード
  if (columnSelectionToggle) {
    columnSelectionToggle.checked = settings.columnSelectionEnabled;
  }
  if (sortingToggle) {
    sortingToggle.checked = settings.sortingEnabled;
  }
  if (filterToggle) {
    filterToggle.checked = settings.filterEnabled;
  }
  if (exportToggle) {
    exportToggle.checked = settings.exportEnabled;
  }
  if (exportFilenameInput) {
    exportFilenameInput.value = settings.defaultExportFileName || "";
  }
  if (exportFormatSelect) {
    exportFormatSelect.value = settings.defaultExportFormat || "csv";
  }

  // イベントリスナーの登録
  columnSelectionToggle?.addEventListener("change", (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    onUpdate(
      { columnSelectionEnabled: checked },
      `列選択機能を${checked ? "有効" : "無効"}にしました`,
      "列選択設定の保存に失敗しました",
    );
  });

  sortingToggle?.addEventListener("change", (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    onUpdate(
      { sortingEnabled: checked },
      `並び替え機能を${checked ? "有効" : "無効"}にしました`,
      "並び替え設定の保存に失敗しました",
    );
  });

  filterToggle?.addEventListener("change", (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    onUpdate(
      { filterEnabled: checked },
      `フィルター機能を${checked ? "有効" : "無効"}にしました`,
      "フィルター設定の保存に失敗しました",
    );
  });

  exportToggle?.addEventListener("change", (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    onUpdate(
      { exportEnabled: checked },
      `エクスポート機能を${checked ? "有効" : "無効"}にしました`,
      "エクスポート設定の保存に失敗しました",
    );
  });

  exportFilenameInput?.addEventListener("change", (e) => {
    const value = (e.target as HTMLInputElement).value.trim();
    onUpdate(
      { defaultExportFileName: value },
      `デフォルトのファイル名を「${value}」に変更しました`,
      "ファイル名設定の保存に失敗しました",
    );
  });

  exportFormatSelect?.addEventListener("change", (e) => {
    const value = (e.target as HTMLSelectElement).value as "csv" | "tsv";
    onUpdate(
      { defaultExportFormat: value },
      `デフォルトのエクスポート形式を ${value.toUpperCase()} に変更しました`,
      "エクスポート形式の保存に失敗しました",
    );
  });
}
