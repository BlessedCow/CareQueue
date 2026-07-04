import { useState } from 'react';

import {
    createAuthRequest,
    deleteAuthRequest,
    updateAuthRequest,
    type CreateAuthRequestPayload,
  } from '../api/authStatus';
import type { AuthRequest } from '../types/auth';
import type { NewAuthFormState } from './useAuthorizationForm';

function buildAuthorizationPayload(form: NewAuthFormState): CreateAuthRequestPayload {
  return {
    client_name: form.clientName,
    facility: form.facility,
    loc: form.loc,
    status: form.status,
    auth_start_date: form.startDate,
    auth_end_date: form.endDate,
    review_due_date: form.reviewDueDate,
    requested_days: Number(form.requestedDays) || 0,
    approved_days: Number(form.approvedDays) || 0,
    insurance: form.insurance,
    auth_type: form.authType,
    submission_method: form.submissionMethod,
    phone_number: form.phoneNumber,
    phone_extension: form.phoneExtension,
    fax_number: form.faxNumber,
    web_portal: form.webPortal,
    web_portal_url: form.webPortalUrl,
    has_care_manager: form.hasCareManager,
    care_manager_name: form.careManagerName,
    care_manager_contact_type: form.careManagerContactType,
    care_manager_phone: form.careManagerPhone,
    care_manager_fax: form.careManagerFax,
    care_manager_notes: form.careManagerNotes,
  };
}

interface SaveAuthorizationArgs {
  editingAuthId: string | null;
  form: NewAuthFormState;
}

export function useAuthorizationMutations() {
  const [isCreatingAuth, setIsCreatingAuth] = useState(false);
  const [deletingAuthId, setDeletingAuthId] = useState<string | null>(null);

  const saveAuthorization = async ({
    editingAuthId,
    form,
  }: SaveAuthorizationArgs): Promise<AuthRequest> => {
    setIsCreatingAuth(true);

    try {
      const payload = buildAuthorizationPayload(form);

      if (editingAuthId) {
        return await updateAuthRequest(editingAuthId, payload);
      }

      return await createAuthRequest(payload);
    } finally {
      setIsCreatingAuth(false);
    }
  };

  const removeAuthorization = async (auth: AuthRequest) => {
    setDeletingAuthId(auth.id);

    try {
      await deleteAuthRequest(auth.id);
    } finally {
      setDeletingAuthId(null);
    }
  };

  return {
    isCreatingAuth,
    deletingAuthId,
    saveAuthorization,
    removeAuthorization,
  };
}