import type { Settings } from "../settings";
import { logWarn } from "../utils/logger";
import { getSettings, isEnabled } from "../utils/storage";
import { TableManager } from "./table-manager";
import "./styles.css";

/**
 * ワイルドカードパターン（* のみ対応）で URL またはホスト名にマッチングする
 *
 * - `://` を含むパターンは `location.origin + location.pathname` と比較する
 *   - クエリパラメータやハッシュを除外して安定したURL比較を行うため
 * - それ以外のパターンは `location.hostname` と比較する
 */
function matchesPattern(pattern: string): boolean {
  const target = pattern.includes("://") ? location.origin + location.pathname : location.hostname;
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`, "i").test(target);
}

/**
 * サイト別設定ルールを考慮した実効設定を返す
 */
function getEffectiveSettings(settings: Settings): Settings {
  const rule = settings.siteRules?.find((r) => matchesPattern(r.pattern));
  if (!rule) return settings;
  return {
    ...settings,
    columnSelectionEnabled: rule.columnSelectionEnabled,
    sortingEnabled: rule.sortingEnabled,
    filterEnabled: rule.filterEnabled,
    exportEnabled: rule.exportEnabled,
  };
}

// 稼働中の TableManager インスタンスを保持するマップ
const tableManagers = new Map<HTMLTableElement, TableManager>();

let currentSettings: Settings | null = null;
let currentEnabled = false;
let isObserverActive = false;

// DOM監視用の MutationObserver
let observer: MutationObserver | null = null;

/**
   ページ全体のテーブルをスキャンし、必要に応じて TableManager を作成します。
 */
function scanAndInitTables(): void {
  // 切断されたテーブル（DOMから消えたテーブル）のマネージャを破棄
  for (const [table, manager] of tableManagers.entries()) {
    if (!table.isConnected) {
      manager.destroy();
      tableManagers.delete(table);
    }
  }

  if (!currentEnabled) {
    // 拡張機能全体が無効の場合は何もしない
    return;
  }

  // ページ上のすべてのテーブルを検出
  const tables = document.querySelectorAll("table");
  for (const table of Array.from(tables)) {
    // 初期化済みのテーブルはスキップ
    if (tableManagers.has(table) || table.dataset.toInitialized === "true") {
      // すでに他のインスタンスがあるか、またはマークが付いている場合
      // もしマップにないのにマークがある場合は、一旦マークを外して再初期化できるようにする
      if (!tableManagers.has(table)) {
        delete table.dataset.toInitialized;
      } else {
        continue;
      }
    }

    // テーブルとして妥当なサイズか簡易チェック（行・列が最低1つ以上あるもの）
    if (table.rows.length <= 1) {
      continue;
    }

    try {
      if (currentSettings) {
        const manager = new TableManager(
          table,
          getEffectiveSettings(currentSettings),
          currentEnabled,
        );
        tableManagers.set(table, manager);
      }
    } catch (err) {
      logWarn(`テーブル操作の適用に失敗しました: ${err}`, "content");
    }
  }
}

/**
 * 全てのテーブルマネージャをクリーンアップ
 */
function destroyAllManagers(): void {
  for (const manager of tableManagers.values()) {
    manager.destroy();
  }
  tableManagers.clear();
}

/**
 * 設定変更を同期し、リロードなしで動作に反映
 */
async function syncSettings(): Promise<void> {
  try {
    currentEnabled = await isEnabled();
    currentSettings = await getSettings();

    if (!currentEnabled) {
      // 拡張機能が無効化された場合は全て削除
      destroyAllManagers();
      stopObserver();
      return;
    }

    // すでに管理しているテーブルの設定を更新
    for (const manager of tableManagers.values()) {
      manager.applySettings(getEffectiveSettings(currentSettings), currentEnabled);
    }

    // 新規追加されたテーブルを検知するためスキャン
    scanAndInitTables();
    startObserver();
  } catch (err) {
    logWarn(`設定の同期に失敗しました: ${err}`, "content");
  }
}

/**
 * MutationObserver の開始
 */
function startObserver(): void {
  if (isObserverActive || !currentEnabled) return;

  observer = new MutationObserver(() => {
    scanAndInitTables();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  isObserverActive = true;
}

/**
 * MutationObserver の停止
 */
function stopObserver(): void {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  isObserverActive = false;
}

/**
 * メインの初期化関数
 */
async function initialize(): Promise<void> {
  // 初回設定同期
  await syncSettings();

  // ストレージ変更イベントの監視（リロードなし設定変更のトリガー）
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local") {
      // 設定または有効/無効フラグの変更時
      if (changes.settings || changes.enabled) {
        syncSettings();
      }
    }
  });

  // 初回スキャン実行
  if (currentEnabled) {
    scanAndInitTables();
  }
}

// ページのロード完了を待って初期化
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}
