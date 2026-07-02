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
  CalendarDays,
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
import Filters, { type WorkQueueFilter } from './components/Filters';
import { UpcomingWorkflowCard } from './components/UpcomingWorkflowCard';
import { CalendarPage } from './components/CalendarPage';
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

type AppPage = 'dashboard' | 'authorizations' | 'calendar' | 'settings';

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

type DashboardCardKey =
  | 'kpis'
  | 'trends'
  | 'levelOfCare'
  | 'upcomingWorkflow'
  | 'recentAuthorizations';

type DashboardCardSettings = Record<DashboardCardKey, boolean>;

const DEFAULT_DASHBOARD_CARD_SETTINGS: DashboardCardSettings = {
  kpis: true,
  trends: true,
  levelOfCare: true,
  upcomingWorkflow: true,
  recentAuthorizations: true,
};
const DASHBOARD_CARD_SETTINGS_STORAGE_KEY = 'carequeue.dashboardCardSettings';

const DASHBOARD_CARD_LABELS: Record<DashboardCardKey, string> = {
  kpis: 'KPI Cards',
  trends: 'Authorization Trends',
  levelOfCare: 'Level of Care Breakdown',
  upcomingWorkflow: 'Upcoming Workflow',
  recentAuthorizations: 'Recent Authorizations',
};

function loadDashboardCardSettings(): DashboardCardSettings {
  try {
    const storedValue = window.localStorage.getItem(DASHBOARD_CARD_SETTINGS_STORAGE_KEY);

    if (!storedValue) {
      return DEFAULT_DASHBOARD_CARD_SETTINGS;
    }

    const parsedValue = JSON.parse(storedValue) as Partial<DashboardCardSettings>;

    return {
      ...DEFAULT_DASHBOARD_CARD_SETTINGS,
      ...parsedValue,
    };
  } catch {
    return DEFAULT_DASHBOARD_CARD_SETTINGS;
  }
}

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [activePage, setActivePage] = useState<AppPage>('dashboard');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [selectedFacility, setSelectedFacility] = useState<string>('All');
  const [selectedInsurance, setSelectedInsurance] = useState<string>('All');
  const [selectedWorkQueue, setSelectedWorkQueue] = useState<WorkQueueFilter>('All');
  const [dashboardCardSettings, setDashboardCardSettings] = useState<DashboardCardSettings>(
    loadDashboardCardSettings,
  );
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
  
  useEffect(() => {
    window.localStorage.setItem(
      DASHBOARD_CARD_SETTINGS_STORAGE_KEY,
      JSON.stringify(dashboardCardSettings),
    );
  }, [dashboardCardSettings]);

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
    startDate: '',
    endDate: '',
    reviewDueDate: '',
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
      page: 'calendar',
      label: 'Calendar',
      icon: CalendarDays,
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


  const handleToggleDashboardCard = (cardKey: DashboardCardKey) => {
    setDashboardCardSettings((currentSettings) => ({
      ...currentSettings,
      [cardKey]: !currentSettings[cardKey],
    }));
  };
  
  const handleResetDashboardCards = () => {
    setDashboardCardSettings(DEFAULT_DASHBOARD_CARD_SETTINGS);
  };

  
  const resetNewAuthForm = () => {
    setNewAuthForm({
      clientName: '',
      facility: registeredFacilities[0] ?? '',
      loc: 'RTC',
      status: 'Pending',
      startDate: '',
      endDate: '',
      reviewDueDate: '',
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
      startDate: auth.dateStr || '',
      endDate: '',
      reviewDueDate: auth.reviewDueDate ?? '',
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
  
  const getLatestTimelineEvent = () => {
    if (authEvents.length === 0) {
      return null;
    }
  
    return [...authEvents].sort((firstEvent, secondEvent) => {
      const firstDate = `${firstEvent.eventDate || ''}T${firstEvent.eventTime || '00:00'}`;
      const secondDate = `${secondEvent.eventDate || ''}T${secondEvent.eventTime || '00:00'}`;
  
      return secondDate.localeCompare(firstDate);
    })[0];
  };

  const handleTimelineEventFieldChange = (field: keyof TimelineEventFormState, value: string) => {
    setTimelineEventForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const handlePrefillTimelineFromLastEvent = () => {
    const latestEvent = getLatestTimelineEvent();
  
    if (!latestEvent) {
      return;
    }
  
    setNewAuthForm((currentForm) => ({
      ...currentForm,
      startDate: latestEvent.eventDate || currentForm.startDate,
    }));
  
    setTimelineEventForm({
      eventDate: latestEvent.eventDate,
      eventTime: latestEvent.eventTime,
      eventType: latestEvent.eventType,
      outcome: latestEvent.outcome,
      notes: '',
    });
  
    setEditingAuthEventId(null);
    setConfirmingDeleteAuthEventId(null);
    setAuthEventsError(null);
  };
  

  const handleStartConcurrentReview = () => {
    const latestEvent = getLatestTimelineEvent();
  
    if (latestEvent?.eventDate) {
      setNewAuthForm((currentForm) => ({
        ...currentForm,
        startDate: latestEvent.eventDate,
      }));
    }
  
    setTimelineEventForm({
      eventDate: latestEvent?.eventDate || '',
      eventTime: '',
      eventType: 'Request Submitted',
      outcome: 'Pending',
      notes: 'Concurrent review submitted.',
    });
  
    setEditingAuthEventId(null);
    setConfirmingDeleteAuthEventId(null);
    setAuthEventsError(null);
  };

  const handleAddTimelineEvent = async () => {
    if (!editingAuthId) {
      return;
    }
  
    setIsSavingAuthEvent(true);
    setAuthEventsError(null);
  
    try {
      const createdEvent = await createAuthEvent(editingAuthId, {
        event_date: timelineEventForm.eventDate,
        event_time: timelineEventForm.eventTime,
        event_type: timelineEventForm.eventType,
        outcome: timelineEventForm.outcome,
        notes: timelineEventForm.notes,
      });
  
      setAuthEvents((currentEvents) => [createdEvent, ...currentEvents]);
      resetTimelineEventForm();
  
      const refreshedAuths = await fetchAuthRequests();
      setAuthRequests(refreshedAuths);
    } catch (error) {
      setAuthEventsError(error instanceof Error ? error.message : 'Failed to add authorization timeline event.');
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
    setActivePage('authorizations');
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

  const handleStartConcurrentAuthorization = () => {
    setNewAuthForm((currentForm) => ({
      ...currentForm,
      status: 'Pending',
      authType: 'Concurrent',
      startDate: '',
      endDate: '',
      reviewDueDate: '',
      requestedDays: '',
      approvedDays: '',
    }));
  
    resetTimelineEventForm();
    setEditingAuthId(null);
    setViewingAuth(null);
    setAuthsError(null);
    setShowAddAuthForm(true);
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
        auth_start_date: newAuthForm.startDate,
        auth_end_date: newAuthForm.endDate,
        review_due_date: newAuthForm.reviewDueDate,
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

  const matchesWorkQueueFilter = (item: AuthRequest, workQueueFilter: WorkQueueFilter) => {
    if (workQueueFilter === 'All') {
      return true;
    }

    if (workQueueFilter === 'Needs Action') {
      return (
        item.status === 'Pending' ||
        item.status === 'P2P' ||
        item.status === 'Appealed' ||
        item.status === 'Denied' ||
        (item.status === 'Approved' && item.approvedDays < item.requestedDays)
      );
    }
  
    if (workQueueFilter === 'Partial Approvals') {
      return item.status === 'Approved' && item.approvedDays < item.requestedDays;
    }
  
    return item.status === workQueueFilter;
  };


  const getDateRangeDays = (range: '7d' | '30d' | '90d') => {
    if (range === '7d') {
      return 7;
    }
  
    if (range === '90d') {
      return 90;
    }
  
    return 30;
  };


  const getComparisonPeriodLabel = (range: '7d' | '30d' | '90d') => {
    if (range === '7d') {
      return 'Compared with the previous 7 days';
    }
  
    if (range === '90d') {
      return 'Compared with the previous 90 days';
    }
  
    return 'Compared with the previous 30 days';
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
      const matchWorkQueue = matchesWorkQueueFilter(item, selectedWorkQueue);

      return inDateRange && matchFacility && matchInsurance && matchWorkQueue;
    });
  }, [authRequests, dateRange, selectedFacility, selectedInsurance, selectedWorkQueue]);

  const comparisonFilteredData = useMemo(() => {
    const today = new Date();
    const daysToSubtract = getDateRangeDays(dateRange);
    const currentStartDate = subDays(today, daysToSubtract);
    const previousStartDate = subDays(currentStartDate, daysToSubtract);
  
    return authRequests.filter((item) => {
      const inPreviousDateRange = item.date >= previousStartDate && item.date < currentStartDate;
      const matchFacility = selectedFacility === 'All' || item.facility === selectedFacility;
      const matchInsurance = selectedInsurance === 'All' || item.payer === selectedInsurance;
      const matchWorkQueue = matchesWorkQueueFilter(item, selectedWorkQueue);
  
      return inPreviousDateRange && matchFacility && matchInsurance && matchWorkQueue;
    });
  }, [authRequests, dateRange, selectedFacility, selectedInsurance, selectedWorkQueue]);

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
  
  const handleClearFilters = () => {
    setDateRange('30d');
    setSelectedFacility('All');
    setSelectedInsurance('All');
    setSelectedWorkQueue('All');
  };

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
    calendar: 'Calendar',
    settings: 'Settings',
  }[activePage];

  const pageDescription = {
    dashboard: 'Authorization performance and workload overview',
    authorizations: 'View and manage authorization records',
    calendar: 'Track review dates and LCDs',
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
              selectedWorkQueue={selectedWorkQueue}
              setSelectedWorkQueue={setSelectedWorkQueue} 
              darkMode={darkMode}
              onClearFilters={handleClearFilters}
            />
            
            {dashboardCardSettings.kpis && (
              <div className="space-y-2">
                <KPICards
                  data={filteredData}
                  comparisonData={comparisonFilteredData}
                  darkMode={darkMode}
                />
                <p className={cn('text-xs', darkMode ? 'text-gray-400' : 'text-gray-600')}>
                  {getComparisonPeriodLabel(dateRange)}
                </p>
              </div>
            )}
            
            {(dashboardCardSettings.trends || dashboardCardSettings.levelOfCare) && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {dashboardCardSettings.trends && (
                  <div className={`lg:col-span-2 rounded-xl border p-5 shadow-sm ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                    <h3 className="text-lg font-semibold mb-4">Authorization Trends</h3>
                    <TrendChart data={filteredData} darkMode={darkMode} />
                  </div>
                )}

                {dashboardCardSettings.levelOfCare && (
                  <div className={`rounded-xl border p-5 shadow-sm ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                    <h3 className="text-lg font-semibold mb-4">Level of Care Breakdown</h3>
                    <LOCChart data={filteredData} darkMode={darkMode} />
                  </div>
                )}
              </div>
            )}

            {(dashboardCardSettings.upcomingWorkflow || dashboardCardSettings.recentAuthorizations) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {dashboardCardSettings.upcomingWorkflow && (
                  <div className={`rounded-xl border p-5 shadow-sm ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                    <h3 className="text-lg font-semibold mb-1">Upcoming Workflow</h3>
                    <p className={cn('mb-4 text-sm', darkMode ? 'text-gray-400' : 'text-gray-600')}>
                    Due dates and status-based follow-up items for the selected filters.
                    </p>
                    <UpcomingWorkflowCard data={filteredData} darkMode={darkMode} />
                  </div>
                )}

                {dashboardCardSettings.recentAuthorizations && (
                  <div className={`rounded-xl border p-5 shadow-sm overflow-hidden flex flex-col ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                    <h3 className="text-lg font-semibold mb-4 shrink-0">Recent Authorizations</h3>
                    <p className={cn('mb-4 text-sm', darkMode ? 'text-gray-400' : 'text-gray-600')}>
                      Select a row to view authorization details.
                    </p>
                    <DataTable
                      data={filteredData} 
                      darkMode={darkMode}
                      onView={handleStartViewAuth}
                      showActions={false}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}

{activePage === 'calendar' && (
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
                  selectedInsurance={selectedInsurance}
                  setSelectedInsurance={setSelectedInsurance}
                  insurances={insuranceOptions}
                  selectedWorkQueue={selectedWorkQueue}
                  setSelectedWorkQueue={setSelectedWorkQueue}
                  darkMode={darkMode}
                  onClearFilters={handleClearFilters}
                />

                <CalendarPage
                  data={filteredData}
                  darkMode={darkMode}
                  onSelectAuth={handleStartViewAuth}
                />
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
      selectedWorkQueue={selectedWorkQueue}
      setSelectedWorkQueue={setSelectedWorkQueue}
      darkMode={darkMode}
      onClearFilters={handleClearFilters}
    />
    )}

    <div className={`rounded-xl border p-5 shadow-sm overflow-hidden flex flex-col ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between gap-4 mb-4 shrink-0">
        <div>
        <h3 className="text-lg font-semibold">
            {showAddAuthForm
              ? editingAuthId
                ? 'Edit Authorization'
                : newAuthForm.authType === 'Concurrent'
                  ? 'Add Concurrent Authorization'
                  : 'Add Authorization'
              : viewingAuth
                ? 'Authorization Details'
                : 'Authorization Work Queue'}
          </h3>
          <p className={cn('text-sm mt-1', darkMode ? 'text-gray-400' : 'text-gray-600')}>
          {showAddAuthForm
            ? editingAuthId
              ? 'Update authorization details and timeline events.'
              : newAuthForm.authType === 'Concurrent'
                ? 'Create a new concurrent authorization using copied client and payer details.'
                : 'Create a new authorization record.'
            : viewingAuth
              ? 'Review authorization details and timeline history.'
              : 'View authorization records by facility and date range.'}
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
        {showAddAuthForm && editingAuthId && (
          <button
            type="button"
            onClick={handleStartConcurrentAuthorization}
            className={cn(
              'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
              darkMode
                ? 'border-emerald-800 bg-emerald-950/40 text-emerald-200 hover:bg-emerald-900/50'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
            )}
          >
            Start Concurrent
          </button>
        )}

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
      </div>

      {showAddAuthForm && (
        <>
          <AddAuthorizationForm
            form={newAuthForm}
            darkMode={darkMode}
            isCreatingAuth={isCreatingAuth}
            submitLabel={
              editingAuthId
                ? 'Save Changes'
                : newAuthForm.authType === 'Concurrent'
                  ? 'Add Concurrent Authorization'
                  : 'Add Authorization'
            }
            registeredFacilities={registeredFacilities}
            registeredInsurances={registeredInsurances}
            registeredWebPortals={registeredWebPortals}
            onFieldChange={handleNewAuthFieldChange}
            onSubmit={handleCreateAuth}
            onCancel={handleCancelAuthForm}
          />

          {showAddAuthForm && !editingAuthId && newAuthForm.authType === 'Concurrent' && authEvents.length > 0 && (
            <div
              className={cn(
                'mt-4 rounded-2xl border p-4',
                darkMode ? 'border-gray-800 bg-gray-950/60' : 'border-gray-200 bg-white',
              )}
            >
              <div className="mb-3">
                <h4 className="text-sm font-semibold">Previous Authorization Timeline</h4>
                <p className={cn('mt-1 text-xs', darkMode ? 'text-gray-400' : 'text-gray-600')}>
                  Reference the prior authorization dates while creating this concurrent review.
                </p>
              </div>

              <div className="space-y-3">
                {authEvents.map((event) => (
                  <div
                    key={event.id}
                    className={cn(
                      'rounded-xl border px-4 py-3 text-sm',
                      darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-gray-50',
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium">
                        {event.eventType}
                        {event.outcome ? ` - ${event.outcome}` : ''}
                      </div>
                      <div className={cn('text-xs', darkMode ? 'text-gray-400' : 'text-gray-600')}>
                        {event.eventDate}
                        {event.eventTime ? ` at ${event.eventTime}` : ''}
                      </div>
                    </div>

                    {event.notes && (
                      <p className={cn('mt-2 whitespace-pre-wrap text-xs', darkMode ? 'text-gray-400' : 'text-gray-600')}>
                        {event.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

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
                  onPrefillFromLastEvent={handlePrefillTimelineFromLastEvent}
                  onStartConcurrentReview={handleStartConcurrentReview}
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

                  <div className={`rounded-xl border p-5 shadow-sm ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold">Dashboard Cards</h3>
                        <p className={cn('mt-1 text-sm', darkMode ? 'text-gray-400' : 'text-gray-600')}>
                          Choose which cards appear on the Dashboard.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleResetDashboardCards}
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
                      {(Object.entries(DASHBOARD_CARD_LABELS) as [DashboardCardKey, string][]).map(([cardKey, label]) => (
                        <label
                          key={cardKey}
                          className={cn(
                            'flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm',
                            darkMode ? 'border-gray-800 bg-gray-950 text-gray-200' : 'border-gray-200 bg-gray-50 text-gray-700',
                          )}
                        >
                          <span className="font-medium">{label}</span>
                          <input
                            type="checkbox"
                            checked={dashboardCardSettings[cardKey]}
                            onChange={() => handleToggleDashboardCard(cardKey)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </label>
                      ))}
                    </div>
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
