import { useEffect, useMemo, useState } from "react";

import type { AuthRequest } from "../types/auth";

const DEFAULT_FACILITIES = ["Other"];
const DEFAULT_INSURANCES = ["Other"];
const DEFAULT_WEB_PORTALS = ["Other"];

const REGISTERED_FACILITIES_STORAGE_KEY = "carequeue.registeredFacilities";
const REGISTERED_INSURANCES_STORAGE_KEY = "carequeue.registeredInsurances";
const REGISTERED_WEB_PORTALS_STORAGE_KEY = "carequeue.registeredWebPortals";

function loadRegisteredItems(
  storageKey: string,
  defaultItems: string[]
): string[] {
  try {
    const storedValue = window.localStorage.getItem(storageKey);

    if (!storedValue) {
      return defaultItems;
    }

    const parsedValue = JSON.parse(storedValue);

    if (!Array.isArray(parsedValue)) {
      return defaultItems;
    }

    return Array.from(new Set(parsedValue.filter(Boolean))).sort();
  } catch {
    return defaultItems;
  }
}

function addRegisteredItem(
  value: string,
  currentItems: string[],
  setItems: (items: string[]) => void,
  onAdded: () => void
) {
  const trimmedValue = value.trim();

  if (!trimmedValue || currentItems.includes(trimmedValue)) {
    return;
  }

  setItems([...currentItems, trimmedValue].sort());
  onAdded();
}

function removeRegisteredItem(
  value: string,
  setItems: React.Dispatch<React.SetStateAction<string[]>>
) {
  setItems((currentItems) => currentItems.filter((item) => item !== value));
}

export function useRegisteredOptions(authRequests: AuthRequest[]) {
  const [registeredFacilities, setRegisteredFacilities] = useState<string[]>(
    () =>
      loadRegisteredItems(REGISTERED_FACILITIES_STORAGE_KEY, DEFAULT_FACILITIES)
  );
  const [registeredInsurances, setRegisteredInsurances] = useState<string[]>(
    () =>
      loadRegisteredItems(REGISTERED_INSURANCES_STORAGE_KEY, DEFAULT_INSURANCES)
  );
  const [registeredWebPortals, setRegisteredWebPortals] = useState<string[]>(
    () =>
      loadRegisteredItems(
        REGISTERED_WEB_PORTALS_STORAGE_KEY,
        DEFAULT_WEB_PORTALS
      )
  );

  const [newFacilityName, setNewFacilityName] = useState("");
  const [newInsuranceName, setNewInsuranceName] = useState("");
  const [newWebPortalName, setNewWebPortalName] = useState("");

  useEffect(() => {
    window.localStorage.setItem(
      REGISTERED_FACILITIES_STORAGE_KEY,
      JSON.stringify(registeredFacilities)
    );
  }, [registeredFacilities]);

  useEffect(() => {
    window.localStorage.setItem(
      REGISTERED_INSURANCES_STORAGE_KEY,
      JSON.stringify(registeredInsurances)
    );
  }, [registeredInsurances]);

  useEffect(() => {
    window.localStorage.setItem(
      REGISTERED_WEB_PORTALS_STORAGE_KEY,
      JSON.stringify(registeredWebPortals)
    );
  }, [registeredWebPortals]);

  const facilityOptions = useMemo(() => {
    const uniqueFacilities = Array.from(
      new Set(
        [
          ...registeredFacilities,
          ...authRequests.map((item) => item.facility),
        ].filter(Boolean)
      )
    ).sort();

    return ["All", ...uniqueFacilities];
  }, [authRequests, registeredFacilities]);

  const insuranceOptions = useMemo(() => {
    const uniqueInsurances = Array.from(
      new Set(
        [
          ...registeredInsurances,
          ...authRequests.map((item) => item.payer),
        ].filter(Boolean)
      )
    ).sort();

    return ["All", ...uniqueInsurances];
  }, [authRequests, registeredInsurances]);

  const handleAddFacility = () => {
    addRegisteredItem(
      newFacilityName,
      registeredFacilities,
      setRegisteredFacilities,
      () => setNewFacilityName("")
    );
  };

  const handleRemoveFacility = (facility: string) => {
    removeRegisteredItem(facility, setRegisteredFacilities);
  };

  const handleAddInsurance = () => {
    addRegisteredItem(
      newInsuranceName,
      registeredInsurances,
      setRegisteredInsurances,
      () => setNewInsuranceName("")
    );
  };

  const handleRemoveInsurance = (insurance: string) => {
    removeRegisteredItem(insurance, setRegisteredInsurances);
  };

  const handleAddWebPortal = () => {
    addRegisteredItem(
      newWebPortalName,
      registeredWebPortals,
      setRegisteredWebPortals,
      () => setNewWebPortalName("")
    );
  };

  const handleRemoveWebPortal = (portal: string) => {
    removeRegisteredItem(portal, setRegisteredWebPortals);
  };

  return {
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
  };
}
