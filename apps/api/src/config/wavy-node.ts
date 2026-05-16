import { env } from "./env.js";

export function getWavyAuthHeader(): string {
  const apiKey = env.WAVY_NODE_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("WAVY_NODE_API_KEY is required for live Wavy Node calls.");
  }

  return apiKey.startsWith("ApiKey ") ? apiKey : `ApiKey ${apiKey}`;
}

export function getWavyProjectId(): string {
  const projectId = env.WAVY_NODE_PROJECT_ID?.trim();

  if (!projectId) {
    throw new Error("WAVY_NODE_PROJECT_ID is required for live Wavy Node calls.");
  }

  return projectId;
}
