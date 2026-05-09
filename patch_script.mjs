#!/usr/bin/env node

/**
 * Script para aplicar alterações de Worker Processes ao build Insomnia
 * 
 * Uso:
 *   node apply-modifications.mjs <path-to-asar-extracted>
 * 
 * Exemplo:
 *   node apply-modifications.mjs /Applications/Insomnia.app/Contents/Resources/asarextraido
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================================
// WORKER PROCESS TEMPLATES
// ============================================================================

const WORKER_PROCESSES = {
  'lint-process.mjs': `/* eslint-disable no-undef */
console.log('[lint-process] Lint worker started');
import fs from 'node:fs';

import Spectral from '@stoplight/spectral-core';
import { bundleAndLoadRuleset } from '@stoplight/spectral-ruleset-bundler/with-loader';
import { oas } from '@stoplight/spectral-rulesets';
import spectralRuntime from '@stoplight/spectral-runtime';
process.on('uncaughtException', error => {
  console.error(error);
});

process.parentPort.on('message', async ({ data: { documentContent, rulesetPath } }) => {
  let hasValidCustomRuleset = false;
  if (rulesetPath) {
    try {
      (await fs.promises.stat(rulesetPath)).isFile();
      hasValidCustomRuleset = true;
    } catch {}
  }
  try {
    const spectral = new Spectral.Spectral();
    const { fetch } = spectralRuntime;
    const ruleset = hasValidCustomRuleset ? await bundleAndLoadRuleset(rulesetPath, { fs, fetch }) : oas;
    spectral.setRuleset(ruleset);
    console.log('[lint-process] Ruleset loaded:', rulesetPath || 'default OAS ruleset');
    const diagnostics = await spectral.run(documentContent);
    process.parentPort.postMessage({ diagnostics });
  } catch (err) {
    process.parentPort.postMessage({ error: err.message });
  }
});
`,

  'mock-generation-process.mjs': `/* eslint-disable no-undef */
console.log('[mock-generation-process] Mock generation worker started');

process.on('uncaughtException', error => {
  console.error('[mock-generation-process] Uncaught exception:', error);
  process.parentPort.postMessage({ error: error.message });
});

process.parentPort.on(
  'message',
  async ({
    data: {
      openApiSpec,
      specUrl,
      specText,
      modelConfig,
      useDynamicMockResponses,
      mockServerAdditionalFiles,
      aiPluginName,
    },
  }) => {
    try {
      let routes;

      if (openApiSpec) {
        const { generateMockRouteDataFromOpenAPISpec } = await import(aiPluginName);
        routes = await generateMockRouteDataFromOpenAPISpec(openApiSpec, modelConfig, {
          additionalFiles: mockServerAdditionalFiles,
          useDynamicMockResponses: useDynamicMockResponses,
        });
      } else if (specUrl) {
        const { generateMockRouteDataFromUrl } = await import(aiPluginName);
        routes = await generateMockRouteDataFromUrl(specUrl, modelConfig, {
          additionalFiles: mockServerAdditionalFiles,
          useDynamicMockResponses: useDynamicMockResponses,
        });
      } else if (specText) {
        const { generateMockRouteDataFromText } = await import(aiPluginName);
        routes = await generateMockRouteDataFromText(specText, modelConfig, {
          additionalFiles: mockServerAdditionalFiles,
          useDynamicMockResponses: useDynamicMockResponses,
        });
      } else {
        const errorMessage = 'No spec source was provided';
        console.error('[mock-generation-process]', errorMessage);
        process.parentPort.postMessage({ error: errorMessage });
        return;
      }

      console.log('[mock-generation-process] Successfully generated routes');
      process.parentPort.postMessage({ routes });
    } catch (error) {
      const errorMessage = 'Failed to generate mock routes: ' + error.message;
      console.error('[mock-generation-process]', errorMessage);
      process.parentPort.postMessage({ error: errorMessage });
    }
  }
);
`,

  'git-commit-generation-process.mjs': `/* eslint-disable no-undef */
console.log('[git-commit-generation-process] Mock generation worker started');

process.on('uncaughtException', error => {
  console.error('[git-commit-generation-process] Uncaught exception:', error);
  process.parentPort.postMessage({ error: error.message });
});

process.parentPort.on('message', async ({ data: { input, modelConfig, aiPluginName } }) => {
  try {
    const { generateCommitsFromDiff } = await import(aiPluginName);
    const commits = await generateCommitsFromDiff(input, modelConfig);

    console.log('[git-commit-generation-process] Successfully generated routes');
    process.parentPort.postMessage({ commits });
  } catch (error) {
    const errorMessage = 'Failed to generate git commits: ' + error.message;
    console.error('[git-commit-generation-process]', errorMessage);
    process.parentPort.postMessage({ error: errorMessage });
  }
});
`,

  'mcp-generate-sampling-response.mjs': `/* eslint-disable no-undef */
console.log('[mcp-generate-sampling-response-process] Sampling response generation worker started');

process.on('uncaughtException', error => {
  console.error('[mcp-generate-sampling-response-process] Uncaught exception:', error);
  process.parentPort.postMessage({ error: error.message });
});

process.parentPort.on('message', async ({ data: { messages, systemPrompt, modelConfig, aiPluginName } }) => {
  try {
    const { generateMcpSamplingResponse } = await import(aiPluginName);
    const response = await generateMcpSamplingResponse(messages, systemPrompt, modelConfig);
    console.log('[mcp-generate-sampling-response-process] Successfully generating sampling responses');
    process.parentPort.postMessage(response);
  } catch (error) {
    const errorMessage = 'Failed to generate mcp sampling response: ' + error.message;
    console.error('[mcp-generate-sampling-response-process]', errorMessage);
    process.parentPort.postMessage({ error: errorMessage });
  }
});
`,
};

// ============================================================================
// IPC HANDLER TEMPLATES
// ============================================================================

const IPC_HANDLERS = {
  lintSpec: {
    marker: '"lintSpec"',
    searchMarker: 'ipcMainHandle("lintSpec"',
    code: `ipcMainHandle("lintSpec", async (_2, options) => {
    const { documentContent, rulesetPath } = options;
    return new Promise((resolve3, reject2) => {
      if (lintProcess) {
        lintProcess.kill();
      }
      lintProcess = import_electron55.utilityProcess.fork(import_node_path32.default.join(__dirname, "main/lint-process.mjs"));
      let process6 = lintProcess;
      process6.on("exit", (code) => {
        console.log("[lint-process] exited with code:", code);
        resolve3({ cancelled: true });
      });
      process6.on("message", (msg) => {
        resolve3(msg);
        process6?.kill();
        process6 = null;
      });
      process6.on("error", (err2) => {
        console.error("[lint-process] error:", err2);
        reject2({ error: err2.toString() });
      });
      process6.postMessage({ documentContent, rulesetPath });
    });
  });`,
  },
  generateMockRouteDataFromSpec: {
    marker: '"generateMockRouteDataFromSpec"',
    searchMarker: 'ipcMainHandle("generateMockRouteDataFromSpec"',
    code: `ipcMainHandle(
    "generateMockRouteDataFromSpec",
    async (_2, openApiSpec, specUrl, specText, modelConfig, useDynamicMockResponses, mockServerAdditionalFiles) => {
      const settings2 = await services.settings.getOrCreate();
      for (const filePath of mockServerAdditionalFiles) {
        const { isAllowed, securedPath } = isPathAllowed(filePath, settings2.dataFolders);
        if (!isAllowed) {
          return { error: cannotAccessPathError(securedPath), routes: [] };
        }
      }
      return new Promise((resolve3, reject2) => {
        const process6 = import_electron55.utilityProcess.fork(import_node_path32.default.join(__dirname, "main/mock-generation-process.mjs"));
        process6.on("exit", (code) => {
          console.log("[mock-generation-process] exited with code:", code);
          let errorMessage;
          const signals = import_node_os8.default.constants.signals;
          if (code === 0) {
            errorMessage = "Mock generation process exited with code 0.";
          } else if (code === signals.SIGSEGV) {
            errorMessage = \`Mock generation process crashed with a segmentation fault (SIGSEGV). This may be due to system compatibility when running a GGUF model.\`;
          } else if (code === signals.SIGKILL) {
            errorMessage = \`Mock generation process was killed (SIGKILL). This may be due to memory limits or system resources.\`;
          } else if (code === signals.SIGTERM) {
            errorMessage = \`Mock generation process was terminated (SIGTERM).\`;
          } else if (code === signals.SIGABRT) {
            errorMessage = \`Mock generation process aborted (SIGABRT). This usually indicates an internal error.\`;
          } else {
            errorMessage = \`Mock generation process exited unexpectedly with code \${code}.\`;
          }
          resolve3({ error: errorMessage, routes: [] });
        });
        process6.on("message", (msg) => {
          console.log("[mock-generation-process] received message");
          resolve3(msg);
          process6.kill();
        });
        process6.on("error", (err2) => {
          console.error("[mock-generation-process] error:", err2);
          reject2({ error: err2.toString() });
        });
        process6.postMessage({
          openApiSpec,
          specUrl,
          specText,
          modelConfig,
          useDynamicMockResponses,
          mockServerAdditionalFiles,
          aiPluginName: AI_PLUGIN_NAME
        });
      });
    }
  );`,
  },
  generateCommitsFromDiff: {
    marker: '"generateCommitsFromDiff"',
    searchMarker: 'ipcMainHandle("generateCommitsFromDiff"',
    code: `ipcMainHandle("generateCommitsFromDiff", async (_2, input) => {
    return new Promise(async (resolve3, reject2) => {
      const modelConfig = await getCurrentConfig();
      if (!modelConfig) {
        reject2(new Error("No LLM model configured"));
      }
      const process6 = import_electron55.utilityProcess.fork(import_node_path32.default.join(__dirname, "main/git-commit-generation-process.mjs"));
      process6.on("exit", (code) => {
        console.log("[git-commit-generation-process] exited with code:", code);
        let errorMessage;
        const signals = import_node_os8.default.constants.signals;
        if (code === 0) {
          errorMessage = "Git commit generation process exited with code 0.";
        } else if (code === signals.SIGSEGV) {
          errorMessage = \`Git commit generation process crashed with a segmentation fault (SIGSEGV). This may be due to system compatibility when running a GGUF model.\`;
        } else if (code === signals.SIGKILL) {
          errorMessage = \`Git commit generation process was killed (SIGKILL). This may be due to memory limits or system resources.\`;
        } else if (code === signals.SIGTERM) {
          errorMessage = \`Git commit generation process was terminated (SIGTERM).\`;
        } else if (code === signals.SIGABRT) {
          errorMessage = \`Git commit generation process aborted (SIGABRT). This usually indicates an internal error.\`;
        } else {
          errorMessage = \`Git commit generation process exited unexpectedly with code \${code}.\`;
        }
        resolve3({ error: errorMessage });
      });
      process6.on("message", (msg) => {
        console.log("[git-commit-generation-process] received message");
        resolve3(msg);
        process6.kill();
      });
      process6.on("error", (err2) => {
        console.error("[git-commit-generation-process] error:", err2);
        reject2({ error: err2.toString() });
      });
      process6.postMessage({
        input,
        modelConfig,
        aiPluginName: AI_PLUGIN_NAME
      });
    });
  });`,
  },
  generateMcpSamplingResponse: {
    marker: '"generateMcpSamplingResponse"',
    searchMarker: 'ipcMainHandle("generateMcpSamplingResponse"',
    code: `ipcMainHandle("generateMcpSamplingResponse", async (_2, input) => {
    return new Promise(async (resolve3, reject2) => {
      const modelConfig = await getCurrentConfig();
      if (!modelConfig) {
        reject2(new Error("No LLM model configured"));
      }
      const process6 = import_electron55.utilityProcess.fork(import_node_path32.default.join(__dirname, "main/mcp-generate-sampling-response.mjs"));
      process6.on("exit", (code) => {
        console.log("[mcp-generate-sampling-response-process] exited with code:", code);
        let errorMessage;
        const signals = import_node_os8.default.constants.signals;
        if (code === 0) {
          errorMessage = "MCP sampling response generation process exited with code 0.";
        } else if (code === signals.SIGSEGV) {
          errorMessage = \`MCP sampling response generation process crashed with a segmentation fault (SIGSEGV). This may be due to system compatibility when running a GGUF model.\`;
        } else if (code === signals.SIGKILL) {
          errorMessage = \`MCP sampling response generation process was killed (SIGKILL). This may be due to memory limits or system resources.\`;
        } else if (code === signals.SIGTERM) {
          errorMessage = \`MCP sampling response generation process was terminated (SIGTERM).\`;
        } else if (code === signals.SIGABRT) {
          errorMessage = \`MCP sampling response generation process aborted (SIGABRT). This usually indicates an internal error.\`;
        } else {
          errorMessage = \`MCP sampling response generation process exited unexpectedly with code \${code}.\`;
        }
        resolve3({ error: errorMessage });
      });
      process6.on("message", (msg) => {
        console.log("[mcp-generate-sampling-response-process] received message");
        resolve3(msg);
        process6.kill();
      });
      process6.on("error", (err2) => {
        console.error("[mcp-generate-sampling-response-process] error:", err2);
        reject2({ error: err2.toString() });
      });
      process6.postMessage({
        ...input,
        aiPluginName: AI_PLUGIN_NAME
      });
    });
  });`,
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function log(message, type = 'info') {
  const prefix = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warning: '⚠️',
  }[type] || '•';
  console.log(`${prefix} ${message}`);
}

function checkIfHandlerExists(content, handlerName) {
  return content.includes(`ipcMainHandle("${handlerName}"`);
}

function addWorkerProcesses(asarPath) {
  const mainDir = path.join(asarPath, 'main');
  
  if (!fs.existsSync(mainDir)) {
    fs.mkdirSync(mainDir, { recursive: true });
    log(`Created directory: ${mainDir}`, 'success');
  }

  for (const [filename, content] of Object.entries(WORKER_PROCESSES)) {
    const filepath = path.join(mainDir, filename);
    
    if (fs.existsSync(filepath)) {
      log(`Worker already exists: ${filename}`, 'warning');
    } else {
      fs.writeFileSync(filepath, content, 'utf8');
      log(`Created worker process: ${filename}`, 'success');
    }
  }
}

function updateEntryMainJs(asarPath) {
  const entryFile = path.join(asarPath, 'entry.main.min.js');
  
  if (!fs.existsSync(entryFile)) {
    log(`entry.main.min.js not found at ${entryFile}`, 'error');
    return false;
  }

  let content = fs.readFileSync(entryFile, 'utf8');
  let modified = false;

  for (const [handlerName, handlerConfig] of Object.entries(IPC_HANDLERS)) {
    if (checkIfHandlerExists(content, handlerName)) {
      log(`Handler already exists: ${handlerName}`, 'warning');
    } else {
      // Find a good insertion point (after last ipcMainHandle)
      const lastHandleIndex = content.lastIndexOf('ipcMainHandle');
      if (lastHandleIndex !== -1) {
        // Find the end of the last handler (look for closing ");")
        const endIndex = content.indexOf(');', lastHandleIndex) + 3;
        if (endIndex > 2) {
          content = content.slice(0, endIndex) + '\n  ' + handlerConfig.code + content.slice(endIndex);
          log(`Added IPC handler: ${handlerName}`, 'success');
          modified = true;
        }
      }
    }
  }

  if (modified) {
    fs.writeFileSync(entryFile, content, 'utf8');
    log(`Updated entry.main.min.js`, 'success');
  }

  return modified;
}

function verifyModifications(asarPath) {
  log('\n=== VERIFICATION ===\n', 'info');
  
  const mainDir = path.join(asarPath, 'main');
  let allGood = true;

  // Check worker processes
  for (const filename of Object.keys(WORKER_PROCESSES)) {
    const filepath = path.join(mainDir, filename);
    if (fs.existsSync(filepath)) {
      log(`✓ Worker process found: ${filename}`, 'success');
    } else {
      log(`✗ Worker process missing: ${filename}`, 'error');
      allGood = false;
    }
  }

  // Check entry.main.min.js
  const entryFile = path.join(asarPath, 'entry.main.min.js');
  if (fs.existsSync(entryFile)) {
    const content = fs.readFileSync(entryFile, 'utf8');
    for (const handlerName of Object.keys(IPC_HANDLERS)) {
      if (checkIfHandlerExists(content, handlerName)) {
        log(`✓ IPC handler found: ${handlerName}`, 'success');
      } else {
        log(`✗ IPC handler missing: ${handlerName}`, 'warning');
      }
    }
  } else {
    log(`entry.main.min.js not found`, 'error');
    allGood = false;
  }

  return allGood;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    log('Usage: node apply-modifications.mjs <path-to-asar-extracted>', 'error');
    log('Example: node apply-modifications.mjs /Applications/Insomnia.app/Contents/Resources/asarextraido', 'info');
    process.exit(1);
  }

  const asarPath = path.resolve(args[0]);

  if (!fs.existsSync(asarPath)) {
    log(`Path does not exist: ${asarPath}`, 'error');
    process.exit(1);
  }

  log(`\n=== INSOMNIA BUILD MODIFIER ===\n`, 'info');
  log(`Target: ${asarPath}\n`, 'info');

  try {
    log('Step 1: Adding worker processes...', 'info');
    addWorkerProcesses(asarPath);

    log('\nStep 2: Updating entry.main.min.js...', 'info');
    updateEntryMainJs(asarPath);

    log('\nStep 3: Verifying modifications...', 'info');
    const allGood = verifyModifications(asarPath);

    if (allGood) {
      log('\n✅ All modifications applied successfully!', 'success');
    } else {
      log('\n⚠️ Some modifications could not be applied. Please check the output above.', 'warning');
    }

    log('\nNext steps:', 'info');
    log('1. If you modified entry.main.min.js, you need to rebuild the asar file:', 'info');
    log('   asar pack <extracted-folder> app.asar', 'info');
    log('2. Replace the original asar file with the new one', 'info');
  } catch (error) {
    log(`Error: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

main();
