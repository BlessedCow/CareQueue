import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { subDays } from 'date-fns';
import { AuthRequest } from './data/mockData';
import {
  createAuthRequest,
  deleteAuthRequest,
  fetchAuthRequests,
  updateAuthRequest,
} from './api/authStatus';
import { AddAuthorizationForm } from './components/AddAuthorizationForm';
import { AuthorizationReadOnlyView } from './components/AuthorizationReadOnlyView';
import {
  DEFAULT_FACILITIES,
  DEFAULT_INSURANCES,
  DEFAULT_WEB_PORTALS,
} from './data/defaultSettings';
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
import {
  createAuthEvent,
  deleteAuthEvent,
  fetchAuthEvents,
  updateAuthEvent,
  type AuthEvent,
  type UpdateAuthEventPayload,
} from './api/authEvents';
import {
  AuthTimelineSection,
  type TimelineEventFormState,
} from './components/AuthTimelineSection';

type AppPage = 'dashboard' | 'authorizations' | 'settings';

const SETTINGS_STORAGE_KEYS = {
  facilities: 'carequeue.registeredFacilities',
  insurances: 'carequeue.registeredInsurances',
  webPortals: 'carequeue.registeredWebPortals',
};

const loadStoredList = (key: string, fallback: string[]) => {
  try {
    const storedValue = window.localStorage.getItem(key);

    if (!storedValue) {
      return fallback;
    }

    const parsedValue = JSON.parse(storedValue);

    if (!Array.isArray(parsedValue)) {
      return fallback;
    }

    return parsedValue.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  } catch {
    return fallback;
  }
};

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [activePage, setActivePage] = useState<AppPage>('dashboard');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [selectedFacility, setSelectedFacility] = useState<string>('All');
  const [selectedInsurance, setSelectedInsurance] = useState<string>('All');
  const [authRequests, setAuthRequests] = useState<AuthRequest[]>([]);
  const [isLoadingAuths, setIsLoadingAuths] = useState(true);
  const [authsError, setAuthsError] = useState<string | null>(null);
  const [deletingAuthId, setDeletingAuthId] = useState<string | null>(null);
  const [showAddAuthForm, setShowAddAuthForm] = useState(false);
  const [isCreatingAuth, setIsCreatingAuth] = useState(false);
  const [registeredFacilities, setRegisteredFacilities] = useState(() =>
    loadStoredList(SETTINGS_STORAGE_KEYS.facilities, DEFAULT_FACILITIES),
  );
  const [registeredInsurances, setRegisteredInsurances] = useState(() =>
    loadStoredList(SETTINGS_STORAGE_KEYS.insurances, DEFAULT_INSURANCES),
  );
  const [registeredWebPortals, setRegisteredWebPortals] = useState(() =>
    loadStoredList(SETTINGS_STORAGE_KEYS.webPortals, DEFAULT_WEB_PORTALS),
  );
  const [authEvents, setAuthEvents] = useState<AuthEvent[]>([]);
  const [isLoadingAuthEvents, setIsLoadingAuthEvents] = useState(false);
  const [isSavingAuthEvent, setIsSavingAuthEvent] = useState(false);
  const [authEventsError, setAuthEventsError] = useState<string | null>(null);
  const [editingAuthEventId, setEditingAuthEventId] = useState<number | null>(null);
  const [confirmingDeleteAuthEventId, setConfirmingDeleteAuthEventId] = useState<number | null>(null);
  const [timelineEventForm, setTimelineEventForm] = useState<TimelineEventFormState>({
    eventDate: '',
    eventTime: '',
    eventType: 'Request Submitted',
    outcome: '',
    notes: '',
  });
  
  useEffect(() => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEYS.facilities, JSON.stringify(registeredFacilities));
  }, [registeredFacilities]);
  
  useEffect(() => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEYS.insurances, JSON.stringify(registeredInsurances));
  }, [registeredInsurances]);
  
  useEffect(() => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEYS.webPortals, JSON.stringify(registeredWebPortals));
  }, [registeredWebPortals]);
  
  const [newFacilityName, setNewFacilityName] = useState('');
  const [newInsuranceName, setNewInsuranceName] = useState('');
  const [newWebPortalName, setNewWebPortalName] = useState('');
  const [editingAuthId, setEditingAuthId] = useState<string | null>(null);
  const [viewingAuth, setViewingAuth] = useState<AuthRequest | null>(null);
  const [newAuthForm, setNewAuthForm] = useState({
    clientName: '',
    facility: registeredFacilities[0] ?? '',
    loc: 'RTC',
    status: 'Pending',
    requestedDays: '',
    approvedDays: '',
    insurance: registeredInsurances[0] ?? '',
    authType: 'Initial',
    submissionMethod: 'Web Portal',
    phoneNumber: '',
    phoneExtension: '',
    faxNumber: '',
    webPortal: registeredWebPortals[0] ?? '',
    webPortalUrl: '',
    hasCareManager: false,
    careManagerName: '',
    careManagerContactType: 'Phone',
    careManagerPhone: '',
    careManagerFax: '',
    careManagerNotes: '',
  });
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
      `Delete authorization record for ${auth.patientId}? This cannot be undone.`,
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

  const handleNewAuthFieldChange = (field: keyof typeof newAuthForm, value: string | boolean) => {
    setNewAuthForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };
  
  const resetNewAuthForm = () => {
    setNewAuthForm({
      clientName: '',
      facility: registeredFacilities[0] ?? '',
      loc: 'RTC',
      status: 'Pending',
      requestedDays: '',
      approvedDays: '',
      insurance: registeredInsurances[0] ?? '',
      authType: 'Initial',
      submissionMethod: 'Web Portal',
      phoneNumber: '',
      phoneExtension: '',
      faxNumber: '',
      webPortal: registeredWebPortals[0] ?? '',
      webPortalUrl: '',
      hasCareManager: false,
      careManagerName: '',
      careManagerContactType: 'Phone',
      careManagerPhone: '',
      careManagerFax: '',
      careManagerNotes: '',
    });
  };

  const loadAuthIntoForm = (auth: AuthRequest) => {
    setNewAuthForm({
      clientName: auth.patientId,
      facility: auth.facility,
      loc: auth.loc || 'RTC',
      status: auth.status || 'Pending',
      requestedDays: String(auth.requestedDays ?? ''),
      approvedDays: String(auth.approvedDays ?? ''),
      insurance: auth.payer,
      authType: 'Initial',
      submissionMethod: 'Web Portal',
      phoneNumber: '',
      phoneExtension: '',
      faxNumber: '',
      webPortal: registeredWebPortals[0] ?? '',
      webPortalUrl: '',
      hasCareManager: false,
      careManagerName: '',
      careManagerContactType: 'Phone',
      careManagerPhone: '',
      careManagerFax: '',
      careManagerNotes: '',
    });
  };

  const resetTimelineEventForm = () => {
    setTimelineEventForm({
      eventDate: '',
      eventTime: '',
      eventType: 'Request Submitted',
      outcome: '',
      notes: '',
    });
    setEditingAuthEventId(null);
    setConfirmingDeleteAuthEventId(null);
  };
  
  const loadAuthEvents = async (authId: string) => {
    setIsLoadingAuthEvents(true);
    setAuthEventsError(null);
  
    try {
      const events = await fetchAuthEvents(authId);
      setAuthEvents(events);
    } catch (error) {
      setAuthEventsError(error instanceof Error ? error.message : 'Failed to load authorization timeline.');
      setAuthEvents([]);
    } finally {
      setIsLoadingAuthEvents(false);
    }
  };
  
  const handleTimelineEventFieldChange = (
    field: keyof TimelineEventFormState,
    value: string,
  ) => {
    setTimelineEventForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };
  
  const handleAddTimelineEvent = async () => {
    if (!editingAuthId || !timelineEventForm.eventDate.trim()) {
      return;
    }
  
    setIsSavingAuthEvent(true);
    setAuthEventsError(null);
  
    try {
      const createdEvent = await createAuthEvent(editingAuthId, {
        event_type: timelineEventForm.eventType,
        event_date: timelineEventForm.eventDate,
        event_time: timelineEventForm.eventTime,
        outcome: timelineEventForm.outcome,
        notes: timelineEventForm.notes.trim(),
      });
  
      setAuthEvents((currentEvents) => [...currentEvents, createdEvent]);
      resetTimelineEventForm();

      const refreshedAuths = await fetchAuthRequests();
      setAuthRequests(refreshedAuths);
    } catch (error) {
      setAuthEventsError(error instanceof Error ? error.message : 'Failed to save authorization timeline event.');
    } finally {
      setIsSavingAuthEvent(false);
    }
  };
  
  const handleStartEditTimelineEvent = (event: AuthEvent) => {
    setEditingAuthEventId(event.id);
    setTimelineEventForm({
      eventDate: event.eventDate,
      eventTime: event.eventTime,
      eventType: event.eventType,
      outcome: event.outcome,
      notes: event.notes,
    });
    setAuthEventsError(null);
  };
  
  const handleCancelEditTimelineEvent = () => {
    resetTimelineEventForm();
  };
  
  const handleUpdateTimelineEvent = async (
    eventId: number,
    payload: UpdateAuthEventPayload,
  ) => {
    if (!editingAuthId) {
      return;
    }
  
    setIsSavingAuthEvent(true);
    setAuthEventsError(null);
  
    try {
      const updatedEvent = await updateAuthEvent(editingAuthId, eventId, payload);
  
      setAuthEvents((currentEvents) =>
        currentEvents.map((event) => (event.id === eventId ? updatedEvent : event)),
      );
      resetTimelineEventForm();
  
      const refreshedAuths = await fetchAuthRequests();
      setAuthRequests(refreshedAuths);
      
    } catch (error) {
      setAuthEventsError(error instanceof Error ? error.message : 'Failed to update authorization timeline event.');
    } finally {
      setIsSavingAuthEvent(false);
    }
  };

  const handleStartDeleteTimelineEvent = (eventId: number) => {
    setConfirmingDeleteAuthEventId(eventId);
  };
  
  const handleCancelDeleteTimelineEvent = () => {
    setConfirmingDeleteAuthEventId(null);
  };

  const handleConfirmDeleteTimelineEvent = async (eventId: number) => {
    if (!editingAuthId) {
      return;
    }
  
    setAuthEventsError(null);
  
    try {
      await deleteAuthEvent(editingAuthId, eventId);
      setAuthEvents((currentEvents) => currentEvents.filter((event) => event.id !== eventId));

      const refreshedAuths = await fetchAuthRequests();
      setAuthRequests(refreshedAuths);
      setConfirmingDeleteAuthEventId(null);

    } catch (error) {
      setAuthEventsError(error instanceof Error ? error.message : 'Failed to delete authorization timeline event.');
    }
  };

  const handleStartViewAuth = (auth: AuthRequest) => {
    setViewingAuth(auth);
    setShowAddAuthForm(false);
    setEditingAuthId(null);
    resetTimelineEventForm();
    setAuthsError(null);
    void loadAuthEvents(auth.id);
  };
  
  const handleCloseViewAuth = () => {
    setViewingAuth(null);
    setAuthEvents([]);
    setAuthEventsError(null);
  };

  const handleStartEditAuth = (auth: AuthRequest) => {
    setViewingAuth(null);
    loadAuthIntoForm(auth);
    setEditingAuthId(auth.id);
    setShowAddAuthForm(true);
    setAuthsError(null);
    resetTimelineEventForm();
    void loadAuthEvents(auth.id);
  };
  
  const handleCancelAuthForm = () => {
    resetNewAuthForm();
    resetTimelineEventForm();
    setEditingAuthId(null);
    setViewingAuth(null);
    setAuthEvents([]);
    setAuthEventsError(null);
    setShowAddAuthForm(false);
  };

  useEffect(() => {
    if (!registeredFacilities.includes(newAuthForm.facility)) {
      handleNewAuthFieldChange('facility', registeredFacilities[0] ?? '');
    }
  
    if (!registeredInsurances.includes(newAuthForm.insurance)) {
      handleNewAuthFieldChange('insurance', registeredInsurances[0] ?? '');
    }
  
    if (!registeredWebPortals.includes(newAuthForm.webPortal)) {
      handleNewAuthFieldChange('webPortal', registeredWebPortals[0] ?? '');
    }
  }, [
    registeredFacilities,
    registeredInsurances,
    registeredWebPortals,
    newAuthForm.facility,
    newAuthForm.insurance,
    newAuthForm.webPortal,
  ]);
  
  const handleCreateAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  
    if (!newAuthForm.clientName.trim() || !newAuthForm.facility.trim() || !newAuthForm.insurance.trim()) {
      setAuthsError('Client name, facility, and insurance are required.');
      return;
    }
  
    setIsCreatingAuth(true);
    setAuthsError(null);
  
    try {
      const payload = {
        client_name: newAuthForm.clientName.trim(),
        facility: newAuthForm.facility.trim(),
        loc: newAuthForm.loc,
        status: newAuthForm.status,
        requested_days: newAuthForm.requestedDays ? Number(newAuthForm.requestedDays) : 0,
        approved_days: newAuthForm.approvedDays ? Number(newAuthForm.approvedDays) : 0,
        insurance: newAuthForm.insurance.trim(),
        auth_type: newAuthForm.authType,
        submission_methods:
          newAuthForm.submissionMethod === 'Live Call' || newAuthForm.submissionMethod === 'Voicemail'
            ? `${newAuthForm.submissionMethod}: ${newAuthForm.phoneNumber}${newAuthForm.phoneExtension ? ` ext. ${newAuthForm.phoneExtension}` : ''}`
            : newAuthForm.submissionMethod === 'Fax'
              ? `Fax: ${newAuthForm.faxNumber}`
              : `Web Portal: ${newAuthForm.webPortal}${newAuthForm.webPortalUrl ? ` (${newAuthForm.webPortalUrl})` : ''}`,
        care_manager_details: newAuthForm.hasCareManager
          ? [
              `Name: ${newAuthForm.careManagerName.trim() || 'Not provided'}`,
              `Contact Type: ${newAuthForm.careManagerContactType}`,
              newAuthForm.careManagerContactType === 'Phone'
                ? `Phone: ${newAuthForm.careManagerPhone || 'Not provided'}`
                : `Fax: ${newAuthForm.careManagerFax || 'Not provided'}`,
              newAuthForm.careManagerNotes.trim() ? `Notes: ${newAuthForm.careManagerNotes.trim()}` : '',
            ]
              .filter(Boolean)
              .join('\n')
          : '',
      };
    
      if (editingAuthId) {
        const updatedAuth = await updateAuthRequest(editingAuthId, payload);
    
        setAuthRequests((currentAuths) =>
          currentAuths.map((auth) => (auth.id === editingAuthId ? updatedAuth : auth)),
        );
      } else {
        const createdAuth = await createAuthRequest(payload);
        setAuthRequests((currentAuths) => [createdAuth, ...currentAuths]);
      }
    
      resetNewAuthForm();
      setEditingAuthId(null);
      setShowAddAuthForm(false);
    } catch (error) {
      setAuthsError(error instanceof Error ? error.message : 'Failed to create authorization record.');
    } finally {
      setIsCreatingAuth(false);
    }
  };

  const addRegisteredItem = (
    value: string,
    currentItems: string[],
    setItems: Dispatch<SetStateAction<string[]>>,
    clearValue: () => void,
  ) => {
    const trimmedValue = value.trim();
  
    if (!trimmedValue) {
      return;
    }
  
    if (currentItems.some((item) => item.toLowerCase() === trimmedValue.toLowerCase())) {
      clearValue();
      return;
    }
  
    setItems((items) => [...items, trimmedValue].sort());
    clearValue();
  };
  
  const removeRegisteredItem = (
    value: string,
    setItems: Dispatch<SetStateAction<string[]>>,
  ) => {
    setItems((items) => items.filter((item) => item !== value));
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
      const matchInsurance = selectedInsurance === 'All' || item.payer === selectedInsurance;
  
      return inDateRange && matchFacility && matchInsurance;
    });
  }, [authRequests, dateRange, selectedFacility, selectedInsurance]);

  const recentAuthorizations = useMemo(() => {
    return filteredData.slice(0, 5);
  }, [filteredData]);

  const facilityOptions = useMemo(() => {
    const uniqueFacilities = Array.from(
      new Set([
        ...registeredFacilities,
        ...authRequests.map((item) => item.facility),
      ].filter(Boolean)),
    ).sort();
  
    return ['All', ...uniqueFacilities];
  }, [authRequests, registeredFacilities]);

  const insuranceOptions = useMemo(() => {
    const uniqueInsurances = Array.from(
      new Set([
        ...registeredInsurances,
        ...authRequests.map((item) => item.payer),
      ].filter(Boolean)),
    ).sort();
  
    return ['All', ...uniqueInsurances];
  }, [authRequests, registeredInsurances]);

  useEffect(() => {
    if (!facilityOptions.includes(selectedFacility)) {
      setSelectedFacility('All');
    }
  }, [facilityOptions, selectedFacility]);

  useEffect(() => {
    if (!insuranceOptions.includes(selectedInsurance)) {
      setSelectedInsurance('All');
    }
  }, [insuranceOptions, selectedInsurance]);

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
              selectedInsurance={selectedInsurance}
              setSelectedInsurance={setSelectedInsurance}
              insurances={insuranceOptions}
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
                  data={filteredData}
                  darkMode={darkMode}
                  onView={handleStartViewAuth}
                  onEdit={handleStartEditAuth}
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

    {!showAddAuthForm && !viewingAuth && (
      <Filters
      dateRange={dateRange}
      setDateRange={setDateRange}
      selectedFacility={selectedFacility}
      setSelectedFacility={setSelectedFacility}
      facilities={facilityOptions}
      selectedInsurance={selectedInsurance}
      setSelectedInsurance={setSelectedInsurance}
      insurances={insuranceOptions}
      darkMode={darkMode}
    />
    )}

    <div className={`rounded-xl border p-5 shadow-sm overflow-hidden flex flex-col ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between gap-4 mb-4 shrink-0">
        <div>
          <h3 className="text-lg font-semibold">
            {showAddAuthForm
              ? editingAuthId
                ? 'Edit Authorization'
                : 'Add Authorization'
              : viewingAuth
                ? 'Authorization Details'
                : 'Authorization Work Queue'}
          </h3>
          <p className={cn('text-sm mt-1', darkMode ? 'text-gray-400' : 'text-gray-600')}>
            {showAddAuthForm
              ? 'Update authorization details and timeline events.'
              : viewingAuth
                ? 'Review authorization details and timeline history.'
                : 'View authorization records by facility and date range.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (viewingAuth) {
              handleCloseViewAuth();
              return;
            }

            if (showAddAuthForm) {
              handleCancelAuthForm();
              return;
            }

            setShowAddAuthForm(true);
          }}
          className={cn(
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            darkMode
              ? 'bg-blue-600 text-white hover:bg-blue-500'
              : 'bg-blue-600 text-white hover:bg-blue-700',
          )}
        >
          {showAddAuthForm ? (editingAuthId ? 'Close Edit' : 'Close Form') : viewingAuth ? 'Back to List' : 'Add Authorization'}
        </button>
      </div>

      {showAddAuthForm && (
        <>
          <AddAuthorizationForm
            form={newAuthForm}
            darkMode={darkMode}
            isCreatingAuth={isCreatingAuth}
            submitLabel={editingAuthId ? 'Save Changes' : 'Add Authorization'}
            registeredFacilities={registeredFacilities}
            registeredInsurances={registeredInsurances}
            registeredWebPortals={registeredWebPortals}
            onFieldChange={handleNewAuthFieldChange}
            onSubmit={handleCreateAuth}
            onCancel={handleCancelAuthForm}
          />

          {editingAuthId && (
            <div className="mt-4">
              {authEventsError && (
                <div
                  className={cn(
                    'mb-3 rounded-xl border px-4 py-3 text-sm',
                    darkMode
                      ? 'border-red-900/70 bg-red-950/40 text-red-200'
                      : 'border-red-200 bg-red-50 text-red-700',
                  )}
                >
                  {authEventsError}
                </div>
              )}

              {isLoadingAuthEvents ? (
                <div
                  className={cn(
                    'rounded-2xl border p-4 text-sm',
                    darkMode
                      ? 'border-gray-700 bg-gray-900 text-gray-300'
                      : 'border-gray-200 bg-white text-gray-600',
                  )}
                >
                  Loading authorization timeline...
                </div>
              ) : (
                <AuthTimelineSection
                  darkMode={darkMode}
                  events={authEvents}
                  eventForm={timelineEventForm}
                  isSavingEvent={isSavingAuthEvent}
                  editingEventId={editingAuthEventId}
                  confirmingDeleteEventId={confirmingDeleteAuthEventId}
                  onEventFieldChange={handleTimelineEventFieldChange}
                  onAddEvent={handleAddTimelineEvent}
                  onStartEditEvent={handleStartEditTimelineEvent}
                  onCancelEditEvent={handleCancelEditTimelineEvent}
                  onUpdateEvent={handleUpdateTimelineEvent}
                  onStartDeleteEvent={handleStartDeleteTimelineEvent}
                  onCancelDeleteEvent={handleCancelDeleteTimelineEvent}
                  onConfirmDeleteEvent={handleConfirmDeleteTimelineEvent}
                />
              )}
            </div>
          )}
        </>
      )}

      {viewingAuth && (
        <div className="mt-4">
          <AuthorizationReadOnlyView
            auth={viewingAuth}
            darkMode={darkMode}
            events={authEvents}
            isLoadingEvents={isLoadingAuthEvents}
            eventsError={authEventsError}
            onClose={handleCloseViewAuth}
            onEdit={handleStartEditAuth}
          />
        </div>
      )}

      {!showAddAuthForm && !viewingAuth && (
        <DataTable
          data={filteredData}
          darkMode={darkMode}
          onView={handleStartViewAuth}
          onEdit={handleStartEditAuth}
          onDelete={handleDeleteAuth}
          deletingId={deletingAuthId}
        />
      )}
    </div>
  </>
)}

            {activePage === 'settings' && (
              <div className="grid gap-6 lg:grid-cols-3">
                <div className={cn('rounded-xl border p-6', darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200')}>
                  <h3 className={cn('text-lg font-semibold mb-2', darkMode ? 'text-white' : 'text-gray-900')}>
                    Registered Facilities
                  </h3>
                  <p className={cn('mb-4 text-sm', darkMode ? 'text-gray-400' : 'text-gray-600')}>
                    Facilities available when creating authorization records.
                  </p>

                  <div className="mb-4 flex gap-2">
                    <input
                      type="text"
                      value={newFacilityName}
                      onChange={(event) => setNewFacilityName(event.target.value)}
                      placeholder="Add facility"
                      className={cn(
                        'min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500',
                        darkMode
                          ? 'border-gray-700 bg-gray-900 text-gray-100 placeholder-gray-500'
                          : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400',
                      )}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        addRegisteredItem(newFacilityName, registeredFacilities, setRegisteredFacilities, () => setNewFacilityName(''))
                      }
                      className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>

                  <div className="space-y-2">
                    {registeredFacilities.map((facility) => (
                      <div
                        key={facility}
                        className={cn(
                          'flex items-center justify-between rounded-lg border px-3 py-2 text-sm',
                          darkMode ? 'border-gray-800 bg-gray-950/60' : 'border-gray-200 bg-gray-50',
                        )}
                      >
                        <span>{facility}</span>
                        <button
                          type="button"
                          onClick={() => removeRegisteredItem(facility, setRegisteredFacilities)}
                          className={darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={cn('rounded-xl border p-6', darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200')}>
                  <h3 className={cn('text-lg font-semibold mb-2', darkMode ? 'text-white' : 'text-gray-900')}>
                    Registered Insurances
                  </h3>
                  <p className={cn('mb-4 text-sm', darkMode ? 'text-gray-400' : 'text-gray-600')}>
                    Insurance options available when creating authorization records.
                  </p>

                  <div className="mb-4 flex gap-2">
                    <input
                      type="text"
                      value={newInsuranceName}
                      onChange={(event) => setNewInsuranceName(event.target.value)}
                      placeholder="Add insurance"
                      className={cn(
                        'min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500',
                        darkMode
                          ? 'border-gray-700 bg-gray-900 text-gray-100 placeholder-gray-500'
                          : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400',
                      )}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        addRegisteredItem(newInsuranceName, registeredInsurances, setRegisteredInsurances, () => setNewInsuranceName(''))
                      }
                      className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>

                  <div className="space-y-2">
                    {registeredInsurances.map((insurance) => (
                      <div
                        key={insurance}
                        className={cn(
                          'flex items-center justify-between rounded-lg border px-3 py-2 text-sm',
                          darkMode ? 'border-gray-800 bg-gray-950/60' : 'border-gray-200 bg-gray-50',
                        )}
                      >
                        <span>{insurance}</span>
                        <button
                          type="button"
                          onClick={() => removeRegisteredItem(insurance, setRegisteredInsurances)}
                          className={darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={cn('rounded-xl border p-6', darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200')}>
                  <h3 className={cn('text-lg font-semibold mb-2', darkMode ? 'text-white' : 'text-gray-900')}>
                    Web Portals
                  </h3>
                  <p className={cn('mb-4 text-sm', darkMode ? 'text-gray-400' : 'text-gray-600')}>
                    Portal options available for web portal submissions.
                  </p>

                  <div className="mb-4 flex gap-2">
                    <input
                      type="text"
                      value={newWebPortalName}
                      onChange={(event) => setNewWebPortalName(event.target.value)}
                      placeholder="Add portal"
                      className={cn(
                        'min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500',
                        darkMode
                          ? 'border-gray-700 bg-gray-900 text-gray-100 placeholder-gray-500'
                          : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400',
                      )}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        addRegisteredItem(newWebPortalName, registeredWebPortals, setRegisteredWebPortals, () => setNewWebPortalName(''))
                      }
                      className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>

                  <div className="space-y-2">
                    {registeredWebPortals.map((portal) => (
                      <div
                        key={portal}
                        className={cn(
                          'flex items-center justify-between rounded-lg border px-3 py-2 text-sm',
                          darkMode ? 'border-gray-800 bg-gray-950/60' : 'border-gray-200 bg-gray-50',
                        )}
                      >
                        <span>{portal}</span>
                        <button
                          type="button"
                          onClick={() => removeRegisteredItem(portal, setRegisteredWebPortals)}
                          className={darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
