import type { NormalizedSmmService } from '@/types/smm';

export interface ServiceTag {
  label: string;
  icon: string;
  className: string;
}

export interface ServiceTagData {
  tags: ServiceTag[];
  geo: 'Indian' | 'USA' | 'Global';
  speed: 'Instant' | 'Fast' | 'Normal Speed';
  refill: 'No Refill' | 'Available';
  drop: 'Non Drop' | 'May Drop';
}

export function getServiceTags(service: NormalizedSmmService | any): ServiceTagData {
  const categoryStr = (service.category || '').toLowerCase();
  const nameStr = (service.displayName || '').toLowerCase();
  const descStr = (service.description || '').toLowerCase();

  const tags: ServiceTag[] = [];
  
  // 1. Refill Tag
  const hasRefill = service.refill || nameStr.includes('refill') || descStr.includes('refill') || nameStr.includes(' ar') || descStr.includes(' ar');
  const isNoRefill = nameStr.includes('no refill') || descStr.includes('no refill') || nameStr.includes('non refill');
  
  let refillStatus: 'No Refill' | 'Available' = 'Available';
  
  if (hasRefill && !isNoRefill) {
    let refillLabel = 'Refill Available';
    const fullText = `${nameStr} ${descStr}`;
    
    if (fullText.includes('lifetime') || fullText.includes('life time')) {
      refillLabel = 'Lifetime Refill';
    } else {
      const match = fullText.match(/(\d+)\s*(?:days?|d)(?:\s*refill)?|refill\s*(?:for\s*)?(\d+)\s*(?:days?|d)/);
      if (match) {
        const num = match[1] || match[2];
        refillLabel = `${num} Days Refill`;
      } else {
        const looseMatch = fullText.match(/(\d+)\s*days?/);
        if (looseMatch) refillLabel = `${looseMatch[1]} Days Refill`;
      }
    }
    
    tags.push({ label: refillLabel, icon: '/order/refill.png', className: 'refill' });
    refillStatus = 'Available';
  } else {
    tags.push({ label: 'No Refill', icon: '/order/refill.png', className: 'refill-no' });
    refillStatus = 'No Refill';
  }

  // 2. Drop / Non-Drop Tag
  const isNonDrop = 
    (service as any).drop === 'non_drop' || 
    service.stability?.toLowerCase().includes('non') ||
    nameStr.includes('non drop') || 
    nameStr.includes('non-drop') || 
    nameStr.includes('nondrop') || 
    nameStr.includes('no drop') ||
    descStr.includes('non drop') || 
    descStr.includes('non-drop') || 
    descStr.includes('nondrop') || 
    descStr.includes('no drop') ||
    categoryStr.includes('non drop') || 
    categoryStr.includes('non-drop') ||
    categoryStr.includes('nondrop');

  let dropStatus: 'Non Drop' | 'May Drop' = 'May Drop';
  if (isNonDrop) {
    tags.push({ label: 'Non Drop', icon: '/order/non-drop.png', className: 'nondrop' });
    dropStatus = 'Non Drop';
  } else {
    tags.push({ label: 'May Drop', icon: '/order/non-drop.png', className: 'drop' });
    dropStatus = 'May Drop';
  }

  // 3. Speed Tag
  let speedStatus: 'Instant' | 'Fast' | 'Normal Speed' = 'Normal Speed';
  if (service.averageTime && service.averageTime < 600) {
    tags.push({ label: 'Instant', icon: '/order/instant.png', className: 'instant' });
    speedStatus = 'Instant';
  } else if (service.averageTime && service.averageTime < 3600) {
    tags.push({ label: 'Fast', icon: '/order/instant.png', className: 'fast' });
    speedStatus = 'Fast';
  } else if (nameStr.includes('instant') || descStr.includes('instant')) {
    tags.push({ label: 'Instant', icon: '/order/instant.png', className: 'instant' });
    speedStatus = 'Instant';
  } else if (nameStr.includes('fast') || descStr.includes('fast')) {
    tags.push({ label: 'Fast', icon: '/order/instant.png', className: 'fast' });
    speedStatus = 'Fast';
  } else {
    tags.push({ label: 'Normal Speed', icon: '/order/instant.png', className: 'normal' });
    speedStatus = 'Normal Speed';
  }
  
  // 4. Geo Tag
  let geoStatus: 'Indian' | 'USA' | 'Global' = 'Global';
  if (categoryStr.includes('indian') || nameStr.includes('indian') || categoryStr.includes('india') || nameStr.includes('india') || descStr.includes('indian')) {
    tags.push({ label: 'Indian', icon: '/order/indian.png', className: 'region' });
    geoStatus = 'Indian';
  } else if (categoryStr.includes('usa ') || nameStr.includes('usa ') || categoryStr.includes(' usa') || nameStr.includes(' usa') || categoryStr.includes('us ') || nameStr.includes('us ') || descStr.includes(' usa ') || descStr.includes(' usa,')) {
    tags.push({ label: 'USA', icon: '/order/us.png', className: 'region' });
    geoStatus = 'USA';
  } else {
    tags.push({ label: 'Global', icon: '/order/global.png', className: 'region' });
    geoStatus = 'Global';
  }

  return { tags, geo: geoStatus, speed: speedStatus, refill: refillStatus, drop: dropStatus };
}
