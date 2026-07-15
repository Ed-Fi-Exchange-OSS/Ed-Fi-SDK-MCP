"""Type definitions for Ed-Fi domain information."""

from typing import TypedDict


class DomainInfo(TypedDict, total=False):
    documentation: str
    entities: list[str]
    associations: list[str]
    parentDomain: str


DomainObject = dict[str, DomainInfo]
DomainData = list[DomainObject]
