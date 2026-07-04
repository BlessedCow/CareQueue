import { cn } from '../utils/cn';

type DashboardCardKey =
  | 'kpis'
  | 'trends'
  | 'levelOfCare'
  | 'upcomingWorkflow'
  | 'recentAuthorizations';

type DashboardCardSettings = Record<DashboardCardKey, boolean>;

const DASHBOARD_CARD_LABELS: Record<DashboardCardKey, string> = {
  kpis: 'KPI Cards',
  trends: 'Authorization Trends',
  levelOfCare: 'Level of Care Breakdown',
  upcomingWorkflow: 'Upcoming Workflow',
  recentAuthorizations: 'Recent Authorizations',
};

interface RegisteredListCardProps {
  darkMode: boolean;
  title: string;
  description: string;
  placeholder: string;
  value: string;
  onValueChange: (value: string) => void;
  items: string[];
  onAdd: () => void;
  onRemove: (value: string) => void;
}

function RegisteredListCard({
  darkMode,
  title,
  description,
  placeholder,
  value,
  onValueChange,
  items,
  onAdd,
  onRemove,
}: RegisteredListCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border p-6',
        darkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white',
      )}
    >
      <h3 className={cn('mb-2 text-lg font-semibold', darkMode ? 'text-white' : 'text-gray-900')}>
        {title}
      </h3>
      <p className={cn('mb-4 text-sm', darkMode ? 'text-gray-400' : 'text-gray-600')}>
        {description}
      </p>

      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={placeholder}
          className={cn(
            'min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500',
            darkMode
              ? 'border-gray-700 bg-gray-900 text-gray-100 placeholder-gray-500'
              : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400',
          )}
        />
        <button
          type="button"
          onClick={onAdd}
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add
        </button>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item}
            className={cn(
              'flex items-center justify-between rounded-lg border px-3 py-2 text-sm',
              darkMode ? 'border-gray-800 bg-gray-950/60' : 'border-gray-200 bg-gray-50',
            )}
          >
            <span>{item}</span>
            <button
              type="button"
              onClick={() => onRemove(item)}
              className={darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

interface DashboardCardsSettingsCardProps {
  darkMode: boolean;
  dashboardCardSettings: DashboardCardSettings;
  onToggleDashboardCard: (cardKey: DashboardCardKey) => void;
  onResetDashboardCards: () => void;
}

function DashboardCardsSettingsCard({
  darkMode,
  dashboardCardSettings,
  onToggleDashboardCard,
  onResetDashboardCards,
}: DashboardCardsSettingsCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border p-5 shadow-sm',
        darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white',
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Dashboard Cards</h3>
          <p className={cn('mt-1 text-sm', darkMode ? 'text-gray-400' : 'text-gray-600')}>
            Choose which cards appear on the Dashboard.
          </p>
        </div>

        <button
          type="button"
          onClick={onResetDashboardCards}
          className={cn(
            'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
            darkMode
              ? 'border-gray-700 text-gray-200 hover:bg-gray-800'
              : 'border-gray-300 text-gray-700 hover:bg-gray-100',
          )}
        >
          Reset
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(Object.entries(DASHBOARD_CARD_LABELS) as [DashboardCardKey, string][]).map(
          ([cardKey, label]) => (
            <label
              key={cardKey}
              className={cn(
                'flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm',
                darkMode
                  ? 'border-gray-800 bg-gray-950 text-gray-200'
                  : 'border-gray-200 bg-gray-50 text-gray-700',
              )}
            >
              <span className="font-medium">{label}</span>
              <input
                type="checkbox"
                checked={dashboardCardSettings[cardKey]}
                onChange={() => onToggleDashboardCard(cardKey)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>
          ),
        )}
      </div>
    </div>
  );
}

interface SettingsPageProps {
  darkMode: boolean;

  newFacilityName: string;
  setNewFacilityName: (value: string) => void;
  registeredFacilities: string[];
  onAddFacility: () => void;
  onRemoveFacility: (value: string) => void;

  newInsuranceName: string;
  setNewInsuranceName: (value: string) => void;
  registeredInsurances: string[];
  onAddInsurance: () => void;
  onRemoveInsurance: (value: string) => void;

  newWebPortalName: string;
  setNewWebPortalName: (value: string) => void;
  registeredWebPortals: string[];
  onAddWebPortal: () => void;
  onRemoveWebPortal: (value: string) => void;

  dashboardCardSettings: DashboardCardSettings;
  onToggleDashboardCard: (cardKey: DashboardCardKey) => void;
  onResetDashboardCards: () => void;
}

export function SettingsPage({
  darkMode,
  newFacilityName,
  setNewFacilityName,
  registeredFacilities,
  onAddFacility,
  onRemoveFacility,
  newInsuranceName,
  setNewInsuranceName,
  registeredInsurances,
  onAddInsurance,
  onRemoveInsurance,
  newWebPortalName,
  setNewWebPortalName,
  registeredWebPortals,
  onAddWebPortal,
  onRemoveWebPortal,
  dashboardCardSettings,
  onToggleDashboardCard,
  onResetDashboardCards,
}: SettingsPageProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <RegisteredListCard
        darkMode={darkMode}
        title="Registered Facilities"
        description="Facilities available when creating authorization records."
        placeholder="Add facility"
        value={newFacilityName}
        onValueChange={setNewFacilityName}
        items={registeredFacilities}
        onAdd={onAddFacility}
        onRemove={onRemoveFacility}
      />

      <RegisteredListCard
        darkMode={darkMode}
        title="Registered Insurances"
        description="Insurance options available when creating authorization records."
        placeholder="Add insurance"
        value={newInsuranceName}
        onValueChange={setNewInsuranceName}
        items={registeredInsurances}
        onAdd={onAddInsurance}
        onRemove={onRemoveInsurance}
      />

      <div className="space-y-6">
        <RegisteredListCard
          darkMode={darkMode}
          title="Web Portals"
          description="Portal options available for web portal submissions."
          placeholder="Add portal"
          value={newWebPortalName}
          onValueChange={setNewWebPortalName}
          items={registeredWebPortals}
          onAdd={onAddWebPortal}
          onRemove={onRemoveWebPortal}
        />

        <DashboardCardsSettingsCard
          darkMode={darkMode}
          dashboardCardSettings={dashboardCardSettings}
          onToggleDashboardCard={onToggleDashboardCard}
          onResetDashboardCards={onResetDashboardCards}
        />
      </div>
    </div>
  );
}