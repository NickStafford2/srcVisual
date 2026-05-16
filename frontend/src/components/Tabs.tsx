import type { ReactNode } from "react";

export type TabDefinition<TTabId extends string> = {
  id: TTabId;
  label: string;
  disabled?: boolean;
  className?: string;
};

type TabsProps<TTabId extends string> = {
  tabs: TabDefinition<TTabId>[];
  activeTabId: TTabId;
  ariaLabel: string;
  onTabChange: (tabId: TTabId) => void;
};

export function Tabs<TTabId extends string>({
  tabs,
  activeTabId,
  ariaLabel,
  onTabChange,
}: TabsProps<TTabId>) {
  return (
    <div
      aria-label={ariaLabel}
      className="sticky top-0 z-10 flex flex-wrap gap-2 rounded-[20px] border border-white/10 bg-slate-950/85 p-2 backdrop-blur"
      role="tablist"
    >
      {tabs.map((tab) => {
        const tabId = `${tab.id}-tab`;
        const panelId = `${tab.id}-panel`;
        const isActive = activeTabId === tab.id;

        return (
          <button
            key={tab.id}
            aria-controls={panelId}
            aria-selected={isActive}
            className={`${tab.className ?? ""} rounded-[14px] px-4 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-cyan-300 text-slate-950 shadow-[0_10px_30px_rgba(103,232,249,0.28)]"
                : tab.disabled
                  ? "cursor-not-allowed bg-white/5 text-slate-500 opacity-60"
                  : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-slate-100"
            }`}
            disabled={tab.disabled}
            id={tabId}
            onClick={() => {
              onTabChange(tab.id);
            }}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

type TabPanelProps<TTabId extends string> = {
  tabId: TTabId;
  activeTabId: TTabId;
  children: ReactNode;
};

export function TabPanel<TTabId extends string>({
  tabId,
  activeTabId,
  children,
}: TabPanelProps<TTabId>) {
  return (
    <div
      aria-labelledby={`${tabId}-tab`}
      hidden={activeTabId !== tabId}
      id={`${tabId}-panel`}
      role="tabpanel"
    >
      {children}
    </div>
  );
}
