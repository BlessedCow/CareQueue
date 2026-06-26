import { useEffect, useMemo, useState } from 'react';
import { AuthRequest, Facility } from './data/mockData';
import { deleteAuthRequest, fetchAuthRequests } from './api/authStatus';
import { subDays } from 'date-fns';
import {
  Activity,
  Bell,
  FileText,
  LayoutDashboard,
  LogOut,
  Moon,
  Settings,
  Sun,
} from 'lucide-react';
import { cn } from './utils/cn';

import KPICards from './components/KPICards';
import { TrendChart, DenialChart, LOCChart } from './components/Charts';
import { DataTable } from './components/DataTable';
import Filters from './components/Filters';

type AppPage = 'dashboard' | 'authorizations' | 'settings';

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [activePage, setActivePage] = useState<AppPage>('dashboard');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [selectedFacility, setSelectedFacility] = useState<string>('All');
  const [authRequests, setAuthRequests] = useState<AuthRequest[]>([]);
  const [isLoadingAuths, setIsLoadingAuths] = useState(true);
  const [authsError, setAuthsError] = useState<string | null>(null);
  const [deletingAuthId, setDeletingAuthId] = useState<string | null>(null);
  const navigationItems: {
    page: AppPage;
    label: string;
    icon: typeof LayoutDashboard;
  }[] = [
    {
      page: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      page: 'authorizations',
      label: 'Authorizations',
      icon: FileText,
    },
    {
      page: 'settings',
      label: 'Settings',
      icon: Settings,
    },
  ];
  useEffect(() => {
    let isMounted = true;

    async function loadAuthRequests() {
      try {
        setIsLoadingAuths(true);
        setAuthsError(null);

        const records = await fetchAuthRequests();

        if (isMounted) {
          setAuthRequests(records);
        }
      } catch (error) {
        if (isMounted) {
          setAuthsError(error instanceof Error ? error.message : 'Unable to load authorization records.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingAuths(false);
        }
      }
    }

    void loadAuthRequests();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDeleteAuth = async (auth: AuthRequest) => {
    const confirmed = window.confirm(
      `Delete authorization record for ${auth.clientName}? This cannot be undone.`,
    );
  
    if (!confirmed) {
      return;
    }
  
    setDeletingAuthId(auth.id);
    setAuthsError(null);
  
    try {
      await deleteAuthRequest(auth.id);
      setAuthRequests((currentAuths) => currentAuths.filter((item) => item.id !== auth.id));
    } catch (error) {
      setAuthsError(error instanceof Error ? error.message : 'Failed to delete authorization record.');
    } finally {
      setDeletingAuthId(null);
    }
  };

  const filteredData = useMemo(() => {
    const today = new Date();
    let daysToSubtract = 30;
    if (dateRange === '7d') daysToSubtract = 7;
    if (dateRange === '90d') daysToSubtract = 90;

    const startDate = subDays(today, daysToSubtract);

    return authRequests.filter((item) => {
      const inDateRange = item.date >= startDate && item.date <= today;
      const matchFacility = selectedFacility === 'All' || item.facility === selectedFacility;
      return inDateRange && matchFacility;
    });
  }, [authRequests, dateRange, selectedFacility]);

  const recentAuthorizations = useMemo(() => {
    return filteredData.slice(0, 5);
  }, [filteredData]);

  const facilityOptions = useMemo(() => {
    const uniqueFacilities = Array.from(
      new Set(authRequests.map((item) => item.facility).filter(Boolean)),
    ).sort();

    return ['All', ...uniqueFacilities];
  }, [authRequests]);

  useEffect(() => {
    if (!facilityOptions.includes(selectedFacility)) {
      setSelectedFacility('All');
    }
  }, [facilityOptions, selectedFacility]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const pageTitle = {
    dashboard: 'Dashboard',
    authorizations: 'Authorizations',
    settings: 'Settings',
  }[activePage];

  const pageDescription = {
    dashboard: 'Authorization performance and workload overview',
    authorizations: 'View and manage authorization records',
    settings: 'Configure CareQueue preferences',
  }[activePage];

  return (
    <div className={`min-h-screen flex font-sans ${darkMode ? 'dark bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      {/* Sidebar */}
      <aside className={`w-64 border-r hidden md:flex flex-col ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}>
        <div className="h-16 flex items-center px-6 border-b border-inherit">
          <Activity className="w-6 h-6 text-blue-500 mr-2" />
          <span className="font-bold text-lg tracking-wide">UR Analytics</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.page;

            return (
              <button
                key={item.page}
                type="button"
                onClick={() => setActivePage(item.page)}
                className={cn(
                  'w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors',
                  isActive
                    ? darkMode
                      ? 'bg-blue-900/20 text-blue-400'
                      : 'bg-blue-50 text-blue-600'
                    : darkMode
                      ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-200'
                      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900',
                )}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-inherit">
          <a href="#" className={`flex items-center px-3 py-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'}`}>
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className={`h-16 flex items-center justify-between px-6 border-b shrink-0 ${darkMode ? 'bg-gray-950 border-gray-800' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center md:hidden">
            <Activity className="w-6 h-6 text-blue-500 mr-2" />
            <span className="font-bold text-lg tracking-wide">UR Analytics</span>
          </div>
          <div className="hidden md:block">
            <h1 className="text-xl font-semibold">{pageTitle}</h1>
            <p className={cn('text-sm', darkMode ? 'text-gray-400' : 'text-gray-600')}>
              {pageDescription}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'}`}>
              <Bell className="w-5 h-5" />
            </button>
            <button 
              onClick={toggleDarkMode}
              className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'}`}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
              JS
            </div>
          </div>
        </header>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {activePage === 'dashboard' && (
              <>
                {isLoadingAuths && (
              <div className={`rounded-xl border p-4 text-sm ${darkMode ? 'bg-gray-900 border-gray-800 text-gray-300' : 'bg-white border-gray-200 text-gray-700'}`}>
                Loading authorization records from AuthStatus...
              </div>
            )}

            {authsError && (
              <div className={`rounded-xl border p-4 text-sm ${darkMode ? 'bg-rose-950/40 border-rose-900 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                Unable to load AuthStatus backend data: {authsError}
              </div>
            )}

            <Filters
              dateRange={dateRange}
              setDateRange={setDateRange}
              selectedFacility={selectedFacility}
              setSelectedFacility={setSelectedFacility}
              facilities={facilityOptions}
              darkMode={darkMode}
            />
            
            <KPICards data={filteredData} darkMode={darkMode} />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className={`lg:col-span-2 rounded-xl border p-5 shadow-sm ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                <h3 className="text-lg font-semibold mb-4">Authorization Trends</h3>
                <TrendChart data={filteredData} darkMode={darkMode} />
              </div>
              <div className={`rounded-xl border p-5 shadow-sm ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                <h3 className="text-lg font-semibold mb-4">Level of Care Breakdown</h3>
                <LOCChart data={filteredData} darkMode={darkMode} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={`rounded-xl border p-5 shadow-sm ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                <h3 className="text-lg font-semibold mb-4">Denial Reasons</h3>
                <DenialChart data={filteredData} darkMode={darkMode} />
              </div>
              <div className={`rounded-xl border p-5 shadow-sm overflow-hidden flex flex-col ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                <h3 className="text-lg font-semibold mb-4 shrink-0">Recent Authorizations</h3>
                <DataTable
                  data={recentAuthorizations}
                  darkMode={darkMode}
                  onDelete={handleDeleteAuth}
                  deletingId={deletingAuthId}
/>
              </div>
            </div>
              </>
            )}

            {activePage === 'authorizations' && (
              <>
                {isLoadingAuths && (
                  <div className={cn('rounded-lg border px-4 py-3 text-sm', darkMode ? 'border-blue-900/60 bg-blue-950/30 text-blue-200' : 'border-blue-200 bg-blue-50 text-blue-700')}>
                    Loading authorization records...
                  </div>
                )}

                {authsError && (
                  <div className={cn('rounded-lg border px-4 py-3 text-sm', darkMode ? 'border-red-900/60 bg-red-950/30 text-red-200' : 'border-red-200 bg-red-50 text-red-700')}>
                    {authsError}
                  </div>
                )}

                <Filters
                  dateRange={dateRange}
                  setDateRange={setDateRange}
                  selectedFacility={selectedFacility}
                  setSelectedFacility={setSelectedFacility}
                  facilities={facilityOptions}
                  darkMode={darkMode}
                />

                <div className={`rounded-xl border p-5 shadow-sm overflow-hidden flex flex-col ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-4 shrink-0">
                    <div>
                      <h3 className="text-lg font-semibold">Authorization Work Queue</h3>
                      <p className={cn('text-sm mt-1', darkMode ? 'text-gray-400' : 'text-gray-600')}>
                        View authorization records by facility and date range.
                      </p>
                    </div>
                  </div>

                  <DataTable
                    data={filteredData}
                    darkMode={darkMode}
                    onDelete={handleDeleteAuth}
                    deletingId={deletingAuthId}
                  />
                </div>
              </>
            )}

            {activePage === 'settings' && (
              <div className={cn('rounded-xl border p-6', darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200')}>
                <h3 className={cn('text-lg font-semibold mb-2', darkMode ? 'text-white' : 'text-gray-900')}>
                  Settings
                </h3>
                <p className={cn('text-sm', darkMode ? 'text-gray-400' : 'text-gray-600')}>
                  Settings for API connection, display preferences, and local workflow options will live here.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
