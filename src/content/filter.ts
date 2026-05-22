export class TableFilter {
  private table: HTMLTableElement;
  private active = false;

  // 各列インデックスに対応する、表示対象とする値のセット（未設定時は制限なし）
  // キー: 列インデックス (cellIndex), 値: 選択された値の Set
  private activeFilters = new Map<number, Set<string>>();

  // アクティブなポップオーバーDOMと、トリガーとなったボタンの参照
  private currentPopover: HTMLDivElement | null = null;
  private activeFilterBtn: HTMLButtonElement | null = null;

  // バインド用リスナー
  private clickOutsideListener = this.handleClickOutside.bind(this);
  private escListener = this.handleEsc.bind(this);

  constructor(table: HTMLTableElement) {
    this.table = table;
  }

  public enable(): void {
    if (this.active) return;
    this.active = true;

    this.injectFilterButtons();
    document.addEventListener("click", this.clickOutsideListener);
    document.addEventListener("keydown", this.escListener);
  }

  public disable(): void {
    if (!this.active) return;
    this.active = false;

    document.removeEventListener("click", this.clickOutsideListener);
    document.removeEventListener("keydown", this.escListener);

    this.removePopover();
    this.removeFilterButtons();
    this.clearAllFilters();
  }

  /**
   * 各列ヘッダーにフィルターボタン（漏斗アイコン）を注入
   */
  private injectFilterButtons(): void {
    const ths = this.table.querySelectorAll("th");
    for (const th of Array.from(ths)) {
      const container = th.querySelector(".to-header-container");
      if (!container || container.querySelector(".to-filter-button")) continue;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "to-filter-button";
      btn.title = "フィルター";
      // 漏斗型SVGアイコン
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
        </svg>
      `;

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.togglePopover(btn, th.cellIndex);
      });

      container.appendChild(btn);
    }
  }

  /**
   * フィルターボタンの削除
   */
  private removeFilterButtons(): void {
    const buttons = this.table.querySelectorAll(".to-filter-button");
    for (const btn of Array.from(buttons)) {
      btn.remove();
    }
  }

  /**
   * ポップオーバーメニューの開閉トグル
   */
  private togglePopover(btn: HTMLButtonElement, colIndex: number): void {
    if (this.currentPopover) {
      const wasSame = this.activeFilterBtn === btn;
      this.removePopover();
      if (wasSame) return; // 同じボタンなら閉じて終了
    }

    this.activeFilterBtn = btn;
    btn.classList.add("to-filter-open");

    // ポップオーバーDOMの作成
    const popover = document.createElement("div");
    popover.className = "to-popover";

    // テキスト検索入力
    const labelSearch = document.createElement("label");
    labelSearch.textContent = "テキストフィルター";
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "検索...";

    // リスト領域
    const listContainer = document.createElement("ul");
    listContainer.className = "to-popover-list";

    // 該当列のユニーク値を取得
    const uniqueValues = this.getColumnUniqueValues(colIndex);
    const checkedValues = this.activeFilters.get(colIndex) || new Set(uniqueValues);

    // 「すべて選択」のチェックボックス
    const selectAllItem = document.createElement("li");
    selectAllItem.className = "to-popover-item";
    const selectAllCheckbox = document.createElement("input");
    selectAllCheckbox.type = "checkbox";
    // すべてチェックされているか確認
    selectAllCheckbox.checked = checkedValues.size === uniqueValues.length;
    const selectAllLabel = document.createElement("span");
    selectAllLabel.className = "to-popover-item-label";
    selectAllLabel.textContent = "（すべて選択）";
    selectAllItem.appendChild(selectAllCheckbox);
    selectAllItem.appendChild(selectAllLabel);
    listContainer.appendChild(selectAllItem);

    // 個別のチェックボックスリスト作成
    const itemElements: { value: string; li: HTMLLIElement; cb: HTMLInputElement }[] = [];
    for (const val of uniqueValues) {
      const li = document.createElement("li");
      li.className = "to-popover-item";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = val;
      cb.checked = checkedValues.has(val);
      const span = document.createElement("span");
      span.className = "to-popover-item-label";
      span.textContent = val === "" ? "（空白）" : val;

      li.appendChild(cb);
      li.appendChild(span);
      listContainer.appendChild(li);

      itemElements.push({ value: val, li, cb });

      // 行クリックでもチェックが動くように
      li.addEventListener("click", (e) => {
        if (e.target !== cb) {
          cb.checked = !cb.checked;
          cb.dispatchEvent(new Event("change"));
        }
      });

      cb.addEventListener("change", () => {
        const allChecked = itemElements.every((item) => item.cb.checked);
        selectAllCheckbox.checked = allChecked;
      });
    }

    // 「すべて選択」のトグルロジック
    selectAllItem.addEventListener("click", (e) => {
      if (e.target !== selectAllCheckbox) {
        selectAllCheckbox.checked = !selectAllCheckbox.checked;
      }
      const isChecked = selectAllCheckbox.checked;
      for (const item of itemElements) {
        if (item.li.style.display !== "none") {
          item.cb.checked = isChecked;
        }
      }
    });

    // 検索入力による絞り込み（チェックボックスのフィルタ）
    searchInput.addEventListener("input", () => {
      const q = searchInput.value.toLowerCase();
      for (const item of itemElements) {
        const displayVal = item.value === "" ? "（空白）" : item.value;
        const matches = displayVal.toLowerCase().includes(q);
        item.li.style.display = matches ? "flex" : "none";
      }
    });

    // フッターボタン
    const footer = document.createElement("div");
    footer.className = "to-popover-footer";

    const btnClear = document.createElement("button");
    btnClear.type = "button";
    btnClear.className = "to-btn";
    btnClear.textContent = "クリア";
    btnClear.addEventListener("click", () => {
      this.clearFilterForColumn(colIndex);
      this.removePopover();
    });

    const btnApply = document.createElement("button");
    btnApply.type = "button";
    btnApply.className = "to-btn to-btn-primary";
    btnApply.textContent = "適用";
    btnApply.addEventListener("click", () => {
      // 選択されているチェックボックスの値を収集
      const selected = new Set<string>();
      let anyUnchecked = false;

      for (const item of itemElements) {
        if (item.cb.checked) {
          selected.add(item.value);
        } else {
          anyUnchecked = true;
        }
      }

      if (!anyUnchecked) {
        // すべて選択されている場合はフィルターを設定しない（全表示と同義）
        this.activeFilters.delete(colIndex);
        btn.classList.remove("to-filter-active");
      } else {
        this.activeFilters.set(colIndex, selected);
        btn.classList.add("to-filter-active");
      }

      this.applyFiltersToTable();
      this.removePopover();
    });

    footer.appendChild(btnClear);
    footer.appendChild(btnApply);

    popover.appendChild(labelSearch);
    popover.appendChild(searchInput);
    popover.appendChild(listContainer);
    popover.appendChild(footer);

    document.body.appendChild(popover);
    this.currentPopover = popover;

    // ポップオーバーの表示位置調整
    const rect = btn.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    // ボタンの直下に表示し、画面外にはみ出ないよう調整
    const top = rect.bottom + scrollY + 4;
    let left = rect.left + scrollX - 80;

    // 画面の右端はみ出し防止
    const popoverWidth = 200; // 最低幅の目安
    if (left + popoverWidth > window.innerWidth + scrollX) {
      left = window.innerWidth + scrollX - popoverWidth - 10;
    }
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
    if (this.activeFilterBtn) {
      this.activeFilterBtn.classList.remove("to-filter-open");
      this.activeFilterBtn = null;
    }
  }

  /**
   * 指定列に存在するユニークなテキストリストを取得（ソートして返す）
   */
  private getColumnUniqueValues(colIndex: number): string[] {
    const values = new Set<string>();
    const tbody = this.table.querySelector("tbody") || this.table;
    const rows = Array.from(tbody.querySelectorAll("tr")).filter((row) => {
      return !row.querySelector("th");
    });

    for (const row of rows) {
      const cell = row.cells[colIndex];
      const txt = cell ? cell.innerText.trim() : "";
      values.add(txt);
    }

    return Array.from(values).sort((a, b) => a.localeCompare(b, "ja"));
  }

  /**
   * 全フィルターのテーブル行への適用
   */
  private applyFiltersToTable(): void {
    const tbody = this.table.querySelector("tbody") || this.table;
    const rows = Array.from(tbody.querySelectorAll("tr")).filter((row) => {
      return !row.querySelector("th");
    });

    for (const row of rows) {
      let isVisible = true;

      // すべての有効なフィルター条件に合致するか検査
      for (const [colIndex, allowedValues] of this.activeFilters.entries()) {
        const cell = row.cells[colIndex];
        const val = cell ? cell.innerText.trim() : "";
        if (!allowedValues.has(val)) {
          isVisible = false;
          break;
        }
      }

      if (isVisible) {
        row.classList.remove("to-row-filtered");
      } else {
        row.classList.add("to-row-filtered");
      }
    }
  }

  /**
   * 指定列のフィルターをクリア
   */
  private clearFilterForColumn(colIndex: number): void {
    this.activeFilters.delete(colIndex);

    // ボタンのハイライトを除去
    const ths = this.table.querySelectorAll("th");
    const th = ths[colIndex];
    if (th) {
      const btn = th.querySelector(".to-filter-button");
      btn?.classList.remove("to-filter-active");
    }

    this.applyFiltersToTable();
  }

  /**
   * 全フィルターを解除
   */
  private clearAllFilters(): void {
    this.activeFilters.clear();

    const buttons = this.table.querySelectorAll(".to-filter-button");
    for (const btn of Array.from(buttons)) {
      btn.classList.remove("to-filter-active");
    }

    const tbody = this.table.querySelector("tbody") || this.table;
    const rows = tbody.querySelectorAll("tr");
    for (const row of Array.from(rows)) {
      row.classList.remove("to-row-filtered");
    }
  }

  /**
   * ポップオーバー外クリックでポップオーバーを閉じる
   */
  private handleClickOutside(event: MouseEvent): void {
    if (!this.currentPopover) return;

    const target = event.target as HTMLElement;
    if (!this.currentPopover.contains(target) && !this.activeFilterBtn?.contains(target)) {
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
