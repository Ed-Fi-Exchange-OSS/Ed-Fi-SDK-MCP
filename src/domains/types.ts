/**
 * TypeScript interfaces for Ed-Fi domain information
 */

export interface DomainInfo {
  documentation: string;
  entities: string[];
  associations?: string[];
  parentDomain?: string;
}

export interface DomainObject {
  [domainName: string]: DomainInfo;
}

export type DomainData = DomainObject[];
