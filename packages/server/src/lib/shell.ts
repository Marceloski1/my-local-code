import { execSync } from 'node:child_process';
import { platform } from 'node:process';

export interface ShellConfig {
  path: string;
  args: string[];
}

/**
 * Detecta el shell disponible en el sistema.
 * Windows: pwsh → powershell → cmd
 * Linux: bash → sh
 */
export function detectShell(): ShellConfig {
  if (platform === 'win32') {
    // Windows: try pwsh first, then powershell, then cmd
    if (findExecutable('pwsh')) {
      return { path: 'pwsh', args: ['-NoProfile', '-Command'] };
    }
    if (findExecutable('powershell')) {
      return { path: 'powershell', args: ['-NoProfile', '-Command'] };
    }
    return { path: 'cmd.exe', args: ['/C'] };
  }

  // Linux/macOS: try bash first, then sh
  if (findExecutable('bash')) {
    return { path: 'bash', args: ['-c'] };
  }
  return { path: 'sh', args: ['-c'] };
}

/**
 * Checks if an executable exists in PATH
 */
function findExecutable(name: string): boolean {
  try {
    if (platform === 'win32') {
      // Windows: use 'where' command
      execSync(`where ${name}`, { stdio: 'pipe', encoding: 'utf-8' });
    } else {
      // Unix: use 'which' command
      execSync(`which ${name}`, { stdio: 'pipe', encoding: 'utf-8' });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets shell info for system prompt
 */
export function getShellInfo(): { os: string; shell: string } {
  const shellConfig = detectShell();
  const shellName = shellConfig.path.split(/[/\\]/).pop() || 'unknown';

  return {
    os: platform === 'win32' ? 'Windows' : platform === 'darwin' ? 'macOS' : 'Linux',
    shell: shellName,
  };
}
