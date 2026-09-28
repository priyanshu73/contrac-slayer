# Repository workflow

## Branch policy

- `dev` is the integration branch for all code, documentation, configuration, and agent-authored changes.
- Start work from an up-to-date `origin/dev`, and commit and push changes to `dev` first.
- When a push target is not explicitly specified, use `dev`.
- Do not push directly to `main` unless the user explicitly requests a production promotion after the change has been pushed to and verified on `dev`.
- Promote changes to `main` by merging `dev` through the repository's normal review or pull-request process.
