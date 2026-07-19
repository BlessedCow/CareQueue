# Roadmap

CareQueue is an actively developed local-first utilization review workflow prototype. This roadmap is not a guarantee of future functionality, but it outlines the current direction of the project.

## Current Focus

CareQueue is currently focused on strengthening the local application foundation:

- Safer handling of sensitive workflow data
- Clearer authorization tracking
- Authentication and role-aware access
- Auditability of important actions
- Encrypted local storage and backups
- Better documentation for setup, safety, and maintenance

## Recently Completed

- FastAPI backend API
- React/Vite frontend dashboard
- Authorization dashboard
- Authorization table with filtering and pagination
- Calendar workflow view
- Settings page for registered facilities, insurances, portals, and dashboard cards
- Authorization create/edit workflows
- Authorization timeline events
- Continued stay / level-of-care workflow support
- Patient identity fields
- Field-level encryption for selected sensitive fields
- Argon2id password hashing
- Login, logout, and session restore
- Role-based access controls
- Audit logging for security and authorization actions
- Encrypted backup and safe restore scripts
- Safer database path handling
- Optional SQLCipher database encryption
- SQLCipher migration, verification, and cutover scripts
- Public project documentation updates

## Near-Term Priorities

### Security and privacy

- Improve PHI-safe backend error handling
- Improve user-facing error messages without exposing sensitive details
- Add safer logging patterns
- Review audit metadata coverage
- Add audit log review tooling
- Add admin user management tooling
- Improve documentation for key handling, backups, and restores

### Workflow and usability

- Improve authorization form validation
- Improve empty states and loading states
- Improve calendar event clarity
- Improve review-date and status transition guidance
- Improve read-only views
- Add better dashboard explanations and tooltips
- Continue simplifying continued stay / LOC workflows

### Data management

- Improve backup and restore documentation
- Add clearer SQLCipher setup and rollback documentation
- Add safer local database maintenance notes
- Improve seed/demo data workflows
- Continue reducing risk of accidental sensitive data exposure

### Testing and code quality

- Expand backend route coverage
- Expand audit logging tests
- Expand SQLCipher and backup safety tests
- Add frontend tests when the frontend structure stabilizes
- Keep changes small, focused, and easy to review

## Longer-Term Ideas

These are possible future directions and may change as the project evolves.

### Authorization workflow improvements

- Better payer contact tracking
- Better portal tracking
- Better authorization follow-up queues
- More detailed denial and appeal tracking
- More structured P2P tracking
- More structured discharge/completed workflow handling
- Improved reporting by facility, payer, level of care, and status

### PDF and document assistance

- Local-only PDF parsing experiments
- Extract selected authorization workflow fields from uploaded PDFs
- Avoid cloud OCR or telemetry-based extraction tools for sensitive documents
- Encrypt extracted sensitive fields before storage
- Require clear user review before saving extracted data

### Administration

- Admin user management page
- Password reset or password change workflow
- Session management tools
- Audit log filtering and export controls
- Local backup management UI

### Deployment readiness research

CareQueue is not currently production-ready. Future production-readiness research may include:

- HTTPS/TLS deployment configuration
- Production secret management
- External identity provider integration
- Stronger access review processes
- Backup retention policies
- Incident response planning
- Logging and monitoring review
- Compliance and legal review requirements

## Out of Scope for Now

The following are not current priorities:

- Public hosted deployment
- Multi-tenant SaaS behavior
- Replacing payer portals
- Making medical necessity determinations
- Providing clinical recommendations
- Providing legal, billing, or compliance advice
- Handling real PHI/PII without appropriate approval and safeguards

## Documentation Plans

Additional documentation may be added under `docs/`, including:

- Sanitized screenshots
- Setup walkthroughs
- Workflow explanations
- Backup and restore guides
- SQLCipher setup notes
- Security and privacy implementation notes

All documentation examples should use fake or clearly anonymized data.