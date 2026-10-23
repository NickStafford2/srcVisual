import type { ReactNode } from "react";

type TabPanelProps<TTabId extends string> = {
  tabId: TTabId;
  activeTabId: TTabId;
  children: ReactNode;
  className?: string;
};

export function TabPanel<TTabId extends string>({
  tabId,
  activeTabId,
  children,
  className,
}: TabPanelProps<TTabId>) {
  return (
    <div
      aria-labelledby={`${tabId}-tab`}
      hidden={activeTabId !== tabId}
      id={`${tabId}-panel`}
      role="tabpanel"
      className={className}
    >
      {children}
    </div>
  );
}
