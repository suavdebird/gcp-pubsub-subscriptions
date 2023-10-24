export interface SubscriptionRequest {
  topic: string;
  name: string;
  pushEndpoint: string;
  oidcTokenAudience: string;
  oidcTokenServiceAccountEmail: string;
  ackDeadline: number;
  minRetryDelay: number;
  maxRetryDelay: number;
  maxDeliveryAttempts: number;
  deadLetterTopic: string;
}

export function mapToSubscriptionRequest(
  projectId: string,
  clientName: string,
  topic: string,
  pushEndpoint: string,
  oidcTokenAudience: string,
  oidcTokenServiceAccountEmail: string,
  ackDeadline: number,
  minRetryDelay: number,
  maxRetryDelay: number,
  maxDeliveryAttempts: number,
  deadLetterTopic: string,
): SubscriptionRequest {
  return {
    topic: `projects/${projectId}/topics/${topic}`,
    name: `projects/${projectId}/subscriptions/${clientName}-${topic}`,
    pushEndpoint,
    oidcTokenAudience,
    oidcTokenServiceAccountEmail,
    ackDeadline,
    minRetryDelay,
    maxRetryDelay,
    maxDeliveryAttempts,
    deadLetterTopic: `projects/${projectId}/topics/${deadLetterTopic}`,
  };
}
