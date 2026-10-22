# CLI release procedure

The CLI has its own manifest, lockfile, build and package. Web and CLI validation
are independent; release checks must cover both. No default test calls a provider.

## Prepare and verify

1. Confirm a clean checkout and choose an unused version with `npm view
   modelcheck-cli version dist-tags --json`. Update `cli/package.json`, its
   lockfile and `MODELCHECK_VERSION` together. Review the changelog and launch copy.
2. In `cli/`, run `npm ci`, `npm run lint`, `npm test` and `npm run test:package`.
   CI repeats this on Node 20/22/24. The package test installs only production
   dependencies from the actual tarball into a temporary directory and checks
   the public CLI through offline PASS/FAIL verdicts.
3. At the repository root, run `npm ci`, `npm run lint`, `npx next typegen`,
   `npx tsc --noEmit` and `npm run build`. Check the corresponding GitHub CI run.
4. Use `npm pack --pack-destination /absolute/release-directory` in `cli/`.
   `prepack` compiles the CLI and copies the canonical guide into
   `dist/docs/project-regression.md`. Inspect the file inventory and test that
   tarball. Never include private cases, credentials, locks or run evidence.
5. Use `npm publish /absolute/release-directory/modelcheck-cli-VERSION.tgz
   --dry-run --access public` to review publication without uploading. Record
   the tarball SHA-256; publish exactly the reviewed tarball.

`prepublishOnly` runs validation for directory publication. Publishing a prebuilt
tarball does not provide that gate, so the steps above are mandatory. Generated
package guides are build artifacts; edit their canonical source in docs/.

## Publish and launch

After the release candidate is approved, verify the intended npm identity with
`npm whoami`, then publish the exact reviewed tarball with `--access public` and
the intended dist-tag (`latest` for the approved 0.2.0 release). Complete any npm
2FA requirement interactively; never place authentication material in scripts or
Git. npm versions are immutable, so a failed release needs a new version rather
than an overwritten tarball.

Verify `npm view modelcheck-cli@VERSION version dist.integrity --json` and do a
clean registry install. Only then update the public site's npm-version claim,
change the release notes from candidate to published, tag the reviewed commit,
and create the GitHub release with the reviewed notes. Publishing/deploying and
public announcements are explicit release actions, not effects of local checks.

Keep live-provider experiments separate from automated release tests. Record real
results and limitations before making performance claims. If release validation
fails, repair the candidate and repeat the affected checks before publication.
