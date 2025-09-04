/**
 * Index file for Ed-Fi Data Standard domain information
 */

export type { DomainData, DomainInfo, DomainObject } from './types.js';
export { DOMAIN_DATA_4_0 } from './4.0.js';
export { DOMAIN_DATA_5_0 } from './5.0.js';
export { DOMAIN_DATA_5_1 } from './5.1.js';
export { DOMAIN_DATA_5_2 } from './5.2.js';

import type { DomainData } from './types.js';
import { DOMAIN_DATA_4_0 } from './4.0.js';
import { DOMAIN_DATA_5_0 } from './5.0.js';
import { DOMAIN_DATA_5_1 } from './5.1.js';
import { DOMAIN_DATA_5_2 } from './5.2.js';

/**
 * Map of version numbers to their corresponding domain data
 */
export const DOMAIN_DATA_MAP: Record<string, DomainData> = {
  '4.0': DOMAIN_DATA_4_0,
  '5.0': DOMAIN_DATA_5_0,
  '5.1': DOMAIN_DATA_5_1,
  '5.2': DOMAIN_DATA_5_2,
};

/**
 * Get domain data for a specific version
 * @param version - The Ed-Fi Data Standard version (e.g., '4.0', '5.0', '5.1', '5.2')
 * @returns The domain data for the specified version
 * @throws Error if the version is not supported
 */
export function getDomainData(version: string): DomainData {
  const domainData = DOMAIN_DATA_MAP[version];
  if (!domainData) {
    throw new Error(`Domain information is not available for version ${version}. Available versions: ${Object.keys(DOMAIN_DATA_MAP).join(', ')}`);
  }
  return domainData;
}

/**
 * Get all available Ed-Fi Data Standard versions
 * @returns Array of available version strings
 */
export function getAvailableVersions(): string[] {
  return Object.keys(DOMAIN_DATA_MAP);
}
