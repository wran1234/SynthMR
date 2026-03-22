/**
 * User-safe error messages. Never expose internal details to the client.
 */

export const USER_MESSAGES = {
  generic: "Something went wrong. Please try again.",
  notFound: "The requested resource was not found.",
  forbidden: "You don't have access to this resource.",
  rateLimited: "Too many requests. Please try again in a moment.",
  invalidInput: "Invalid input. Please check your data and try again.",
  confirmRequired: "Confirmation is required to complete this action.",
  emailNotVerified: "Please verify your email address before doing this.",
} as const;
