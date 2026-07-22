import type { DiagramSpec } from "./schema";

/**
 * Hardcoded reference architecture used to (a) validate rendering during
 * bootstrap and (b) serve as the MOCK-mode response when no GROK_API_KEY is set.
 * Mirrors the end-to-end example in the build spec: CDN -> ALB (in a VPC) that
 * fans out to EC2, Lambda, and S3 (S3 drawn outside the VPC per AWS convention).
 */
export const SAMPLE_SPEC: DiagramSpec = {
  title: "Agentic System Back-End",
  nodes: [
    { id: "cdn", service: "cloudfront", label: "CloudFront CDN" },
    { id: "vpc", service: "vpc", label: "VPC", isContainer: true },
    { id: "alb", service: "alb", label: "Application Load Balancer", parentId: "vpc" },
    { id: "ec2", service: "ec2", label: "EC2 Instances", parentId: "vpc" },
    { id: "lambda", service: "lambda", label: "Agent Lambda Functions", parentId: "vpc" },
    { id: "s3", service: "s3", label: "S3 Bucket" },
  ],
  edges: [
    { id: "e-cdn-alb", source: "cdn", target: "alb", label: "HTTPS", animated: true },
    { id: "e-alb-ec2", source: "alb", target: "ec2", label: "routes to" },
    { id: "e-alb-lambda", source: "alb", target: "lambda", label: "invokes" },
    { id: "e-alb-s3", source: "alb", target: "s3", label: "reads/writes" },
  ],
};

export const EXAMPLE_PROMPTS: string[] = [
  "Back-end for an agentic system: a CDN pointing to an ALB inside a VPC; the load balancer fans out to EC2 instances, Lambda functions, and an S3 bucket.",
  "A serverless REST API: API Gateway to Lambda, with DynamoDB for storage and Cognito for auth.",
  "Three-tier web app in a VPC: CloudFront to an ALB, ALB to ECS in a private subnet, ECS to an RDS database.",
];
