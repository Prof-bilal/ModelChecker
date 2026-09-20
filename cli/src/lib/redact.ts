/** Replace known credential values in text before it reaches logs or artefacts. */
export function redactSecrets(value: string, secrets: Iterable<string> = knownCredentials()): string {
  let result = value;
  for (const secret of secrets) {
    if (secret.length > 0) result = result.split(secret).join("[REDACTED]");
  }
  return result;
}

export function knownCredentials(env: NodeJS.ProcessEnv = process.env): string[] {
  return Object.entries(env)
    .filter(([name, value]) => /key|token|secret|password/i.test(name) && value !== undefined)
    .map(([, value]) => value as string)
    .filter((value) => value.length > 0);
}
