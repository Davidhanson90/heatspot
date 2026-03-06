# Contributing

Thanks for contributing to `heatspot`.

## Requirements

- Node.js 18+
- npm 9+

## Setup

```bash
npm install
```

## Development Workflow

1. Create a branch for your change.
2. Implement changes in `src/` and update harness examples if behavior changes.
3. Add or update tests in `src/index.spec.ts` where applicable.
4. Run verification:

```bash
npm run build:verify
```

5. Check package output:

```bash
npm run pack:check
```

## Pull Request Checklist

- [ ] Tests pass (`npm run test`)
- [ ] Build passes (`npm run build`)
- [ ] Packaging dry-run looks correct (`npm run pack:check`)
- [ ] Documentation updated (`README.md`, this file, or `AGENTS.md` if needed)
