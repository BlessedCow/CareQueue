import { useState } from 'react';

import type { AuthRequest } from '../types/auth';

export interface NewAuthFormState {
  clientName: string;
  facility: string;
  loc: string;
  status: string;
  startDate: string;
  endDate: string;
  reviewDueDate: string;
  requestedDays: string;
  approvedDays: string;
  insurance: string;
  authType: string;
  submissionMethod: string;
  phoneNumber: string;
  phoneExtension: string;
  faxNumber: string;
  webPortal: string;
  webPortalUrl: string;
  hasCareManager: boolean;
  careManagerName: string;
  careManagerContactType: string;
  careManagerPhone: string;
  careManagerFax: string;
  careManagerNotes: string;
}

export const DEFAULT_AUTH_FORM: NewAuthFormState = {
  clientName: '',
  facility: '',
  loc: '',
  status: 'Pending',
  startDate: '',
  endDate: '',
  reviewDueDate: '',
  requestedDays: '',
  approvedDays: '',
  insurance: '',
  authType: 'Initial',
  submissionMethod: '',
  phoneNumber: '',
  phoneExtension: '',
  faxNumber: '',
  webPortal: '',
  webPortalUrl: '',
  hasCareManager: false,
  careManagerName: '',
  careManagerContactType: '',
  careManagerPhone: '',
  careManagerFax: '',
  careManagerNotes: '',
};

export function getAuthFormFromAuth(auth: AuthRequest): NewAuthFormState {
  return {
    clientName: auth.patientId,
    facility: auth.facility,
    loc: auth.loc,
    status: auth.status,
    startDate: auth.dateStr || '',
    endDate: auth.authEndDate ?? '',
    reviewDueDate: auth.reviewDueDate ?? '',
    requestedDays: String(auth.requestedDays ?? ''),
    approvedDays: String(auth.approvedDays ?? ''),
    insurance: auth.payer,
    authType: auth.authType ?? 'Initial',
    submissionMethod: auth.submissionMethods ?? '',
    phoneNumber: '',
    phoneExtension: '',
    faxNumber: '',
    webPortal: '',
    webPortalUrl: '',
    hasCareManager: false,
    careManagerName: '',
    careManagerContactType: '',
    careManagerPhone: '',
    careManagerFax: '',
    careManagerNotes: '',
  };
}

export function getConcurrentAuthFormFromCurrentForm(
  currentForm: NewAuthFormState,
): NewAuthFormState {
  return {
    ...currentForm,
    status: 'Pending',
    authType: 'Concurrent',
    startDate: '',
    endDate: '',
    reviewDueDate: '',
    requestedDays: '',
    approvedDays: '',
  };
}

export function useAuthorizationForm() {
  const [newAuthForm, setNewAuthForm] = useState<NewAuthFormState>(DEFAULT_AUTH_FORM);

  const resetNewAuthForm = () => {
    setNewAuthForm(DEFAULT_AUTH_FORM);
  };

  const handleNewAuthFieldChange = (
    field: keyof NewAuthFormState,
    value: string | boolean,
  ) => {
    setNewAuthForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const loadAuthIntoForm = (auth: AuthRequest) => {
    setNewAuthForm(getAuthFormFromAuth(auth));
  };

  const loadConcurrentAuthForm = () => {
    setNewAuthForm((currentForm) => getConcurrentAuthFormFromCurrentForm(currentForm));
  };

  return {
    newAuthForm,
    setNewAuthForm,
    resetNewAuthForm,
    handleNewAuthFieldChange,
    loadAuthIntoForm,
    loadConcurrentAuthForm,
  };
}