export type Settings = {
  columnSelectionEnabled: boolean;
  sortingEnabled: boolean;
  filterEnabled: boolean;
  exportEnabled: boolean;
  defaultExportFileName: string;
  defaultExportFormat: "csv" | "tsv";
};

export const DEFAULT_SETTINGS: Settings = {
  columnSelectionEnabled: true,
  sortingEnabled: true,
  filterEnabled: true,
  exportEnabled: true,
  defaultExportFileName: "table-data",
  defaultExportFormat: "csv",
};
