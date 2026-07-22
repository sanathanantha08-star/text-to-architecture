import type { ServiceKey } from "./schema";

export type ServiceCategory =
  | "compute"
  | "networking"
  | "storage"
  | "database"
  | "integration"
  | "ml"
  | "security"
  | "management"
  | "generic";

export interface ServiceMeta {
  /** File path under /public — swap the SVG here later with zero code changes. */
  icon: string;
  /** Human-friendly name shown in the icon picker. */
  name: string;
  category: ServiceCategory;
}

/**
 * The single mapping layer between a service key and its icon + category.
 * Drop the official AWS Architecture Icon SVGs into /public/icons/aws/ at the
 * exact paths below and everything downstream picks them up automatically.
 */
export const AWS_ICON_MAP: Record<string, ServiceMeta> = {
  cloudfront: { icon: "/icons/aws/cloudfront.svg", name: "CloudFront", category: "networking" },
  alb: { icon: "/icons/aws/alb.svg", name: "Application Load Balancer", category: "networking" },
  nlb: { icon: "/icons/aws/nlb.svg", name: "Network Load Balancer", category: "networking" },
  apigateway: { icon: "/icons/aws/apigateway.svg", name: "API Gateway", category: "networking" },
  route53: { icon: "/icons/aws/route53.svg", name: "Route 53", category: "networking" },
  vpc: { icon: "/icons/aws/vpc.svg", name: "VPC", category: "networking" },
  subnet: { icon: "/icons/aws/subnet.svg", name: "Subnet", category: "networking" },

  ec2: { icon: "/icons/aws/ec2.svg", name: "EC2", category: "compute" },
  ecs: { icon: "/icons/aws/ecs.svg", name: "ECS", category: "compute" },
  eks: { icon: "/icons/aws/eks.svg", name: "EKS", category: "compute" },
  lambda: { icon: "/icons/aws/lambda.svg", name: "Lambda", category: "compute" },

  s3: { icon: "/icons/aws/s3.svg", name: "S3", category: "storage" },

  rds: { icon: "/icons/aws/rds.svg", name: "RDS", category: "database" },
  dynamodb: { icon: "/icons/aws/dynamodb.svg", name: "DynamoDB", category: "database" },

  sqs: { icon: "/icons/aws/sqs.svg", name: "SQS", category: "integration" },
  sns: { icon: "/icons/aws/sns.svg", name: "SNS", category: "integration" },

  bedrock: { icon: "/icons/aws/bedrock.svg", name: "Bedrock", category: "ml" },

  cognito: { icon: "/icons/aws/cognito.svg", name: "Cognito", category: "security" },
  iam: { icon: "/icons/aws/iam.svg", name: "IAM", category: "security" },

  cloudwatch: { icon: "/icons/aws/cloudwatch.svg", name: "CloudWatch", category: "management" },

  generic: { icon: "/icons/aws/generic.svg", name: "Generic Service", category: "generic" },
};

export const CATEGORY_COLORS: Record<ServiceCategory, string> = {
  compute: "#ED7100",
  networking: "#8C4FFF",
  storage: "#7AA116",
  database: "#2E27AD",
  integration: "#E7157B",
  ml: "#01A88D",
  security: "#DD344C",
  management: "#CD2264",
  generic: "#5A6B86",
};

/** Always returns a valid meta — unknown keys fall back to "generic". */
export function getServiceMeta(service: string): ServiceMeta {
  return AWS_ICON_MAP[service] ?? AWS_ICON_MAP.generic;
}

export function getCategoryColor(service: string): string {
  return CATEGORY_COLORS[getServiceMeta(service).category];
}

export const SERVICE_PICKER_LIST: Array<{ key: string; meta: ServiceMeta }> =
  Object.entries(AWS_ICON_MAP).map(([key, meta]) => ({ key, meta }));

export type { ServiceKey };
