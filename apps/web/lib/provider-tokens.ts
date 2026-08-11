/**
 * Provider Portal Token Configuration
 *
 * Each provider is given a unique secret token that is embedded in their
 * portal link. Only someone with the link can access the portal.
 */

export interface ProviderTokenConfig {
  /** Internal key used for provider identification (e.g. "topsmm") */
  key: string;
  /** Display name shown inside the portal banner */
  name: string;
}

/**
 * Map of secret token → provider config.
 */
export const PROVIDER_TOKENS: Record<string, ProviderTokenConfig> = {
  // TopSMM portal link: /provider/verify/topsmm-xK9mP2wQ4r
  "topsmm-xK9mP2wQ4r": {
    key: "topsmm",
    name: "TopSMM",
  },

  // CheapSMMZone portal link: /provider/verify/cheapsmmzone-nR7vB4cLqJ
  "cheapsmmzone-nR7vB4cLqJ": {
    key: "cheapsmmzone",
    name: "CheapSMMZone",
  },
};

/**
 * Looks up a provider config by token.
 * Returns null if the token is invalid or unknown.
 * Supports dynamic token resolution for any newly added provider sluggified key.
 */
export function getProviderByToken(token: string): ProviderTokenConfig | null {
  if (!token) return null;
  if (PROVIDER_TOKENS[token]) {
    return PROVIDER_TOKENS[token];
  }
  if (token.includes("-")) {
    const key = token.split("-")[0].toLowerCase().trim();
    if (key) {
      return {
        key: key,
        name: key.toUpperCase(),
      };
    }
  }
  return null;
}

/**
 * Gets the token string for a provider key (e.g. "topsmm" → "topsmm-xK9mP2wQ4r")
 */
export function getProviderTokenKey(providerKey: string): string {
  const cleanKey = (providerKey || "").toLowerCase().trim();
  const entry = Object.entries(PROVIDER_TOKENS).find(
    ([_, config]) => config.key.toLowerCase() === cleanKey
  );
  if (entry) return entry[0];
  return `${cleanKey}-verify-portal`;
}
