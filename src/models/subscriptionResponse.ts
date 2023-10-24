export interface SubscriptionResponse {
  ackDeadlineSeconds: number;
  deadLetterPolicy: {
    deadLetterTopic: string;
    maxDeliveryAttempts: number;
  };
  expirationPolicy: {
    ttl: string;
  };
  messageRetentionDuration: string;
  name: string;
  pushConfig: {
    attributes: { [key: string]: string };
    oidcToken: {
      audience: string;
      serviceAccountEmail: string;
    };
    pushEndpoint: string;
  };
  retryPolicy: {
    maximumBackoff: string;
    minimumBackoff: string;
  };
  state: string;
  topic: string;
  topicMessageRetentionDuration: string;
}
