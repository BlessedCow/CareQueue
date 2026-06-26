import { useEffect, useMemo, useState } from 'react';
import { AuthRequest, Facility } from './data/mockData';
import { fetchAuthRequests } from './api/authStatus';
import { subDays } from 'date-fns';
import { Activity, Moon, Sun, LayoutDashboard, FileText, Settings, LogOut, Bell } from 'lucide-react';

import KPICards from './components/KPICards';
import { TrendChart, DenialChart, LOCChart } from './components/Charts';
import DataTable from './components/DataTable';
import Filters from './components/Filters';

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [selectedFacility, setSelectedFacility] = useState<string>('All');
  const [authRequests, setAuthRequests] = useState<AuthRequest[]>([]);
  const [isLoadingAuths, setIsLoadingAuths] = useState(true);
  const [authsError, setAuthsError] = useState<string | null>(null);
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

  return (
    <div className={`min-h-screen flex font-sans ${darkMode ? 'dark bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      {/* Sidebar */}
      <aside className={`w-64 border-r hidden md:flex flex-col ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}>
        <div className="h-16 flex items-center px-6 border-b border-inherit">
          <Activity className="w-6 h-6 text-blue-500 mr-2" />
          <span className="font-bold text-lg tracking-wide">UR Analytics</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <a href="#" className={`flex items-center px-3 py-2 rounded-lg ${darkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
            <LayoutDashboard className="w-5 h-5 mr-3" />
            Dashboard
          </a>
          <a href="#" className={`flex items-center px-3 py-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'}`}>
            <FileText className="w-5 h-5 mr-3" />
            Authorizations
          </a>
          <a href="#" className={`flex items-center px-3 py-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'}`}>
            <Settings className="w-5 h-5 mr-3" />
            Settings
          </a>
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
            <h1 className="text-xl font-semibold">Overview Dashboard</h1>
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
                <DataTable data={filteredData} darkMode={darkMode} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
