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
      className="sticky top-0 z-10 flex flex-wrap items-end gap-1 border-b border-white/10 bg-slate-950/85 px-3 pt-2 backdrop-blur"
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
            className={`${tab.className ?? ""} h-10 px-6 text-sm font-medium transition [clip-path:polygon(4px_0,calc(100%-4px)_0,100%_100%,0_100%)] ${
              isActive
                ? "bg-site-bg z-10 -mb-px text-cyan-100"
                : tab.disabled
                  ? "cursor-not-allowed bg-white/[0.03] text-slate-600 opacity-60"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-100"
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
