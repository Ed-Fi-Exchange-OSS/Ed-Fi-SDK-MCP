"""Index of Ed-Fi Data Standard domain information."""

from ed_fi_mcp.domains.types import DomainData, DomainInfo, DomainObject
from ed_fi_mcp.domains.v4_0 import DOMAIN_DATA_4_0
from ed_fi_mcp.domains.v5_0 import DOMAIN_DATA_5_0
from ed_fi_mcp.domains.v5_1 import DOMAIN_DATA_5_1
from ed_fi_mcp.domains.v5_2 import DOMAIN_DATA_5_2

__all__ = [
    "DomainData",
    "DomainInfo",
    "DomainObject",
    "DOMAIN_DATA_4_0",
    "DOMAIN_DATA_5_0",
    "DOMAIN_DATA_5_1",
    "DOMAIN_DATA_5_2",
    "DOMAIN_DATA_MAP",
    "get_domain_data",
    "get_available_versions",
]

# Map of version numbers to their corresponding domain data
DOMAIN_DATA_MAP: dict[str, DomainData] = {
    "4.0": DOMAIN_DATA_4_0,
    "5.0": DOMAIN_DATA_5_0,
    "5.1": DOMAIN_DATA_5_1,
    "5.2": DOMAIN_DATA_5_2,
}


def get_domain_data(version: str) -> DomainData:
    """Get domain data for a specific version.

    Raises:
        ValueError: if the version is not supported.
    """
    domain_data = DOMAIN_DATA_MAP.get(version)
    if domain_data is None:
        available = ", ".join(DOMAIN_DATA_MAP.keys())
        raise ValueError(
            f"Domain information is not available for version {version}. "
            f"Available versions: {available}"
        )
    return domain_data


def get_available_versions() -> list[str]:
    """Get all available Ed-Fi Data Standard versions."""
    return list(DOMAIN_DATA_MAP.keys())
