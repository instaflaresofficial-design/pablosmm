/**
 * Provider Portal Token Configuration (SERVER-SIDE ONLY)
 *
 * Each provider is given a unique secret token that is embedded in their
 * portal link. Only someone with the link can access the portal.
 *
 * To generate a new token, use something like:
 *   crypto.randomBytes(12).toString('hex')
 *
 * To rotate a token, change it here and redeploy. The old link stops working.
 */

export interface ProviderTokenConfig {
  /** Internal key used for provider identification (e.g. "topsmm") */
  key: string;
  /** Display name shown inside the portal banner */
  name: string;
}

/**
 * Map of secret token → provider config.
 * Keep this file server-side only — never import it in client components.
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
 */
export function getProviderByToken(token: string): ProviderTokenConfig | null {
  return PROVIDER_TOKENS[token] ?? null;
}
