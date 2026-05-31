export type SiteRule = {
  pattern: string;
  columnSelectionEnabled: boolean;
  sortingEnabled: boolean;
  filterEnabled: boolean;
  exportEnabled: boolean;
};

export type Settings = {
  columnSelectionEnabled: boolean;
  sortingEnabled: boolean;
  filterEnabled: boolean;
  exportEnabled: boolean;
  defaultExportFileName: string;
  defaultExportFormat: "csv" | "tsv";
  siteRules: SiteRule[];
};

export const DEFAULT_SETTINGS: Settings = {
  columnSelectionEnabled: true,
  sortingEnabled: true,
  filterEnabled: true,
  exportEnabled: true,
  defaultExportFileName: "table-data",
  defaultExportFormat: "csv",
  siteRules: [
    {
      pattern: "http://localhost*/*",
      columnSelectionEnabled: false,
      sortingEnabled: false,
      filterEnabled: false,
      exportEnabled: false,
    },
    {
      pattern: "http://127.0.0.1*/*",
      columnSelectionEnabled: false,
      sortingEnabled: false,
      filterEnabled: false,
      exportEnabled: false,
    },
    {
      pattern: "http://192.168.*/*",
      columnSelectionEnabled: false,
      sortingEnabled: false,
      filterEnabled: false,
      exportEnabled: false,
    },
  ],
};
