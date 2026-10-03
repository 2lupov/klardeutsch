export function getPostSignupAction(hasSession: boolean) {
  return hasSession ? "complete-registration" : "show-auto-login-error";
}