import { useEffect, useState } from "react";

export type DashboardCardKey =
  | "kpis"
  | "trends"
  | "levelOfCare"
  | "upcomingWorkflow"
  | "recentAuthorizations";

export type DashboardCardSettings = Record<DashboardCardKey, boolean>;

const DEFAULT_DASHBOARD_CARD_SETTINGS: DashboardCardSettings = {
  kpis: true,
  trends: true,
  levelOfCare: true,
  upcomingWorkflow: true,
  recentAuthorizations: true,
};

const DASHBOARD_CARD_SETTINGS_STORAGE_KEY = "carequeue.dashboardCardSettings";

function loadDashboardCardSettings(): DashboardCardSettings {
  try {
    const storedValue = window.localStorage.getItem(
      DASHBOARD_CARD_SETTINGS_STORAGE_KEY
    );

    if (!storedValue) {
      return DEFAULT_DASHBOARD_CARD_SETTINGS;
    }

    const parsedValue = JSON.parse(
      storedValue
    ) as Partial<DashboardCardSettings>;

    return {
      ...DEFAULT_DASHBOARD_CARD_SETTINGS,
      ...parsedValue,
    };
  } catch {
    return DEFAULT_DASHBOARD_CARD_SETTINGS;
  }
}

export function useDashboardCardSettings() {
  const [dashboardCardSettings, setDashboardCardSettings] =
    useState<DashboardCardSettings>(loadDashboardCardSettings);

  useEffect(() => {
    window.localStorage.setItem(
      DASHBOARD_CARD_SETTINGS_STORAGE_KEY,
      JSON.stringify(dashboardCardSettings)
    );
  }, [dashboardCardSettings]);

  const handleToggleDashboardCard = (cardKey: DashboardCardKey) => {
    setDashboardCardSettings((currentSettings) => ({
      ...currentSettings,
      [cardKey]: !currentSettings[cardKey],
    }));
  };

  const handleResetDashboardCards = () => {
    setDashboardCardSettings(DEFAULT_DASHBOARD_CARD_SETTINGS);
  };

  return {
    dashboardCardSettings,
    handleToggleDashboardCard,
    handleResetDashboardCards,
  };
}
