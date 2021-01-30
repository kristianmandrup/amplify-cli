import * as fs from 'fs-extra';
import * as yargs from 'yargs';
import * as path from 'path';
import { isCI } from 'ci-info';
import {
  $TSContext,
  CLIContextEnvironmentProvider,
  FeatureFlags,
  pathManager,
  stateManager,
  exitOnNextTick,
  TeamProviderInfoMigrateError,
  JSONValidationError,
} from 'amplify-cli-core';
import { Input } from './domain/input';
import { getPluginPlatform, scan } from './plugin-manager';
import { getCommandLineInput, verifyInput } from './input-manager';
import { constructContext, persistContext, attachUsageData } from './context-manager';
import { print } from './context-extensions';
import { executeCommand } from './execution-manager';
import { Context } from './domain/context';
import { constants } from './domain/constants';
import { checkProjectConfigVersion } from './project-config-version-check';
import { notify } from './version-notifier';

export { constructContext };

// Adjust defaultMaxListeners to make sure Inquirer will not fail under Windows because of the multiple subscriptions
// https://github.com/SBoudrias/Inquirer.js/issues/887
import { EventEmitter } from 'events';
import { rewireDeprecatedCommands } from './rewireDeprecatedCommands';
import { ensureMobileHubCommandCompatibility } from './utils/mobilehub-support';
import { migrateTeamProviderInfo } from './utils/team-provider-migrate';
import { deleteOldVersion } from './utils/win-utils';
import { logInput } from './conditional-local-logging-init';

EventEmitter.defaultMaxListeners = 1000;

function getContexts(pluginPlatform, input, context) {
  try {
    const { getAmplifyRcFilePath } = context.pathManager;
    const contextsFilePath = getAmplifyRcFilePath()
    const content = fs.readFileSync(contextsFilePath, 'utf-8');
    if (content) {
      const json = JSON.parse(content);
      const contextPaths = json.contextPaths || [];
      return contextPaths.map(projectPath => {
        input.options.projectPath = projectPath;
        input.options.contextType = 'multi';
        return constructContext(pluginPlatform, input)
      })
    }
  } catch {
    return null;
  }
}

// entry from commandline
export async function run() {
  let errorHandler = (e: Error) => {};
  try {
    deleteOldVersion();

    let pluginPlatform = await getPluginPlatform();
    let input: any = getCommandLineInput(pluginPlatform);
    // with non-help command supplied, give notification before execution
    if (input.command !== 'help') {
      // Checks for available update, defaults to a 1 day interval for notification
      notify({ defer: false, isGlobal: true });
    }

    ensureFilePermissions(pathManager.getAWSCredentialsFilePath());
    ensureFilePermissions(pathManager.getAWSConfigFilePath());

    let verificationResult = verifyInput(pluginPlatform, input);

    // invalid input might be because plugin platform might have been updated,
    // scan and try again
    if (!verificationResult.verified) {
      if (verificationResult.message) {
        print.warning(verificationResult.message);
      }
      pluginPlatform = await scan();
      input = getCommandLineInput(pluginPlatform);
      verificationResult = verifyInput(pluginPlatform, input);
    }
    if (!verificationResult.verified) {
      if (verificationResult.helpCommandAvailable) {
        input.command = constants.HELP;
      } else {
        throw new Error(verificationResult.message);
      }
    }

    rewireDeprecatedCommands(input);
    logInput(input);

    const prjPath = input.options.projectPath;
    const projectPath = prjPath || (pathManager.findProjectRoot() ?? process.cwd());

    const context = constructContext(pluginPlatform, input);

    // Initialize feature flags
    const contextEnvironmentProvider = new CLIContextEnvironmentProvider({
      getEnvInfo: context.amplify.getEnvInfo,
    });

    // process.chdir(projectPath);
    const contexts = getContexts(pluginPlatform, input, context) || [context]

    const useNewDefaults = !stateManager.projectConfigExists(projectPath);

    await FeatureFlags.initialize(contextEnvironmentProvider, useNewDefaults);

    await attachUsageData(context);

    if (!(await migrateTeamProviderInfo(context))) {
      context.usageData.emitError(new TeamProviderInfoMigrateError());
      return 1;
    }
    errorHandler = boundErrorHandler.bind(context);
    process.on('SIGINT', sigIntHandler.bind(context));

    await checkProjectConfigVersion(context);

    context.usageData.emitInvoke();

    // For mobile hub migrated project validate project and command to be executed
    if (!ensureMobileHubCommandCompatibility((context as unknown) as $TSContext)) {
      // Double casting until we have properly typed context
      return 1;
    }

    for (let context of contexts) {
      if (context.contextType === 'multi' && !context.domain) {
        throw 'Invalid context - missing domain'
      }
      await executeCommand(context);
    };

    const exitCode = process.exitCode || 0;

    if (exitCode === 0) {
      context.usageData.emitSuccess();
    }

    persistContext(context);

    // no command supplied defaults to help, give update notification at end of execution
    if (input.command === 'help') {
      // Checks for available update, defaults to a 1 day interval for notification
      notify({ defer: true, isGlobal: true });
    }

    return exitCode;
  } catch (error) {
    // ToDo: add logging to the core, and log execution errors using the unified core logging.
    errorHandler(error);

    if (error.name === 'JSONValidationError') {
      const jsonError = <JSONValidationError>error;
      let printSummary = false;

      print.error(error.message);

      if (jsonError.unknownFlags?.length > 0) {
        print.error('');
        print.error(
          `These feature flags are defined in the "amplify/cli.json" configuration file and are unknown to the currently running Amplify CLI:`,
        );

        for (const unknownFlag of jsonError.unknownFlags) {
          print.error(`  - ${unknownFlag}`);
        }

        printSummary = true;
      }

      if (jsonError.otherErrors?.length > 0) {
        print.error('');
        print.error(`The following feature flags have validation errors:`);

        for (const otherError of jsonError.otherErrors) {
          print.error(`  - ${otherError}`);
        }

        printSummary = true;
      }

      if (printSummary) {
        print.error('');
        print.error(
          `This issue likely happens when the project has been pushed with a newer version of Amplify CLI, try updating to a newer version.`,
        );

        if (isCI) {
          print.error('');
          print.error(`Ensure that the CI/CD pipeline is not using an older or pinned down version of Amplify CLI.`);
        }

        print.error('');
        print.error(`Learn more about feature flags: https://docs.amplify.aws/cli/reference/feature-flags`);
      }
    } else {
      if (error.message) {
        print.error(error.message);
      }
      if (error.stack) {
        print.info(error.stack);
      }
    }
    exitOnNextTick(1);
  }
}

function ensureFilePermissions(filePath) {
  // eslint-disable-next-line no-bitwise
  if (fs.existsSync(filePath) && (fs.statSync(filePath).mode & 0o777) === 0o644) {
    fs.chmodSync(filePath, '600');
  }
}

function boundErrorHandler(this: Context, e: Error) {
  this.usageData.emitError(e);
}

async function sigIntHandler(this: Context, e: any) {
  this.usageData.emitAbort();
  try {
    await this.amplify.runCleanUpTasks(this);
  } catch (err) {
    this.print.warning(`Could not run clean up tasks\nError: ${err.message}`);
  }
  this.print.warning('^Aborted!');
  exitOnNextTick(2);
}

// entry from library call
export async function execute(input: Input): Promise<number> {
  let errorHandler = (e: Error) => {};
  try {
    let pluginPlatform = await getPluginPlatform();
    let verificationResult = verifyInput(pluginPlatform, input);

    if (!verificationResult.verified) {
      if (verificationResult.message) {
        print.warning(verificationResult.message);
      }
      pluginPlatform = await scan();
      verificationResult = verifyInput(pluginPlatform, input);
    }

    if (!verificationResult.verified) {
      if (verificationResult.helpCommandAvailable) {
        input.command = constants.HELP;
      } else {
        throw new Error(verificationResult.message);
      }
    }

    const context = await constructContext(pluginPlatform, input);
    await attachUsageData(context);
    errorHandler = boundErrorHandler.bind(context);
    process.on('SIGINT', sigIntHandler.bind(context));
    context.usageData.emitInvoke();
    await executeCommand(context);
    const exitCode = process.exitCode || 0;
    if (exitCode === 0) {
      context.usageData.emitSuccess();
    }
    persistContext(context);
    return exitCode;
  } catch (e) {
    // ToDo: add logging to the core, and log execution errors using the unified core logging.
    errorHandler(e);
    if (e.message) {
      print.error(e.message);
    }
    if (e.stack) {
      print.info(e.stack);
    }
    return 1;
  }
}

export async function executeAmplifyCommand(context: Context) {
  if (context.input.command) {
    const commandPath = path.normalize(path.join(__dirname, 'commands', context.input.command));
    const commandModule = await import(commandPath);
    await commandModule.run(context);
  }
}
