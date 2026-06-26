# Disclaimer

CareQueue is an early stage local first workflow prototype for tracking utilization review authorization activity and related dashboard metrics.

This project is not medical advice, legal advice, billing advice, clinical guidance, or compliance guidance.

## Not a Production Healthcare System

CareQueue is not currently designed, certified, audited, or represented as a production ready healthcare system. It should not be treated as a HIPAA compliant platform without additional review, safeguards, policies, access controls, audit logging, encryption review, backup controls, organizational approval, and legal/compliance evaluation.

## PHI/PII Warning

CareQueue may be used to enter or process information that resembles protected health information, personally identifiable information, payer information, authorization details, or care coordination notes.

Do not commit, publish, upload, or share real PHI/PII, including but not limited to:

- Client or patient names
- Member IDs
- Dates of birth
- Phone numbers
- Fax numbers
- Clinical notes
- Facility specific private data
- Insurance authorization details tied to an identifiable person
- Database files
- Backup files
- Environment files or encryption keys

## Encryption Limitations

CareQueue includes field level encryption for selected sensitive fields. This helps reduce the risk of plaintext sensitive data being stored locally, but it does not guarantee compliance with any legal, regulatory, organizational, contractual, or payer specific requirements.

Encryption does not replace:

- Access controls
- User authentication
- Audit logs
- Device security
- Secure backup policies
- Key management policies
- Workforce training
- Formal compliance review
- Organizational approval

If the encryption key is lost, encrypted records may become unreadable. If the encryption key is exposed along with the database, encrypted records may be decryptable.

## Local Use Only

CareQueue is currently intended for private local development and testing. Any use with real healthcare data should only occur after appropriate authorization, compliance review, and security controls are in place.

## No Warranty

This project is provided as-is, without warranty of any kind. The author makes no guarantees regarding accuracy, security, reliability, availability, compliance, fitness for a particular purpose, or suitability for use in healthcare operations.
