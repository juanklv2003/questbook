export class LogoutUseCase {
  async execute(): Promise<void> {
    // With stateless JWTs, we don't have server-side session state to destroy.
    // The actual "logout" happens at the HTTP layer by clearing the HttpOnly cookie.
    return;
  }
}
