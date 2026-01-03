import fs from 'fs';
import path from 'path';
import type { NormalizedSmmService, Platform, ServiceType, Variant } from '@/types/smm';

export type AdminServiceOverride = {
  source: string;            // provider key, e.g., 'earthpanel'
  sourceServiceId: string;   // provider service id
  include?: boolean;         // if false, exclude from catalog when strict mode is on
  platform?: Platform;       // force platform override
  type?: ServiceType;        // force type override
  variant?: Variant;         // force variant override
  displayName?: string;      // override name shown to users
  customRatePer1000?: number;// absolute display rate per 1000 (in USD)
  marginPercent?: number;    // add margin % on top of provider base rate
};

export type AdminConfig = {
  strict?: boolean;                // when true, only services with include:true are exposed
  defaultMarginPercent?: number;   // default margin if not specified per service
  overrides?: AdminServiceOverride[];
};

const DEFAULT_CONFIG: AdminConfig = { strict: false, defaultMarginPercent: 0, overrides: [] };

export function readAdminConfig(): AdminConfig {
  try {
    const file = path.resolve(process.cwd(), 'admin', 'services.config.json');
    if (!fs.existsSync(file)) return DEFAULT_CONFIG;
    const raw = fs.readFileSync(file, 'utf8');
    const json = JSON.parse(raw) as AdminConfig;
    json.overrides = json.overrides || [];
    return { ...DEFAULT_CONFIG, ...json };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function applyOverrides(list: NormalizedSmmService[], cfg: AdminConfig): NormalizedSmmService[] {
  const byKey = new Map<string, AdminServiceOverride>();
  (cfg.overrides || []).forEach(o => {
    byKey.set(`${o.source}:${o.sourceServiceId}`, o);
  });

  const result: NormalizedSmmService[] = [];
  for (const s of list) {
    const key = `${s.source || 'unknown'}:${s.sourceServiceId || s.id}`;
    const ov = byKey.get(key);

    if (cfg.strict && !ov?.include) continue; // only include explicitly
    if (ov && ov.include === false) continue;  // explicit exclusion

    // Use normalized `ratePer1000` (USD per 1000) as the base for admin margins
    const base = (typeof s.ratePer1000 === 'number' && isFinite(s.ratePer1000)) ? s.ratePer1000 : (s.baseRatePer1000 ?? 0);
    let rate = base;
    const margin = ov?.marginPercent ?? cfg.defaultMarginPercent ?? 0;

    if (typeof ov?.customRatePer1000 === 'number') {
      rate = ov.customRatePer1000;
    } else if (margin > 0) {
      rate = base * (1 + margin / 100);
    }

    result.push({
      ...s,
      platform: ov?.platform ?? s.platform,
      type: ov?.type ?? s.type,
      variant: ov?.variant ?? s.variant,
      displayName: ov?.displayName ?? s.displayName,
      ratePer1000: rate,
    });
  }
  return result;
}
