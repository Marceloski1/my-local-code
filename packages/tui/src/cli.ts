#!/usr/bin/env node

import { spawn, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Check if Node.js version is >= 20
 */
function checkNodeVersion(): boolean {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0], 10);

  if (major < 20) {
    console.error(`❌ Error: Node.js version ${version} is not supported.`);
    console.error(`   This application requires Node.js >= 20.`);
    console.error(`   Please upgrade Node.js: https://nodejs.org/`);
    return false;
  }

  return true;
}

/**
 * Wait for server to be ready by checking /health endpoint
 */
async function waitForServer(maxWaitMs: number = 30000): Promise<boolean> {
  const startTime = Date.now();
  const checkInterval = 500; // Check every 500ms

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const response = await fetch('http://localhost:4096/health', {
        signal: AbortSignal.timeout(1000),
      });

      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Server not ready yet, continue waiting
    }

    // Wait before next check
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  return false;
}

/**
 * Start the server process
 */
function startServer(): ChildProcess {
  // Use pnpm to run the server dev script from the root
  const serverProcess = spawn('pnpm', ['--filter', '@agent/server', 'dev'], {
    stdio: 'inherit',
    shell: true,
    cwd: join(__dirname, '../../..'), // Go to root directory
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'development',
    },
  });

  return serverProcess;
}

/**
 * Start the TUI process
 */
function startTUI(): ChildProcess {
  // Use pnpm to run the TUI dev script from the root
  const tuiProcess = spawn('pnpm', ['--filter', '@agent/tui', 'dev'], {
    stdio: 'inherit',
    shell: true,
    cwd: join(__dirname, '../../..'), // Go to root directory
  });

  return tuiProcess;
}

/**
 * Main CLI wrapper
 */
async function main() {
  // Check Node version
  if (!checkNodeVersion()) {
    process.exit(1);
  }

  console.log('🚀 Iniciando Agent TUI...\n');

  // Start server
  console.log('📡 Iniciando servidor...');
  const serverProcess = startServer();

  // Handle server crash
  serverProcess.on('exit', code => {
    if (code !== 0 && code !== null) {
      console.error(`\n❌ El servidor se cerró inesperadamente con código ${code}`);
      process.exit(1);
    }
  });

  // Wait for server to be ready
  console.log('⏳ Esperando a que el servidor esté listo...');
  const serverReady = await waitForServer(30000);

  if (!serverReady) {
    console.error('\n❌ Error: El servidor no respondió en 30 segundos');
    console.error('   Verifica que Ollama esté corriendo: ollama serve');
    serverProcess.kill('SIGTERM');
    process.exit(1);
  }

  console.log('✅ Servidor listo\n');

  // Start TUI
  console.log('🖥️  Iniciando interfaz...\n');
  const tuiProcess = startTUI();

  // Handle TUI exit
  tuiProcess.on('exit', code => {
    console.log('\n👋 Cerrando aplicación...');

    // Send SIGTERM to server for graceful shutdown
    serverProcess.kill('SIGTERM');

    // Wait a bit for graceful shutdown
    setTimeout(() => {
      // Force kill if still running
      if (!serverProcess.killed) {
        serverProcess.kill('SIGKILL');
      }
      process.exit(code || 0);
    }, 2000);
  });

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n\n👋 Cerrando aplicación...');

    // Kill both processes
    tuiProcess.kill('SIGTERM');
    serverProcess.kill('SIGTERM');

    setTimeout(() => {
      process.exit(0);
    }, 2000);
  });
}

main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
