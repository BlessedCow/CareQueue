import { useEffect, useState } from "react";

// API
import { fetchAuthRequests } from "./api/authStatus";

// Pages
import { DashboardPage } from "./pages/DashboardPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AuthorizationsPage } from "./pages/AuthorizationsPage";
import { CalendarRoutePage } from "./pages/CalendarRoutePage";

// Hooks
import { useDashboardCardSettings } from "./hooks/useDashboardCardSettings";
import { useRegisteredOptions } from "./hooks/useRegisteredOptions";
import { useAuthorizationFilters } from "./hooks/useAuthorizationFilters";
import { useAuthorizationEvents } from "./hooks/useAuthorizationEvents";
import { useAuthorizationForm } from "./hooks/useAuthorizationForm";
import { useAuthorizationSelection } from "./hooks/useAuthorizationSelection";
import { useAuthorizationMutations } from "./hooks/useAuthorizationMutations";

// AppShell
import { AppShell } from "./components/layout/AppShell";

// Types
import type { AppPage } from "./types/navigation";
import { AuthRequest } from "./types/auth";

const SETTINGS_STORAGE_KEYS = {
  facilities: "carequeue.registeredFacilities",
  insurances: "carequeue.registeredInsurances",
  webPortals: "carequeue.registeredWebPortals",
};

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [activePage, setActivePage] = useState<AppPage>("dashboard");
  const {
    dashboardCardSettings,
    handleToggleDashboardCard,
    handleResetDashboardCards,
  } = useDashboardCardSettings();
  const [authRequests, setAuthRequests] = useState<AuthRequest[]>([]);
  const {
    registeredFacilities,
    registeredInsurances,
    registeredWebPortals,
    newFacilityName,
    setNewFacilityName,
    newInsuranceName,
    setNewInsuranceName,
    newWebPortalName,
    setNewWebPortalName,
    facilityOptions,
    insuranceOptions,
    handleAddFacility,
    handleRemoveFacility,
    handleAddInsurance,
    handleRemoveInsurance,
    handleAddWebPortal,
    handleRemoveWebPortal,
  } = useRegisteredOptions(authRequests);

  const {
    dateRange,
    setDateRange,
    selectedFacility,
    setSelectedFacility,
    selectedInsurance,
    setSelectedInsurance,
    selectedWorkQueue,
    setSelectedWorkQueue,
    filteredData,
    comparisonFilteredData,
    comparisonPeriodLabel,
    handleClearFilters,
  } = useAuthorizationFilters({
    authRequests,
    facilityOptions,
    insuranceOptions,
  });

  const [isLoadingAuths, setIsLoadingAuths] = useState(true);
  const [authsError, setAuthsError] = useState<string | null>(null);
  const {
    isCreatingAuth,
    deletingAuthId,
    saveAuthorization,
    removeAuthorization,
  } = useAuthorizationMutations();

  const {
    authEvents,
    setAuthEvents,
    isLoadingAuthEvents,
    isSavingAuthEvent,
    authEventsError,
    setAuthEventsError,
    editingAuthEventId,
    confirmingDeleteAuthEventId,
    timelineEventForm,
    resetTimelineEventForm,
    clearAuthEvents,
    loadAuthEvents,
    handleTimelineEventFieldChange,
    handleAddTimelineEvent,
    handleStartEditTimelineEvent,
    handleCancelEditTimelineEvent,
    handleUpdateTimelineEvent,
    handleStartDeleteTimelineEvent,
    handleCancelDeleteTimelineEvent,
    handleConfirmDeleteTimelineEvent,
    handlePrefillTimelineFromLastEvent,
  } = useAuthorizationEvents();

  useEffect(() => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEYS.facilities,
      JSON.stringify(registeredFacilities)
    );
  }, [registeredFacilities]);

  useEffect(() => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEYS.insurances,
      JSON.stringify(registeredInsurances)
    );
  }, [registeredInsurances]);

  useEffect(() => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEYS.webPortals,
      JSON.stringify(registeredWebPortals)
    );
  }, [registeredWebPortals]);

  const {
    newAuthForm,
    setNewAuthForm,
    resetNewAuthForm,
    handleNewAuthFieldChange,
    loadAuthIntoForm,
    loadConcurrentAuthForm,
  } = useAuthorizationForm();

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
          setAuthsError(
            error instanceof Error
              ? error.message
              : "Unable to load authorization records."
          );
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

  const {
    showAddAuthForm,
    viewingAuth,
    editingAuthId,
    handleShowAddAuthForm,
    handleCancelAuthForm,
    handleStartViewAuth,
    handleCloseViewAuth,
    handleStartEditAuth,
    handleStartConcurrentAuthorization,
    handleAuthSaved,
    handleAuthDeleted,
  } = useAuthorizationSelection({
    resetNewAuthForm,
    loadAuthIntoForm,
    loadConcurrentAuthForm,
    resetTimelineEventForm,
    clearAuthEvents,
    loadAuthEvents,
  });

  const handleDeleteAuth = async (auth: AuthRequest) => {
    setAuthsError(null);

    try {
      await removeAuthorization(auth);

      setAuthRequests((currentAuths) =>
        currentAuths.filter((item) => item.id !== auth.id)
      );
      handleAuthDeleted(auth.id, authEvents);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to delete authorization.";
      setAuthsError(message);
    }
  };

  const getLatestTimelineEvent = () => {
    if (authEvents.length === 0) {
      return null;
    }

    return [...authEvents].sort((firstEvent, secondEvent) => {
      const firstDate = `${firstEvent.eventDate || ""}T${
        firstEvent.eventTime || "00:00"
      }`;
      const secondDate = `${secondEvent.eventDate || ""}T${
        secondEvent.eventTime || "00:00"
      }`;

      return secondDate.localeCompare(firstDate);
    })[0];
  };

  useEffect(() => {
    if (!registeredFacilities.includes(newAuthForm.facility)) {
      handleNewAuthFieldChange("facility", registeredFacilities[0] ?? "");
    }

    if (!registeredInsurances.includes(newAuthForm.insurance)) {
      handleNewAuthFieldChange("insurance", registeredInsurances[0] ?? "");
    }

    if (!registeredWebPortals.includes(newAuthForm.webPortal)) {
      handleNewAuthFieldChange("webPortal", registeredWebPortals[0] ?? "");
    }
  }, [
    registeredFacilities,
    registeredInsurances,
    registeredWebPortals,
    newAuthForm.facility,
    newAuthForm.insurance,
    newAuthForm.webPortal,
  ]);

  const handleStartConcurrentReview = () => {
    handleTimelineEventFieldChange("eventType", "Concurrent Review");
    handleTimelineEventFieldChange("outcome", "Pending");
  };

  const handleCreateAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthsError(null);

    try {
      const savedAuth = await saveAuthorization({
        editingAuthId,
        form: newAuthForm,
      });

      setAuthRequests((currentAuths) => {
        if (editingAuthId) {
          return currentAuths.map((auth) =>
            auth.id === savedAuth.id ? savedAuth : auth
          );
        }

        return [savedAuth, ...currentAuths];
      });

      handleAuthSaved();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to save authorization.";
      setAuthsError(message);
    }
  };

  return (
    <AppShell
      activePage={activePage}
      darkMode={darkMode}
      onPageChange={setActivePage}
      onToggleDarkMode={() => setDarkMode((currentValue) => !currentValue)}
    >
      {activePage === "dashboard" && (
        <DashboardPage
          darkMode={darkMode}
          isLoadingAuths={isLoadingAuths}
          authsError={authsError}
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
          onClearFilters={handleClearFilters}
          dashboardCardSettings={dashboardCardSettings}
          filteredData={filteredData}
          comparisonFilteredData={comparisonFilteredData}
          comparisonPeriodLabel={comparisonPeriodLabel}
          onViewAuth={handleStartViewAuth}
        />
      )}

      {activePage === "calendar" && (
        <CalendarRoutePage
          darkMode={darkMode}
          isLoadingAuths={isLoadingAuths}
          authsError={authsError}
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
          onClearFilters={handleClearFilters}
          filteredData={filteredData}
          onSelectAuth={handleStartViewAuth}
        />
      )}

      {activePage === "authorizations" && (
        <AuthorizationsPage
          darkMode={darkMode}
          isLoadingAuths={isLoadingAuths}
          authsError={authsError}
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
          onClearFilters={handleClearFilters}
          filteredData={filteredData}
          showAddAuthForm={showAddAuthForm}
          viewingAuth={viewingAuth}
          editingAuthId={editingAuthId}
          newAuthForm={newAuthForm}
          isCreatingAuth={isCreatingAuth}
          registeredFacilities={registeredFacilities}
          registeredInsurances={registeredInsurances}
          registeredWebPortals={registeredWebPortals}
          authEvents={authEvents}
          authEventsError={authEventsError}
          isLoadingAuthEvents={isLoadingAuthEvents}
          isSavingAuthEvent={isSavingAuthEvent}
          editingAuthEventId={editingAuthEventId}
          confirmingDeleteAuthEventId={confirmingDeleteAuthEventId}
          timelineEventForm={timelineEventForm}
          deletingAuthId={deletingAuthId}
          onShowAddAuthForm={handleShowAddAuthForm}
          onCancelAuthForm={handleCancelAuthForm}
          onCloseViewAuth={handleCloseViewAuth}
          onStartConcurrentAuthorization={handleStartConcurrentAuthorization}
          onFieldChange={handleNewAuthFieldChange}
          onSubmitAuth={handleCreateAuth}
          onViewAuth={handleStartViewAuth}
          onEditAuth={handleStartEditAuth}
          onDeleteAuth={handleDeleteAuth}
          onTimelineEventFieldChange={handleTimelineEventFieldChange}
          onAddTimelineEvent={() => {
            if (!editingAuthId) {
              return;
            }

            handleAddTimelineEvent(editingAuthId);
          }}
          onStartEditTimelineEvent={handleStartEditTimelineEvent}
          onCancelEditTimelineEvent={handleCancelEditTimelineEvent}
          onUpdateTimelineEvent={handleUpdateTimelineEvent}
          onStartDeleteTimelineEvent={handleStartDeleteTimelineEvent}
          onCancelDeleteTimelineEvent={handleCancelDeleteTimelineEvent}
          onConfirmDeleteTimelineEvent={handleConfirmDeleteTimelineEvent}
          onPrefillTimelineFromLastEvent={handlePrefillTimelineFromLastEvent}
          onStartConcurrentReview={handleStartConcurrentReview}
        />
      )}

      {activePage === "settings" && (
        <SettingsPage
          darkMode={darkMode}
          newFacilityName={newFacilityName}
          setNewFacilityName={setNewFacilityName}
          registeredFacilities={registeredFacilities}
          onAddFacility={handleAddFacility}
          onRemoveFacility={handleRemoveFacility}
          newInsuranceName={newInsuranceName}
          setNewInsuranceName={setNewInsuranceName}
          registeredInsurances={registeredInsurances}
          onAddInsurance={handleAddInsurance}
          onRemoveInsurance={handleRemoveInsurance}
          newWebPortalName={newWebPortalName}
          setNewWebPortalName={setNewWebPortalName}
          registeredWebPortals={registeredWebPortals}
          onAddWebPortal={handleAddWebPortal}
          onRemoveWebPortal={handleRemoveWebPortal}
          dashboardCardSettings={dashboardCardSettings}
          onToggleDashboardCard={handleToggleDashboardCard}
          onResetDashboardCards={handleResetDashboardCards}
        />
      )}
    </AppShell>
  );
}

export default App;
