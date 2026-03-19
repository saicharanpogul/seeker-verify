/** Base error class for all seeker-verify errors */
export class SeekerVerifyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SeekerVerifyError";
  }
}

/** Error during SGT verification (e.g. failed to unpack mint data) */
export class SGTVerificationError extends SeekerVerifyError {
  constructor(message: string) {
    super(message);
    this.name = "SGTVerificationError";
  }
}

/** Error during .skr domain resolution */
export class DomainResolutionError extends SeekerVerifyError {
  constructor(message: string) {
    super(message);
    this.name = "DomainResolutionError";
  }
}

/** Invalid Solana public key address provided */
export class InvalidAddressError extends SeekerVerifyError {
  constructor(address: string) {
    super(`Invalid Solana address: ${address}`);
    this.name = "InvalidAddressError";
  }
}

/** RPC connection error */
export class RpcError extends SeekerVerifyError {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "RpcError";
  }
}
