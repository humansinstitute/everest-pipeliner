export class AuthValidator {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.authorizedPubkeys = new Set(
      this.parseAuthorizedPubkeys(config.authorizedPubkeys)
    );
    this.authCache = new Map();
    this.authCacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  parseAuthorizedPubkeys(pubkeysConfig) {
    if (typeof pubkeysConfig === "string") {
      // Handle comma-separated string
      return pubkeysConfig
        .split(",")
        .map((pk) => pk.trim())
        .filter((pk) => pk.length > 0);
    } else if (Array.isArray(pubkeysConfig)) {
      return pubkeysConfig;
    } else {
      throw new Error("Invalid authorizedPubkeys configuration format");
    }
  }

  async validatePubkey(pubkey) {
    // Check cache first
    const cached = this.authCache.get(pubkey);
    if (cached && Date.now() - cached.timestamp < this.authCacheTTL) {
      return cached.authorized;
    }

    // Validate pubkey format
    if (!this.isValidPubkey(pubkey)) {
      this.logger.warn("Invalid pubkey format attempted access", { pubkey });
      this.updateCache(pubkey, false);
      return false;
    }

    // Check authorization
    const isAuthorized = this.authorizedPubkeys.has(pubkey);

    this.logger.info("Authorization check", {
      pubkey: pubkey.substring(0, 8),
      fullPubkey: pubkey,
      authorized: isAuthorized,
      authorizedCount: this.authorizedPubkeys.size,
    });

    // Log additional details for unauthorized attempts
    if (!isAuthorized) {
      this.logger.warn("Unauthorized pubkey attempted access", {
        attemptedPubkey: pubkey,
        authorizedPubkeys: Array.from(this.authorizedPubkeys).map((key) =>
          key.substring(0, 8)
        ),
      });
    }

    this.updateCache(pubkey, isAuthorized);
    return isAuthorized;
  }

  updateCache(pubkey, authorized) {
    this.authCache.set(pubkey, {
      authorized,
      timestamp: Date.now(),
    });
  }

  isValidPubkey(pubkey) {
    return /^[0-9a-fA-F]{64}$/.test(pubkey);
  }

  reloadAuthorizedPubkeys(newPubkeys) {
    this.authorizedPubkeys = new Set(this.parseAuthorizedPubkeys(newPubkeys));
    this.authCache.clear();
    this.logger.info("Authorized pubkeys reloaded", {
      count: this.authorizedPubkeys.size,
    });
  }
}
