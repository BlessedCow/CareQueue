# Contributing to CareQueue

Thank you for your interest in contributing to CareQueue.

CareQueue is a workflow and authorization tracking project focused on utilization review operations, authorization status tracking, facility workflows, payer communication, and related dashboard tooling.

## Project status

CareQueue is actively being developed. The project structure, naming, and workflows may change as the application matures.

Contributions are welcome, but please keep in mind that this project is still evolving and changes should stay focused, clean, and easy to review.

## Ways to contribute

You can contribute by:

- Reporting bugs
- Suggesting improvements
- Improving documentation
- Adding or improving tests
- Refactoring existing code for clarity
- Improving frontend usability
- Improving backend validation, API behavior, or data handling

## Before contributing

Before opening a pull request, please:

1. Check the existing issues and pull requests.
2. Keep the change focused on one clear improvement.
3. Avoid including real patient, client, facility, payer, or employer data.
4. Avoid committing secrets, credentials, `.env` files, database files, exports, logs, screenshots with private information, or other sensitive material.

## Privacy and data safety

CareQueue is intended to support healthcare-related workflow tracking, so privacy matters.

Do not submit:

- Protected health information
- Real patient or client names
- Real dates of service tied to identifiable people
- Real insurance member IDs
- Real authorization numbers
- Real facility data that is not public
- Login credentials
- API keys
- Internal employer documents
- Screenshots containing private or sensitive information

Use fake or clearly anonymized test data when examples are needed.

## Development setup

Clone the repository:

```bash
git clone https://github.com/BlessedCow/CareQueue.git
cd CareQueue
```

Install dependencies for the part of the project you are working on.

For the frontend:

```bash
cd frontend
npm install
npm run dev
```

For the backend, use the setup instructions in the project README if available.

## Code style

Please keep code readable, typed where practical, and consistent with the surrounding files.

General expectations:

- Use clear names.
- Keep changes small and focused.
- Avoid unrelated formatting churn.
- Avoid adding unnecessary dependencies.
- Prefer straightforward solutions over clever abstractions.
- Add tests when changing behavior.
- Update documentation when behavior or setup instructions change.

## Testing

Before opening a pull request, run the relevant checks for the files you changed.

Frontend checks may include:

```bash
npm run lint
npm run build
```

Backend checks may include:

```bash
python -m pytest
python -m ruff check . --fix
```

Some commands may change as the project evolves. Check the README and package configuration for the current commands.

## Pull request guidelines

When opening a pull request:

1. Describe what changed.
2. Explain why the change was made.
3. Mention any manual testing performed.
4. Link related issues when applicable.
5. Include screenshots for UI changes when helpful, using only fake or sanitized data.

A good pull request should be easy to review and should not mix unrelated changes.

## Commit messages

Use clear commit messages that describe the change.

Examples:

```text
Add authorization delete confirmation
Improve facility form validation
Fix dashboard loading state
Update frontend environment example
```

## Issues

When reporting a bug, please include:

- What happened
- What you expected to happen
- Steps to reproduce the issue
- Relevant error messages
- Browser or environment details, if applicable
- Screenshots only if they do not contain private information

When suggesting a feature, please include:

- The workflow problem it solves
- The expected behavior
- Any edge cases worth considering

## Security concerns

Please do not open a public issue for security concerns, exposed secrets, or privacy risks involving sensitive information.

Instead, contact the repository owner privately when possible.

## License

By contributing to CareQueue, you agree that your contributions will be licensed under the license included in this repository.
