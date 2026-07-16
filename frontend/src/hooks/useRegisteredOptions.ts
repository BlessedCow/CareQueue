import { useEffect, useMemo, useState } from "react";

import {
  createRegisteredOption,
  deleteRegisteredOption,
  fetchRegisteredOptions,
  type RegisteredOption,
  type RegisteredOptionCategory,
} from "../api/registeredOptions";
import type { AuthRequest } from "../types/auth";

function optionNames(
  options: RegisteredOption[],
  category: RegisteredOptionCategory
): string[] {
  return options
    .filter((option) => option.category === category)
    .map((option) => option.name)
    .sort((firstName, secondName) =>
      firstName.localeCompare(secondName)
    );
}

export function useRegisteredOptions(
  authRequests: AuthRequest[],
  isEnabled: boolean
) {
  const [registeredOptions, setRegisteredOptions] = useState<
    RegisteredOption[]
  >([]);
  const [newFacilityName, setNewFacilityName] = useState("");
  const [newInsuranceName, setNewInsuranceName] = useState("");
  const [newWebPortalName, setNewWebPortalName] = useState("");
  const [isLoadingRegisteredOptions, setIsLoadingRegisteredOptions] =
    useState(false);
  const [registeredOptionsError, setRegisteredOptionsError] = useState<
    string | null
  >(null);
  const [savingCategory, setSavingCategory] =
    useState<RegisteredOptionCategory | null>(null);
  const [deletingOptionId, setDeletingOptionId] = useState<number | null>(
    null
  );

  useEffect(() => {
    let isMounted = true;

    if (!isEnabled) {
      setRegisteredOptions([]);
      setIsLoadingRegisteredOptions(false);
      setRegisteredOptionsError(null);

      return () => {
        isMounted = false;
      };
    }

    async function loadOptions() {
      setIsLoadingRegisteredOptions(true);
      setRegisteredOptionsError(null);

      try {
        const options = await fetchRegisteredOptions();

        if (isMounted) {
          setRegisteredOptions(options);
        }
      } catch (error) {
        if (isMounted) {
          setRegisteredOptionsError(
            error instanceof Error
              ? error.message
              : "Unable to load registered options."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingRegisteredOptions(false);
        }
      }
    }

    void loadOptions();

    return () => {
      isMounted = false;
    };
  }, [isEnabled]);

  const registeredFacilities = useMemo(
    () => optionNames(registeredOptions, "facility"),
    [registeredOptions]
  );

  const registeredInsurances = useMemo(
    () => optionNames(registeredOptions, "insurance"),
    [registeredOptions]
  );

  const registeredWebPortals = useMemo(
    () => optionNames(registeredOptions, "web_portal"),
    [registeredOptions]
  );

  const facilityOptions = useMemo(() => {
    const uniqueFacilities = Array.from(
      new Set(
        [
          ...registeredFacilities,
          ...authRequests.map((item) => item.facility),
        ].filter(Boolean)
      )
    ).sort((firstName, secondName) =>
      firstName.localeCompare(secondName)
    );

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
    ).sort((firstName, secondName) =>
      firstName.localeCompare(secondName)
    );

    return ["All", ...uniqueInsurances];
  }, [authRequests, registeredInsurances]);

  const addOption = async (
    category: RegisteredOptionCategory,
    name: string,
    clearName: () => void
  ) => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return;
    }

    setSavingCategory(category);
    setRegisteredOptionsError(null);

    try {
      const createdOption = await createRegisteredOption(
        category,
        trimmedName
      );

      setRegisteredOptions((currentOptions) => [
        ...currentOptions,
        createdOption,
      ]);
      clearName();
    } catch (error) {
      setRegisteredOptionsError(
        error instanceof Error
          ? error.message
          : "Unable to create registered option."
      );
    } finally {
      setSavingCategory(null);
    }
  };

  const removeOption = async (
    category: RegisteredOptionCategory,
    name: string
  ) => {
    const option = registeredOptions.find(
      (currentOption) =>
        currentOption.category === category &&
        currentOption.name === name
    );

    if (!option) {
      setRegisteredOptionsError("Registered option not found.");
      return;
    }

    if (option.is_protected) {
      setRegisteredOptionsError(
        "Protected registered options cannot be deleted."
      );
      return;
    }

    setDeletingOptionId(option.id);
    setRegisteredOptionsError(null);

    try {
      await deleteRegisteredOption(option.id);

      setRegisteredOptions((currentOptions) =>
        currentOptions.filter(
          (currentOption) => currentOption.id !== option.id
        )
      );
    } catch (error) {
      setRegisteredOptionsError(
        error instanceof Error
          ? error.message
          : "Unable to delete registered option."
      );
    } finally {
      setDeletingOptionId(null);
    }
  };

  const handleAddFacility = async () => {
    await addOption(
      "facility",
      newFacilityName,
      () => setNewFacilityName("")
    );
  };

  const handleRemoveFacility = async (facility: string) => {
    await removeOption("facility", facility);
  };

  const handleAddInsurance = async () => {
    await addOption(
      "insurance",
      newInsuranceName,
      () => setNewInsuranceName("")
    );
  };

  const handleRemoveInsurance = async (insurance: string) => {
    await removeOption("insurance", insurance);
  };

  const handleAddWebPortal = async () => {
    await addOption(
      "web_portal",
      newWebPortalName,
      () => setNewWebPortalName("")
    );
  };

  const handleRemoveWebPortal = async (portal: string) => {
    await removeOption("web_portal", portal);
  };

  const isProtectedOption = (
    category: RegisteredOptionCategory,
    name: string
  ): boolean =>
    registeredOptions.some(
      (option) =>
        option.category === category &&
        option.name === name &&
        option.is_protected
    );

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
    isLoadingRegisteredOptions,
    registeredOptionsError,
    savingCategory,
    deletingOptionId,
    isProtectedOption,
    handleAddFacility,
    handleRemoveFacility,
    handleAddInsurance,
    handleRemoveInsurance,
    handleAddWebPortal,
    handleRemoveWebPortal,
  };
}