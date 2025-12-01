// ESM Loader für Jest
export async function resolve(specifier, context, defaultResolve) {
  return defaultResolve(specifier, context);
}

export async function getFormat(url, context, defaultGetFormat) {
  if (url.endsWith(".js")) {
    return { format: "module" };
  }
  return defaultGetFormat(url, context);
}
