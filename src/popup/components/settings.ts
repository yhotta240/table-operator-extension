import type { Settings, SiteRule } from "../../settings";

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

  setupSiteRules(settings, onUpdate);
}

function matchesPatternForUrl(pattern: string, url: string): boolean {
  let target: string;
  try {
    const u = new URL(url);
    target = pattern.includes("://") ? u.origin + u.pathname : u.hostname;
  } catch {
    target = url;
  }
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`, "i").test(target);
}

function validateSiteRulePattern(pattern: string): string | null {
  if (/\s/.test(pattern)) return "スペースは使用できません";
  if (!/^https?:\/\/.+/.test(pattern)) {
    return "http:// または https:// から始めてください";
  }
  return null;
}

function setupSiteRules(
  settings: Settings,
  onUpdate: (
    patch: Partial<Settings>,
    successMessage: string,
    failedMessage: string,
  ) => Promise<void>,
): void {
  const input = document.getElementById("site-rule-input") as HTMLInputElement | null;
  const clearBtn = document.getElementById("site-rule-clear") as HTMLButtonElement | null;
  const addBtn = document.getElementById("site-rule-add") as HTMLButtonElement | null;
  const list = document.getElementById("site-rule-list") as HTMLUListElement | null;
  const errorDiv = document.getElementById("site-rule-error") as HTMLDivElement | null;

  if (!input || !clearBtn || !addBtn || !list) return;

  function showError(message: string): void {
    if (!errorDiv) return;
    errorDiv.textContent = message;
    errorDiv.style.display = "";
  }

  function clearError(): void {
    if (!errorDiv) return;
    errorDiv.textContent = "";
    errorDiv.style.display = "none";
  }

  const siteRules: SiteRule[] = [...(settings.siteRules ?? [])];
  let currentTabUrl: string | null = null;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    currentTabUrl = tabs[0]?.url ?? null;
    if (currentTabUrl) renderList();
  });

  const featureKeys: { key: keyof SiteRule; label: string }[] = [
    { key: "columnSelectionEnabled", label: "列選択" },
    { key: "sortingEnabled", label: "並び替え" },
    { key: "filterEnabled", label: "フィルター" },
    { key: "exportEnabled", label: "エクスポート" },
  ];

  function renderList(): void {
    if (!list) return;
    list.innerHTML = "";
    const sorted = siteRules
      .map((rule, i) => ({ rule, originalIndex: i }))
      .sort((a, b) => {
        const aActive =
          currentTabUrl !== null && matchesPatternForUrl(a.rule.pattern, currentTabUrl);
        const bActive =
          currentTabUrl !== null && matchesPatternForUrl(b.rule.pattern, currentTabUrl);
        return (bActive ? 1 : 0) - (aActive ? 1 : 0);
      });

    for (const { rule, originalIndex } of sorted) {
      const isActive = currentTabUrl !== null && matchesPatternForUrl(rule.pattern, currentTabUrl);

      const li = document.createElement("li");
      li.className = `list-group-item px-3 py-2${isActive ? " list-group-item-primary" : ""}`;

      const header = document.createElement("div");
      header.className = "d-flex justify-content-between align-items-center mb-1";

      const patternSpan = document.createElement("span");
      patternSpan.className = "small fw-semibold text-truncate me-2";
      patternSpan.textContent = rule.pattern;

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn btn-sm text-muted p-0 site-rule-delete lh-1";
      deleteBtn.dataset.index = String(originalIndex);
      deleteBtn.setAttribute("aria-label", "削除");
      deleteBtn.textContent = "×";

      header.appendChild(patternSpan);
      if (isActive) {
        const badge = document.createElement("span");
        badge.className = "badge text-bg-primary fw-normal ms-2 flex-shrink-0";
        badge.textContent = "適用中";
        header.appendChild(badge);
      }
      header.appendChild(deleteBtn);

      const checks = document.createElement("div");
      checks.className = "d-flex gap-3 flex-wrap";

      for (const { key, label } of featureKeys) {
        const div = document.createElement("div");
        div.className = "form-check mb-0";

        const cb = document.createElement("input");
        cb.className = "form-check-input site-rule-cb";
        cb.type = "checkbox";
        cb.id = `sr-${key}-${originalIndex}`;
        cb.dataset.index = String(originalIndex);
        cb.dataset.key = key;
        cb.checked = rule[key] as boolean;

        const lbl = document.createElement("label");
        lbl.className = "form-check-label small";
        lbl.htmlFor = cb.id;
        lbl.textContent = label;

        div.appendChild(cb);
        div.appendChild(lbl);
        checks.appendChild(div);
      }

      li.appendChild(header);
      li.appendChild(checks);
      list.appendChild(li);
    }
  }

  renderList();

  input.addEventListener("input", () => {
    if (clearBtn) clearBtn.style.display = input.value ? "" : "none";
    clearError();
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    clearBtn.style.display = "none";
    clearError();
    input.focus();
  });

  function addRule(): void {
    const pattern = input?.value.trim();
    if (!pattern) return;
    const validationError = validateSiteRulePattern(pattern);
    if (validationError) {
      showError(validationError);
      input?.focus();
      return;
    }
    if (siteRules.some((r) => r.pattern === pattern)) {
      showError("同じパターンがすでに登録されています");
      input?.focus();
      return;
    }
    clearError();
    siteRules.push({
      pattern,
      columnSelectionEnabled: false,
      sortingEnabled: false,
      filterEnabled: false,
      exportEnabled: false,
    });
    if (input) input.value = "";
    if (clearBtn) clearBtn.style.display = "none";
    renderList();
    onUpdate(
      { siteRules: [...siteRules] },
      `サイト「${pattern}」を追加しました`,
      "サイトの追加に失敗しました",
    );
  }

  addBtn.addEventListener("click", addRule);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addRule();
  });

  list.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest(".site-rule-delete") as HTMLElement | null;
    if (!btn) return;
    const index = Number(btn.dataset.index);
    const removed = siteRules[index];
    siteRules.splice(index, 1);
    renderList();
    onUpdate(
      { siteRules: [...siteRules] },
      `サイト「${removed.pattern}」を削除しました`,
      "サイトの削除に失敗しました",
    );
  });

  list.addEventListener("change", (e) => {
    const cb = (e.target as HTMLElement).closest(".site-rule-cb") as HTMLInputElement | null;
    if (!cb) return;
    const index = Number(cb.dataset.index);
    const key = cb.dataset.key as keyof SiteRule;
    (siteRules[index] as Record<string, unknown>)[key] = cb.checked;
    const labelMap: Partial<Record<keyof SiteRule, string>> = {
      columnSelectionEnabled: "列選択",
      sortingEnabled: "並び替え",
      filterEnabled: "フィルター",
      exportEnabled: "エクスポート",
    };
    onUpdate(
      { siteRules: [...siteRules] },
      `${siteRules[index].pattern} の${labelMap[key]}を${cb.checked ? "有効" : "無効"}にしました`,
      "サイト設定の保存に失敗しました",
    );
  });
}
