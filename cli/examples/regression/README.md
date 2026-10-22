# Offline first verdict

These responses are synthetic software fixtures, not measured model results.
They match the case created by `modelcheck init --yes`.

In a fresh project directory, after installing the prepared package:

```sh
modelcheck init --yes
# Set PACKAGE to the installation path returned by npm root -g, plus /modelcheck-cli.
modelcheck baseline --offline --responses "$PACKAGE/examples/regression/pass.jsonl"
modelcheck verify --offline --responses "$PACKAGE/examples/regression/pass.jsonl"
modelcheck verify --offline --responses "$PACKAGE/examples/regression/fail.jsonl"
```

The matching response produces PASS (exit 0). The changed response produces FAIL
(exit 1). No key or provider call is involved. To create a real baseline, replace
the example cases with application cases, configure the target, set its key in
the environment, and run `modelcheck baseline --force` without `--offline`.
