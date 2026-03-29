import { resolve, relative, normalize } from 'node:path';

const WORKSPACE_ROOT = process.cwd();

export interface PathValidationResult {
  valid: boolean;
  fullPath?: string;
  error?: string;
}

/**
 * Validate that a user-provided path is within the workspace
 * Prevents path traversal attacks
 */
export function validatePath(userPath: string): PathValidationResult {
  // Normalize the path to handle different separators
  const normalized = normalize(userPath);

  // Reject paths with explicit traversal
  if (normalized.includes('..')) {
    return { valid: false, error: 'Path traversal (..) not allowed' };
  }

  // Resolve to absolute path
  const fullPath = resolve(WORKSPACE_ROOT, normalized);

  // Check if the resolved path is within workspace
  const relativePath = relative(WORKSPACE_ROOT, fullPath);

  // If relative path starts with .., it's outside workspace
  if (relativePath.startsWith('..')) {
    return { valid: false, error: 'Path outside workspace not allowed' };
  }

  // On Windows, check if path is on a different drive
  if (process.platform === 'win32') {
    const workspaceDrive = WORKSPACE_ROOT.split(':')[0];
    const targetDrive = fullPath.split(':')[0];
    if (workspaceDrive !== targetDrive) {
      return { valid: false, error: 'Path on different drive not allowed' };
    }
  }

  // Additional check for absolute paths that don't start with workspace
  if (fullPath.startsWith('/') && !fullPath.startsWith(WORKSPACE_ROOT)) {
    return { valid: false, error: 'Absolute path outside workspace not allowed' };
  }

  return { valid: true, fullPath };
}

/**
 * Get the workspace root directory
 */
export function getWorkspaceRoot(): string {
  return WORKSPACE_ROOT;
}
