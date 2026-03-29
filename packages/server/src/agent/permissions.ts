/**
 * Check if a tool requires permission in plan mode
 */
export function requiresPermissionInPlanMode(toolName: string): boolean {
  const destructiveTools = new Set(['write_file', 'edit_file', 'bash']);
  return destructiveTools.has(toolName);
}

/**
 * Build a permission request message
 */
export function buildPermissionRequest(toolName: string, args: Record<string, unknown>): string {
  const argsStr = JSON.stringify(args, null, 2);
  return `The agent wants to execute: ${toolName}(${argsStr})\n\nDo you approve? (yes/no)`;
}

/**
 * Check if a response is a permission grant
 */
export function isPermissionGranted(response: string): boolean {
  const normalized = response.toLowerCase().trim();
  return (
    normalized === 'yes' ||
    normalized === 'y' ||
    normalized.startsWith('yes') ||
    normalized.startsWith('sí') ||
    normalized === 'si'
  );
}
