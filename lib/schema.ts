import { z } from "zod";

/**
 * The contract between the LLM and the canvas.
 * Every LLM response is validated against `DiagramSpecSchema` before it is
 * allowed anywhere near the React Flow store.
 */

// Keep this in sync with the allow-list used in the system prompt (lib/grok.ts)
// and with lib/awsIconMap.ts.
export const SERVICE_KEYS = [
  "cloudfront",
  "alb",
  "nlb",
  "ec2",
  "ecs",
  "eks",
  "lambda",
  "s3",
  "rds",
  "dynamodb",
  "apigateway",
  "sqs",
  "sns",
  "vpc",
  "subnet",
  "bedrock",
  "cognito",
  "cloudwatch",
  "iam",
  "route53",
  "generic",
] as const;

export type ServiceKey = (typeof SERVICE_KEYS)[number];

export const DiagramNodeSchema = z.object({
  id: z.string().min(1),
  // Be lenient about the service string so an unknown key never blocks
  // rendering — the icon map falls back to "generic".
  service: z.string().min(1),
  label: z.string().min(1),
  parentId: z.string().optional(),
  isContainer: z.boolean().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
});

export const DiagramEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  label: z.string().optional(),
  animated: z.boolean().optional(),
});

export const DiagramSpecSchema = z
  .object({
    title: z.string().min(1),
    nodes: z.array(DiagramNodeSchema),
    edges: z.array(DiagramEdgeSchema),
  })
  .superRefine((spec, ctx) => {
    const ids = new Set<string>();
    for (const node of spec.nodes) {
      if (ids.has(node.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate node id "${node.id}"`,
          path: ["nodes"],
        });
      }
      ids.add(node.id);
    }
    for (const node of spec.nodes) {
      if (node.parentId && !ids.has(node.parentId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Node "${node.id}" references missing parentId "${node.parentId}"`,
          path: ["nodes"],
        });
      }
      if (node.parentId === node.id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Node "${node.id}" cannot be its own parent`,
          path: ["nodes"],
        });
      }
    }
    for (const edge of spec.edges) {
      if (!ids.has(edge.source)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Edge "${edge.id}" has unknown source "${edge.source}"`,
          path: ["edges"],
        });
      }
      if (!ids.has(edge.target)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Edge "${edge.id}" has unknown target "${edge.target}"`,
          path: ["edges"],
        });
      }
    }
  });

export type DiagramNode = z.infer<typeof DiagramNodeSchema>;
export type DiagramEdge = z.infer<typeof DiagramEdgeSchema>;
export type DiagramSpec = z.infer<typeof DiagramSpecSchema>;

/**
 * Formats zod issues into a compact, model-readable string so we can hand the
 * exact validation failure back to Grok on a retry.
 */
export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length ? issue.path.join(".") : "(root)";
      return `- ${path}: ${issue.message}`;
    })
    .join("\n");
}
