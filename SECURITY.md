# Security Policy

## Supported Versions

chunker-studio is pre-1.0 and under active development. Security fixes are
applied to the latest released version only. Please upgrade to the newest
release before reporting an issue.

| Version | Supported |
| ------- | --------- |
| latest  | ✅        |
| < latest | ❌       |

## Reporting a Vulnerability

**Please do not open a public issue for security vulnerabilities.**

Report privately via GitHub's
[Private Vulnerability Reporting](https://github.com/DaveSalazar/chunker-studio/security/advisories/new)
(Security tab → "Report a vulnerability"). If that is unavailable, email
the maintainer at salazardave93@gmail.com with `[SECURITY] chunker-studio`
in the subject.

Please include:

- Affected version / commit
- A description of the issue and its impact
- Reproduction steps or a proof of concept
- Any suggested remediation

## Response Expectations

This is a volunteer-maintained open-source project. Best-effort targets:

- **Acknowledgement:** within 7 days
- **Initial assessment:** within 14 days
- **Fix or mitigation plan:** communicated after triage, prioritized by severity

We will coordinate a disclosure timeline with you and credit you in the
release notes unless you prefer to remain anonymous.

## Scope Notes

chunker-studio is a desktop application that parses untrusted input
documents (PDF, DOCX, etc.). Reports of particular interest:

- Parser exploits leading to code execution or path traversal
  (`mammoth`, `pdfjs-dist`, file/IPC handling)
- Electron sandbox / context-isolation escapes
- Supply-chain issues in dependencies or the release pipeline

Out of scope: vulnerabilities in third-party services, social engineering,
and issues requiring an already-compromised local machine.
