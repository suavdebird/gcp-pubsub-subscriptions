import {
  getInput,
  info as logInfo,
  setFailed,
  setOutput,
  warning as logWarning,
} from '@actions/core';
import { getExecOutput } from '@actions/exec';
import {
  errorMessage,
  isPinnedToHead,
  KVPair,
  parseKVString,
  pinnedToHeadWarning,
} from '@google-github-actions/actions-utils';
import { authenticateGcloudSDK, getToolCommand } from '@google-github-actions/setup-cloud-sdk';
import { SubscriptionResponse } from './models/subscriptionResponse';
// import { SubscriptionRequest, mapToSubscriptionRequest } from './models/subscriptionRequest';
// import { TopicRequest } from './models/topicRequest';

export interface SyncPubSubOutputs {
  done: boolean;
}

/**
 * Executes the main action. It includes the main business logic and is the
 * primary entry point. It is documented inline.
 */
export async function run(): Promise<void> {
  if (isPinnedToHead()) {
    logWarning(pinnedToHeadWarning('v1'));
  }

  try {
    const projectId = getInput('project_id', { required: true });
    const clientName = getInput('client_name', { required: true });
    // const pushAuthServiceAccount = getInput('push_auth_service_account', { required: true });
    // const pushAuthTokenAudience = getInput('push_auth_token_audience', { required: true });
    // const ackDeadline = getInput('ack_deadline', { required: true });
    // const minRetryDelay = getInput('min_retry_delay', { required: true });
    // const maxRetryDelay = getInput('max_retry_delay', { required: true });
    // const maxDeliveryAttempts = getInput('max_delivery_attempts', { required: true });
    const subscriptions = getInput('subscriptions');
    logInfo(subscriptions);
    // const topics = getInput('topics');
    //const region = getInput('region') || 'us-central1';
    const labels = parseKVString(getInput('labels'));
    const managedSubscriptions = await getManagedSubscriptions(projectId, clientName);

    logInfo(JSON.stringify(managedSubscriptions));

    // const [requiredTopics, requiredSubscriptions] = parseTopicsAndSubscriptions(
    //   projectId,
    //   clientName,
    //   pushAuthServiceAccount,
    //   pushAuthTokenAudience,
    //   ackDeadline,
    //   minRetryDelay,
    //   maxRetryDelay,
    //   maxDeliveryAttempts,
    //   topics,
    //   subscriptions,
    // );

    // Find base command
    const cmd = [];

    // Compile the labels
    const sysLabels = buildLabels(clientName);
    const compiledLabels = Object.assign({}, labels, sysLabels);
    if (compiledLabels && Object.keys(compiledLabels).length > 0) {
      cmd.push('--labels', kvToString(compiledLabels));
    }

    // Authenticate - this comes from google-github-actions/auth.
    const credFile = process.env.GOOGLE_GHA_CREDS_PATH;
    if (credFile) {
      await authenticateGcloudSDK(credFile);
      logInfo('Successfully authenticated');
    } else {
      logWarning('No authentication found, authenticate with `google-github-actions/auth`.');
    }

    setActionOutputs({ done: true });
  } catch (err) {
    const msg = errorMessage(err);
    setFailed(`deskbird/gcp-sync-pubsub failed with: ${msg}`);
  }
}

// function parseTopicsAndSubscriptions(
//   projectId: string,
//   clientName: string,
//   pushAuthServiceAccount: string,
//   pushAuthTokenAudience: string,
//   ackDeadline: string,
//   minRetryDelay: string,
//   maxRetryDelay: string,
//   maxDeliveryAttempts: string,
//   topics: string,
//   subscriptions: string,
// ): [TopicRequest[], SubscriptionRequest[]] {
//   // Parse topics
//   // Parse subscriptiongs
//   // Figure out deadletter topics and add them to topics
//   // Figure out deadletter default subscriptiongs and add them to subscriptions
//   // Return topics and subscriptions
//   const reqSubs = subscriptions.split(',').map(([topic, endpoint]) => {
//     const [topic, pushEndpoint] = sub.split(':');
//     return mapToSubscriptionRequest(
//       projectId,
//       clientName,
//       topic,
//       pushEndpoint,
//       pushAuthServiceAccount,
//       pushAuthTokenAudience,
//       ackDeadline,
//       minRetryDelay,
//       maxRetryDelay,
//       maxDeliveryAttempts,
//       `${clientName}-${topic}-dlq`,
//     );
//   });
// }

async function getManagedSubscriptions(
  projectId: string,
  clientName: string,
): Promise<SubscriptionResponse[]> {
  const subscriptions = await runCommand([
    'pubsub',
    'subscriptions',
    'list',
    '--project',
    projectId,
  ]);
  return subscriptions.filter((sub: { labels: { [key: string]: string } }) => {
    return (
      sub.labels['managed-by'] === 'gcp-sync-pubsub' && sub.labels['client-name'] === clientName
    );
  });
}

/**
 * runCommand executes the given gcloud command with the given args and returns
 * the JSON output.
 */
async function runCommand(cmd: string[]) {
  cmd = [...cmd, '--format', 'json'];
  const toolCommand = getToolCommand();
  const options = { silent: true, ignoreReturnCode: true };
  const commandString = `${toolCommand} ${cmd.join(' ')}`;
  logInfo(`Running: ${commandString}`);

  const output = await getExecOutput(toolCommand, cmd, options);
  if (output.exitCode !== 0) {
    const errMsg = output.stderr || `command exited ${output.exitCode}, but stderr had no output`;
    throw new Error(`failed to execute gcloud command \`${commandString}\`: ${errMsg}`);
  }

  return JSON.parse(output.stdout);
}
/**
 * kvToString takes the given string=string records into a single string that
 * the gcloud CLI expects.
 */
export function kvToString(kv: Record<string, string>, separator = ','): string {
  return Object.entries(kv)
    .map(([k, v]) => {
      return `${k}=${v}`;
    })
    .join(separator);
}

// Map output response to GitHub Action outputs
export function setActionOutputs(outputs: SyncPubSubOutputs): void {
  Object.keys(outputs).forEach((key: string) => {
    setOutput(key, outputs[key as keyof SyncPubSubOutputs]);
  });
}

function buildLabels(clientName: string): KVPair {
  const rawValues: Record<string, string | undefined> = {
    'managed-by': 'github-actions',
    'commit-sha': process.env.GITHUB_SHA,
    'client-name': clientName,
  };

  const labels: KVPair = {};
  for (const key in rawValues) {
    const value = rawValues[key];
    if (value) {
      // Labels can only be lowercase
      labels[key] = value.toLowerCase();
    }
  }

  return labels;
}

/**
 * execute the main function when this module is required directly.
 */
if (require.main === module) {
  run();
}
