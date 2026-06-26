import type { FormEvent } from 'react';
import { cn } from '../utils/cn';

function formatPhoneNumber(value: string) {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
  
    if (digitsOnly.length <= 3) {
      return digitsOnly;
    }
  
    if (digitsOnly.length <= 6) {
      return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3)}`;
    }
  
    return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
  }

  interface NewAuthFormState {
    clientName: string;
    facility: string;
    loc: string;
    status: string;
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

interface AddAuthorizationFormProps {
  form: NewAuthFormState;
  darkMode: boolean;
  isCreatingAuth: boolean;
  submitLabel: string;
  registeredFacilities: string[];
  registeredInsurances: string[];
  registeredWebPortals: string[];
  onFieldChange: (field: keyof NewAuthFormState, value: string | boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}

export function AddAuthorizationForm({
  form,
  darkMode,
  isCreatingAuth,
  submitLabel,
  registeredFacilities,
  registeredInsurances,
  registeredWebPortals,
  onFieldChange,
  onSubmit,
  onCancel,
}: AddAuthorizationFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        'mb-5 grid gap-4 rounded-lg border p-4 md:grid-cols-2',
        darkMode ? 'border-gray-800 bg-gray-950/60' : 'border-gray-200 bg-gray-50',
      )}
    >
      <label className="space-y-1 text-sm">
        <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Client Name</span>
        <input
          type="text"
          value={form.clientName}
          onChange={(event) => onFieldChange('clientName', event.target.value)}
          className={cn(
            'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500',
            darkMode ? 'border-gray-700 bg-gray-900 text-gray-100' : 'border-gray-300 bg-white text-gray-900',
          )}
        />
      </label>

      <label className="space-y-1 text-sm">
        <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Facility</span>
        <select
          value={form.facility}
          onChange={(event) => onFieldChange('facility', event.target.value)}
          className={cn(
            'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500',
            darkMode ? 'border-gray-700 bg-gray-900 text-gray-100' : 'border-gray-300 bg-white text-gray-900',
          )}
        >
          {registeredFacilities.map((facility) => (
            <option key={facility} value={facility}>
              {facility}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1 text-sm">
        <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>LOC</span>
        <select
            value={form.loc}
            onChange={(event) => onFieldChange('loc', event.target.value)}
            className={cn(
            'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500',
            darkMode ? 'border-gray-700 bg-gray-900 text-gray-100' : 'border-gray-300 bg-white text-gray-900',
            )}
        >
            <option value="DTX">DTX</option>
            <option value="RTC">RTC</option>
            <option value="PHP">PHP</option>
            <option value="IOP">IOP</option>
        </select>
        </label>

        <label className="space-y-1 text-sm">
        <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Status</span>
        <select
            value={form.status}
            onChange={(event) => onFieldChange('status', event.target.value)}
            className={cn(
            'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500',
            darkMode ? 'border-gray-700 bg-gray-900 text-gray-100' : 'border-gray-300 bg-white text-gray-900',
            )}
        >
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Denied">Denied</option>
            <option value="Needs Review">Needs Review</option>
        </select>
        </label>

        <label className="space-y-1 text-sm">
        <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Days Requested</span>
        <input
            type="number"
            min="0"
            value={form.requestedDays}
            onChange={(event) => onFieldChange('requestedDays', event.target.value)}
            className={cn(
            'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500',
            darkMode ? 'border-gray-700 bg-gray-900 text-gray-100' : 'border-gray-300 bg-white text-gray-900',
            )}
        />
        </label>

        <label className="space-y-1 text-sm">
        <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Days Approved</span>
        <input
            type="number"
            min="0"
            value={form.approvedDays}
            onChange={(event) => onFieldChange('approvedDays', event.target.value)}
            className={cn(
            'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500',
            darkMode ? 'border-gray-700 bg-gray-900 text-gray-100' : 'border-gray-300 bg-white text-gray-900',
            )}
        />
        </label>

        <label className="space-y-1 text-sm">
        <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Insurance</span>
        <select
            value={form.insurance}
            onChange={(event) => onFieldChange('insurance', event.target.value)}
            className={cn(
            'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500',
            darkMode ? 'border-gray-700 bg-gray-900 text-gray-100' : 'border-gray-300 bg-white text-gray-900',
            )}
        >
            {registeredInsurances.map((insurance) => (
            <option key={insurance} value={insurance}>
                {insurance}
            </option>
            ))}
        </select>
        </label>

        <label className="space-y-1 text-sm">
        <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Auth Type</span>
        <select
            value={form.authType}
            onChange={(event) => onFieldChange('authType', event.target.value)}
            className={cn(
            'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500',
            darkMode ? 'border-gray-700 bg-gray-900 text-gray-100' : 'border-gray-300 bg-white text-gray-900',
            )}
        >
            <option value="Initial">Initial</option>
            <option value="Concurrent">Concurrent</option>
            <option value="Retro">Retro</option>
        </select>
        </label>

      <label className="space-y-1 text-sm">
        <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Submission Method</span>
        <select
          value={form.submissionMethod}
          onChange={(event) => onFieldChange('submissionMethod', event.target.value)}
          className={cn(
            'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500',
            darkMode ? 'border-gray-700 bg-gray-900 text-gray-100' : 'border-gray-300 bg-white text-gray-900',
          )}
        >
          <option value="Web Portal">Web Portal</option>
          <option value="Live Call">Live Call</option>
          <option value="Voicemail">Voicemail</option>
          <option value="Fax">Fax</option>
        </select>
      </label>

      {(form.submissionMethod === 'Live Call' || form.submissionMethod === 'Voicemail') && (
        <>
          <label className="space-y-1 text-sm">
            <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Phone Number</span>
            <input
            type="tel"
            inputMode="numeric"
            maxLength={12}
            value={form.phoneNumber}
            onChange={(event) => onFieldChange('phoneNumber', formatPhoneNumber(event.target.value))}
            placeholder="123-456-7890"
            className={cn(
                'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500',
                darkMode ? 'border-gray-700 bg-gray-900 text-gray-100' : 'border-gray-300 bg-white text-gray-900',
            )}
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Extension</span>
            <input
              type="text"
              value={form.phoneExtension}
              onChange={(event) => onFieldChange('phoneExtension', event.target.value)}
              className={cn(
                'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500',
                darkMode ? 'border-gray-700 bg-gray-900 text-gray-100' : 'border-gray-300 bg-white text-gray-900',
              )}
            />
          </label>
        </>
      )}

      {form.submissionMethod === 'Fax' && (
        <label className="space-y-1 text-sm md:col-span-2">
          <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Fax Number</span>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={12}
            value={form.faxNumber}
            onChange={(event) => onFieldChange('faxNumber', formatPhoneNumber(event.target.value))}
            placeholder="123-456-7890"
            className={cn(
                'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500',
                darkMode ? 'border-gray-700 bg-gray-900 text-gray-100' : 'border-gray-300 bg-white text-gray-900',
            )}
          />
        </label>
      )}

      {form.submissionMethod === 'Web Portal' && (
        <>
          <label className="space-y-1 text-sm">
            <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Portal</span>
            <select
              value={form.webPortal}
              onChange={(event) => onFieldChange('webPortal', event.target.value)}
              className={cn(
                'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500',
                darkMode ? 'border-gray-700 bg-gray-900 text-gray-100' : 'border-gray-300 bg-white text-gray-900',
              )}
            >
              {registeredWebPortals.map((portal) => (
                <option key={portal} value={portal}>
                  {portal}
                </option>
              ))}
              <option value="Other">Other</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Portal Link</span>
            <input
              type="url"
              value={form.webPortalUrl}
              onChange={(event) => onFieldChange('webPortalUrl', event.target.value)}
              placeholder={form.webPortal === 'Other' ? 'Enter new portal link' : 'Optional portal link'}
              className={cn(
                'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500',
                darkMode ? 'border-gray-700 bg-gray-900 text-gray-100' : 'border-gray-300 bg-white text-gray-900',
              )}
            />
          </label>
        </>
      )}
      
      <div className={cn('space-y-4 rounded-lg border p-4 md:col-span-2', darkMode ? 'border-gray-800 bg-gray-950/40' : 'border-gray-200 bg-white')}>
        <label className="flex items-center gap-2 text-sm">
            <input
            type="checkbox"
            checked={form.hasCareManager}
            onChange={(event) => onFieldChange('hasCareManager', event.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
            />
            <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
            Add Care Team / Care Manager details
            </span>
        </label>

        {form.hasCareManager && (
            <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
                <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Care Manager Name</span>
                <input
                type="text"
                value={form.careManagerName}
                onChange={(event) => onFieldChange('careManagerName', event.target.value)}
                className={cn(
                    'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500',
                    darkMode ? 'border-gray-700 bg-gray-900 text-gray-100' : 'border-gray-300 bg-white text-gray-900',
                )}
                />
            </label>

            <label className="space-y-1 text-sm">
                <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Preferred Contact Method</span>
                <select
                value={form.careManagerContactType}
                onChange={(event) => onFieldChange('careManagerContactType', event.target.value)}
                className={cn(
                    'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500',
                    darkMode ? 'border-gray-700 bg-gray-900 text-gray-100' : 'border-gray-300 bg-white text-gray-900',
                )}
                >
                <option value="Phone">Phone</option>
                <option value="Fax">Fax</option>
                </select>
            </label>

            {form.careManagerContactType === 'Phone' && (
                <label className="space-y-1 text-sm">
                <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Care Manager Phone</span>
                <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={12}
                    value={form.careManagerPhone}
                    onChange={(event) => onFieldChange('careManagerPhone', formatPhoneNumber(event.target.value))}
                    placeholder="123-456-7890"
                    className={cn(
                    'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500',
                    darkMode ? 'border-gray-700 bg-gray-900 text-gray-100' : 'border-gray-300 bg-white text-gray-900',
                    )}
                />
                </label>
            )}

            {form.careManagerContactType === 'Fax' && (
                <label className="space-y-1 text-sm">
                <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Care Manager Fax</span>
                <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={12}
                    value={form.careManagerFax}
                    onChange={(event) => onFieldChange('careManagerFax', formatPhoneNumber(event.target.value))}
                    placeholder="123-456-7890"
                    className={cn(
                    'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500',
                    darkMode ? 'border-gray-700 bg-gray-900 text-gray-100' : 'border-gray-300 bg-white text-gray-900',
                    )}
                />
                </label>
            )}

            <label className="space-y-1 text-sm md:col-span-2">
                <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Care Manager Notes</span>
                <textarea
                value={form.careManagerNotes}
                onChange={(event) => onFieldChange('careManagerNotes', event.target.value)}
                placeholder="Example: Leave clinicals as voicemail, fax concurrent review, ask for reviewer extension..."
                rows={3}
                className={cn(
                    'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500',
                    darkMode ? 'border-gray-700 bg-gray-900 text-gray-100 placeholder-gray-500' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400',
                )}
                />
            </label>
            </div>
        )}
        </div>

      <div className="flex items-end justify-end gap-2 md:col-span-2">
        <button
          type="button"
          onClick={onCancel}
          className={cn(
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            darkMode
              ? 'bg-gray-800 text-gray-200 hover:bg-gray-700'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300',
          )}
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isCreatingAuth}
          className={cn(
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-70',
            darkMode
              ? 'bg-blue-600 text-white hover:bg-blue-500'
              : 'bg-blue-600 text-white hover:bg-blue-700',
          )}
        >
          {isCreatingAuth ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}