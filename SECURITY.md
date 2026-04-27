# Security Policy

## Supported versions

Only the latest released version of OpenD6 Space receives security fixes.
The system is designed for the current stable Foundry VTT (v14) line.

## Reporting a vulnerability

If you believe you have found a security vulnerability — whether a code
flaw, a dependency CVE that affects this system, or a runtime issue that
could harm a Foundry world — please report it privately rather than
opening a public issue.

**Preferred channels (any of):**

- GitHub: open a private security advisory at
  <https://github.com/Jan-Ka/foundryvtt-opend6-space/security/advisories/new>.
  This is the most reliable channel and the response stays threaded.
Please include:

- A description of the issue and the impact you observed.
- Steps to reproduce, or a minimal proof-of-concept.
- The version of the system, Foundry, and any relevant modules.

We aim to acknowledge reports within 7 days and to ship a fix or
mitigation within 30 days for actionable vulnerabilities. Coordinated
disclosure is welcome.

## Out of scope

- Vulnerabilities in Foundry VTT core or third-party modules (please
  report those to their respective maintainers).
- Issues that depend on a malicious GM or world owner — Foundry's trust
  model already grants those roles full control.
