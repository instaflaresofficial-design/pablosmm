import fs from 'fs';
import path from 'path';

export type ProviderConfig = {
  key: string;           // unique id, e.g., 'earthpanel'
  name?: string;         // display name
  apiUrl: string;        // base API endpoint, e.g., https://panel.com/api/v2
  apiKey: string;        // API key for the panel
  enabled?: boolean;     // whether to use this provider
  // Currency that provider reports rates in. Supported: 'USD'|'INR'. Defaults to 'USD'
  currency?: 'USD' | 'INR';
};

export type ProvidersFile = {
  providers: ProviderConfig[];
};

const DEFAULT: ProvidersFile = { providers: [] };

const FILE_PATH = path.resolve(process.cwd(), 'admin', 'providers.config.json');

export function readProviders(): ProvidersFile {
  try {
    if (!fs.existsSync(FILE_PATH)) return DEFAULT;
    const raw = fs.readFileSync(FILE_PATH, 'utf8');
    const json = JSON.parse(raw) as ProvidersFile | ProviderConfig[];
    // Support legacy array shape
    if (Array.isArray(json)) return { providers: json };
    if (!json.providers) return DEFAULT;
    return { providers: json.providers };
  } catch {
    return DEFAULT;
  }
}

export function writeProviders(data: ProvidersFile): void {
  const pretty = JSON.stringify({ providers: data.providers }, null, 2);
  fs.mkdirSync(path.dirname(FILE_PATH), { recursive: true });
  fs.writeFileSync(FILE_PATH, pretty, 'utf8');
}

export function upsertProvider(p: ProviderConfig): ProvidersFile {
  const list = readProviders();
  const idx = list.providers.findIndex(x => x.key === p.key);
  if (idx >= 0) list.providers[idx] = { ...list.providers[idx], ...p };
  else list.providers.push(p);
  writeProviders(list);
  return list;
}

export function removeProvider(key: string): ProvidersFile {
  const list = readProviders();
  const next = list.providers.filter(p => p.key !== key);
  writeProviders({ providers: next });
  return { providers: next };
}
