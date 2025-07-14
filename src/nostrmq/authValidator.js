export class AuthValidator {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.authorizedPubkeys = new Set(
      this.parseAuthorizedPubkeys(config.authorizedPubkeys || [])
    );
    this.authCache = new Map();
    this.authCacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  parseAuthorizedPubkeys(pubkeysConfig) {
    if (typeof pubkeysConfig === "string") {
      // Handle comma-separated string
      return pubkeysConfig
        .split(",")
        .map((pk) => this.normalizePubkey(pk.trim()))
        .filter((pk) => pk.length > 0);
    } else if (Array.isArray(pubkeysConfig)) {
      return pubkeysConfig.map((pk) => this.normalizePubkey(pk));
    } else if (pubkeysConfig === null || pubkeysConfig === undefined) {
      return [];
    } else {
      throw new Error("Invalid authorizedPubkeys configuration format");
    }
  }

  async validatePubkey(pubkey) {
    // Handle null/undefined/empty pubkeys
    if (!pubkey) {
      return false;
    }

    // Check cache first
    const normalizedPubkey = this.normalizePubkey(pubkey);
    const cached = this.authCache.get(normalizedPubkey);
    if (cached && Date.now() - cached.timestamp < this.authCacheTTL) {
      return cached.authorized;
    }

    // Validate pubkey format
    if (!this.isValidPubkeyFormat(pubkey)) {
      this.logger.warn("Invalid pubkey format attempted access", { pubkey });
      this.updateCache(normalizedPubkey, false);
      return false;
    }

    // Check authorization using normalized pubkeys
    const isAuthorized = this.authorizedPubkeys.has(normalizedPubkey);

    this.logger.info("Pubkey authorization check", {
      pubkey: pubkey,
      fullPubkey: pubkey,
      authorized: isAuthorized,
      authorizedCount: this.authorizedPubkeys.size,
    });

    // Log additional details for unauthorized attempts
    if (!isAuthorized) {
      this.logger.warn("Unauthorized pubkey access attempt", {
        pubkey: pubkey,
        attemptedPubkey: pubkey,
        authorizedPubkeys: Array.from(this.authorizedPubkeys).map((key) =>
          key.substring(0, 8)
        ),
      });
    }

    this.updateCache(normalizedPubkey, isAuthorized);
    return isAuthorized;
  }

  normalizePubkey(pubkey) {
    if (!pubkey) {
      return "";
    }

    // Convert to lowercase for consistent comparison
    const lowercased = pubkey.toLowerCase();

    // Remove 0x prefix if present
    if (lowercased.startsWith("0x")) {
      return lowercased.substring(2);
    }

    return lowercased;
  }

  isValidPubkeyFormat(pubkey) {
    if (!pubkey || typeof pubkey !== "string") {
      return false;
    }

    // Check for npub format (bech32)
    if (pubkey.startsWith("npub1")) {
      // Basic npub format validation - should be npub1 followed by characters
      return /^npub1[a-z0-9]{58,}$/.test(pubkey);
    }

    // Check for hex format with 0x prefix (66 characters for Nostr pubkeys)
    if (pubkey.startsWith("0x") || pubkey.startsWith("0X")) {
      return /^0x[0-9a-fA-F]{66}$/i.test(pubkey);
    }

    // Check for plain hex format (66 characters for Nostr pubkeys)
    return /^[0-9a-fA-F]{66}$/i.test(pubkey);
  }

  // Legacy method for backward compatibility
  isValidPubkey(pubkey) {
    return this.isValidPubkeyFormat(pubkey);
  }

  updateCache(pubkey, authorized) {
    this.authCache.set(pubkey, {
      authorized,
      timestamp: Date.now(),
    });
  }

  reloadAuthorizedPubkeys(newPubkeys) {
    this.authorizedPubkeys = new Set(this.parseAuthorizedPubkeys(newPubkeys));
    this.authCache.clear();
    this.logger.info("Authorized pubkeys reloaded", {
      count: this.authorizedPubkeys.size,
    });
  }
}
