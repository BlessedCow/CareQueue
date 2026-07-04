import { useEffect, useMemo, useState } from 'react';
import { subDays } from 'date-fns';

import type { WorkQueueFilter } from '../components/Filters';
import type { AuthRequest } from '../types/auth';

export type DateRange = '7d' | '30d' | '90d';

function matchesWorkQueueFilter(item: AuthRequest, workQueueFilter: WorkQueueFilter) {
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
}

function getDateRangeDays(range: DateRange) {
  if (range === '7d') {
    return 7;
  }

  if (range === '90d') {
    return 90;
  }

  return 30;
}

function getComparisonPeriodLabel(range: DateRange) {
  if (range === '7d') {
    return 'Compared with the previous 7 days';
  }

  if (range === '90d') {
    return 'Compared with the previous 90 days';
  }

  return 'Compared with the previous 30 days';
}

interface UseAuthorizationFiltersArgs {
  authRequests: AuthRequest[];
  facilityOptions: string[];
  insuranceOptions: string[];
}

export function useAuthorizationFilters({
  authRequests,
  facilityOptions,
  insuranceOptions,
}: UseAuthorizationFiltersArgs) {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [selectedFacility, setSelectedFacility] = useState('All');
  const [selectedInsurance, setSelectedInsurance] = useState('All');
  const [selectedWorkQueue, setSelectedWorkQueue] = useState<WorkQueueFilter>('All');

  const filteredData = useMemo(() => {
    const today = new Date();
    const daysToSubtract = getDateRangeDays(dateRange);
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

  return {
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
    comparisonPeriodLabel: getComparisonPeriodLabel(dateRange),
    handleClearFilters,
  };
}