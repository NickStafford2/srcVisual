import type { ReactNode } from "react";

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
