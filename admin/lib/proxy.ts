export function rewriteAdminApiPath(path: string): string {
  return path.replace(/^\/admin-api(?=\/|$)/, '/admin/api');
}
