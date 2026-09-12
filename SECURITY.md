# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| `main` branch | yes |

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

1. Open a **private** security advisory on GitHub (Repository → Security → Advisories), or
2. Contact the maintainers via the channel listed in [SUPPORT.md](SUPPORT.md).

Include steps to reproduce, impact, and affected versions if known.

## Secrets and Deployment

- Never commit `backend/.env`, `deploy/config.env`, API keys, or JWT secrets.
- Use `backend/.env.example` as a template only.
- Rotate `JWT_SECRET` and AI provider keys if they were ever exposed.

Before pushing to a public remote, run:

```powershell
powershell -NoProfile -File scripts/publish-security-check.ps1
```

See [docs/GITHUB_PUBLISH.md](docs/GITHUB_PUBLISH.md) for the full publish checklist.
