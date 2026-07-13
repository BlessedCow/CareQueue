# Disclaimer

CareQueue is an early-stage, local-first workflow prototype for tracking utilization review authorization activity, authorization status, review dates, payer communication details, and related dashboard metrics.

This project is not medical advice, legal advice, billing advice, clinical guidance, compliance guidance, or a substitute for payer verification.

## Not a Production Healthcare System

CareQueue is not currently designed, certified, audited, or represented as a production-ready healthcare system.

CareQueue should not be treated as a HIPAA-compliant platform without additional review, safeguards, policies, access controls, encryption review, backup controls, organizational approval, legal review, and compliance evaluation.

Security features in this repository may reduce certain risks, but they do not create HIPAA compliance on their own.

## Administrative Workflow Only

CareQueue is intended to support administrative workflow tracking.

It does not provide:

- Medical advice
- Diagnosis
- Treatment recommendations
- Clinical decision-making
- Medical necessity determinations
- Legal or compliance determinations
- Billing advice
- Payer coverage guarantees

Authorization statuses, payer decisions, review requirements, and coverage details should be verified directly with the relevant payer or authorized source.

## PHI/PII Warning

CareQueue may be used to enter or process information that resembles protected health information, personally identifiable information, payer information, authorization details, or care coordination notes.

Do not commit, publish, upload, or share real PHI/PII, including but not limited to:

- Client or patient names
- Member IDs
- Group numbers
- Dates of birth
- Phone numbers
- Fax numbers
- Clinical notes
- Authorization numbers tied to identifiable people
- Facility-specific private data
- Payer communication details tied to identifiable people
- Database files
- SQLCipher database files
- Backup files
- Restored database files
- Environment files
- Encryption keys
- API keys
- Screenshots containing private information

Use fake or clearly anonymized data for examples, tests, screenshots, issues, and documentation.

## Encryption and Security Limitations

CareQueue includes security features such as field-level encryption, optional SQLCipher database encryption, encrypted backups, user authentication, role-based access controls, session handling, and audit logging.

These features help reduce certain local development risks, but they do not guarantee compliance with any legal, regulatory, organizational, contractual, payer-specific, or security framework requirement.

Security features do not replace:

- Formal compliance review
- Organizational approval
- Written policies and procedures
- Workforce training
- Device security
- Secure deployment architecture
- Secure key management
- Secure backup retention policies
- Access reviews
- Incident response planning
- Business associate agreements, where required
- Legal or compliance review

If an encryption key is lost, encrypted records or backups may become unreadable. If an encryption key is exposed with the related database or backup file, encrypted data may be decryptable.

## Local Use Only

CareQueue is currently intended for private local development and testing.

Any use with real healthcare, patient, client, payer, facility, employer, or operational data should occur only after appropriate authorization, compliance review, security controls, and organizational approval are in place.

## No Warranty

This project is provided as-is, without warranty of any kind.

The author makes no guarantees regarding accuracy, security, reliability, availability, compliance, fitness for a particular purpose, suitability for healthcare operations, or correctness of authorization tracking information.

## Limitation of Liability

Use of this project is at your own risk. The author is not responsible for claims, damages, losses, privacy incidents, compliance failures, payer disputes, operational errors, or other liabilities arising from use, modification, deployment, or distribution of this software.