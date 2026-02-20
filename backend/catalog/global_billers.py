from typing import List, Dict, Optional

COUNTRY_BILLERS: Dict[str, Dict[str, List[str]]] = {
    "US": {
        "utilities": [
            "Pacific Gas and Electric",
            "Con Edison",
            "Duke Energy",
            "Southern California Edison",
        ],
        "telecom": [
            "Verizon",
            "AT&T",
            "T-Mobile",
            "UScellular",
        ],
        "internet": [
            "Comcast Xfinity",
            "Spectrum",
            "Cox Communications",
            "Verizon Fios",
        ],
        "government/taxes": [
            "Internal Revenue Service",
            "California Franchise Tax Board",
            "New York DMV",
            "Social Security Administration",
        ],
        "insurance": [
            "GEICO",
            "State Farm",
            "Allstate",
            "Progressive",
        ],
    },
    "GB": {
        "utilities": [
            "British Gas",
            "EDF Energy",
            "E.ON UK",
            "ScottishPower",
        ],
        "telecom": [
            "EE",
            "Vodafone UK",
            "O2",
            "Three UK",
        ],
        "internet": [
            "BT Broadband",
            "Virgin Media",
            "Sky Broadband",
            "TalkTalk",
        ],
        "government/taxes": [
            "HM Revenue & Customs",
            "DVLA",
            "TV Licensing",
            "UK Visas and Immigration",
        ],
        "insurance": [
            "Aviva",
            "Direct Line",
            "Admiral",
            "AXA UK",
        ],
    },
    "CA": {
        "utilities": [
            "Hydro One",
            "BC Hydro",
            "Toronto Hydro",
            "FortisBC",
        ],
        "telecom": [
            "Rogers",
            "Bell",
            "Telus",
            "Freedom Mobile",
        ],
        "internet": [
            "Shaw",
            "Videotron",
            "TekSavvy",
            "Bell Internet",
        ],
        "government/taxes": [
            "Canada Revenue Agency",
            "ServiceOntario",
            "Service BC",
            "City of Toronto Property Tax",
        ],
        "insurance": [
            "Manulife",
            "Sun Life",
            "Intact Insurance",
            "Desjardins Insurance",
        ],
    },
    "AU": {
        "utilities": [
            "AGL Energy",
            "Origin Energy",
            "EnergyAustralia",
            "AusNet Services",
        ],
        "telecom": [
            "Telstra",
            "Optus",
            "Vodafone Australia",
            "TPG Mobile",
        ],
        "internet": [
            "NBN Co",
            "Aussie Broadband",
            "iiNet",
            "Dodo",
        ],
        "government/taxes": [
            "Australian Taxation Office",
            "Services Australia",
            "Transport for NSW",
            "Service NSW",
        ],
        "insurance": [
            "NRMA Insurance",
            "Allianz Australia",
            "QBE Insurance",
            "Suncorp",
        ],
    },
    "IN": {
        "utilities": [
            "Tata Power",
            "BSES Rajdhani Power",
            "MSEDCL",
            "BESCOM",
        ],
        "telecom": [
            "Airtel",
            "Jio",
            "Vodafone Idea",
            "BSNL",
        ],
        "internet": [
            "ACT Fibernet",
            "JioFiber",
            "Airtel Xstream Fiber",
            "BSNL Broadband",
        ],
        "government/taxes": [
            "Income Tax Department",
            "GST Network",
            "Passport Seva",
            "National Highway Authority of India",
        ],
        "insurance": [
            "LIC of India",
            "HDFC Life",
            "ICICI Prudential",
            "SBI Life",
        ],
    },
    "SG": {
        "utilities": [
            "SP Group",
            "City Gas",
            "Keppel Electric",
            "Senoko Energy",
        ],
        "telecom": [
            "Singtel",
            "StarHub",
            "M1",
            "SIMBA",
        ],
        "internet": [
            "Singtel Fibre",
            "StarHub Broadband",
            "MyRepublic",
            "ViewQwest",
        ],
        "government/taxes": [
            "IRAS",
            "Land Transport Authority",
            "HDB",
            "CPF Board",
        ],
        "insurance": [
            "NTUC Income",
            "AIA Singapore",
            "Prudential Singapore",
            "Great Eastern",
        ],
    },
    "HK": {
        "utilities": [
            "CLP Power",
            "HK Electric",
            "Towngas",
            "Water Supplies Department",
        ],
        "telecom": [
            "HKT",
            "China Mobile Hong Kong",
            "SmarTone",
            "3 Hong Kong",
        ],
        "internet": [
            "PCCW",
            "HKBN",
            "HGC",
            "i-CABLE Broadband",
        ],
        "government/taxes": [
            "Inland Revenue Department",
            "Transport Department",
            "Immigration Department",
            "Rating and Valuation Department",
        ],
        "insurance": [
            "AIA Hong Kong",
            "Manulife Hong Kong",
            "Prudential Hong Kong",
            "AXA Hong Kong",
        ],
    },
    "AE": {
        "utilities": [
            "DEWA",
            "ADDC",
            "SEWA",
            "Etihad Water & Electricity",
        ],
        "telecom": [
            "Etisalat",
            "du",
            "Virgin Mobile UAE",
            "Yahsat",
        ],
        "internet": [
            "Etisalat eLife",
            "du Home",
            "Virgin Home Internet",
            "YahClick",
        ],
        "government/taxes": [
            "Federal Tax Authority",
            "Dubai Police",
            "Roads and Transport Authority",
            "Ministry of Interior",
        ],
        "insurance": [
            "Daman",
            "Orient Insurance",
            "ADNIC",
            "GIG Gulf",
        ],
    },
    "NG": {
        "utilities": [
            "Ikeja Electric",
            "Eko Electricity Distribution",
            "Abuja Electricity Distribution",
            "Port Harcourt Electricity Distribution",
        ],
        "telecom": [
            "MTN Nigeria",
            "Airtel Nigeria",
            "Glo",
            "9mobile",
        ],
        "internet": [
            "Smile Communications",
            "Spectranet",
            "ipNX",
            "Swift Networks",
        ],
        "government/taxes": [
            "Federal Inland Revenue Service",
            "Lagos Internal Revenue Service",
            "Nigeria Immigration Service",
            "National Identity Management Commission",
        ],
        "insurance": [
            "Leadway Assurance",
            "AXA Mansard",
            "AIICO Insurance",
            "NEM Insurance",
        ],
    },
    "ZA": {
        "utilities": [
            "Eskom",
            "City Power Johannesburg",
            "City of Cape Town Electricity",
            "eThekwini Electricity",
        ],
        "telecom": [
            "Vodacom",
            "MTN South Africa",
            "Telkom Mobile",
            "Cell C",
        ],
        "internet": [
            "Telkom Internet",
            "Afrihost",
            "MWEB",
            "Vumatel",
        ],
        "government/taxes": [
            "SARS",
            "City of Johannesburg",
            "City of Cape Town",
            "SANRAL",
        ],
        "insurance": [
            "Old Mutual",
            "Sanlam",
            "Discovery Insurance",
            "OUTsurance",
        ],
    },
    "KE": {
        "utilities": [
            "Kenya Power",
            "Nairobi City Water",
            "Kisumu Water and Sanitation Company",
            "Mombasa Water Supply",
        ],
        "telecom": [
            "Safaricom",
            "Airtel Kenya",
            "Telkom Kenya",
            "Equitel",
        ],
        "internet": [
            "Safaricom Home",
            "Zuku",
            "Faiba",
            "Jamii Telecom",
        ],
        "government/taxes": [
            "Kenya Revenue Authority",
            "NTSA",
            "Nairobi County Government",
            "NSSF",
        ],
        "insurance": [
            "Jubilee Insurance",
            "Britam",
            "CIC Insurance",
            "APA Insurance",
        ],
    },
    "GH": {
        "utilities": [
            "Electricity Company of Ghana",
            "Ghana Water Company",
            "NEDCo",
            "Volta River Authority",
        ],
        "telecom": [
            "MTN Ghana",
            "Telecel Ghana",
            "AirtelTigo",
            "Glo Ghana",
        ],
        "internet": [
            "MTN Fibre",
            "Telecel Broadband",
            "Surfline",
            "BusyInternet",
        ],
        "government/taxes": [
            "Ghana Revenue Authority",
            "DVLA Ghana",
            "Ghana Immigration Service",
            "National Health Insurance Authority",
        ],
        "insurance": [
            "SIC Insurance",
            "Enterprise Insurance",
            "Hollard Ghana",
            "Star Assurance",
        ],
    },
}

CATEGORY_PREFIX = {
    "utilities": "UTIL",
    "telecom": "TEL",
    "internet": "NET",
    "government/taxes": "GOV",
    "insurance": "INS",
}

def _iso2_codes() -> List[str]:
    return sorted(COUNTRY_BILLERS.keys())

def _make(country: str, code: str, name: str, category: str) -> Dict:
    return {
        "payee_code": f"{country}-{code}",
        "biller_code": f"{country}-{code}",
        "name": name,
        "category": category,
        "country": country,
    }

def _entries_for_country(country: str) -> List[Dict]:
    c = country.upper()
    data = COUNTRY_BILLERS.get(c)
    if not data:
        return []
    entries: List[Dict] = []
    for category, names in data.items():
        prefix = CATEGORY_PREFIX.get(category, "CAT")
        for idx, name in enumerate(names):
            code = f"{prefix}-{idx + 1:02d}"
            entries.append(_make(c, code, f"{name} ({c})", category))
    return entries

def query_catalog(category: Optional[str] = None, q: Optional[str] = None, country: Optional[str] = None) -> List[Dict]:
    cats = None
    if category:
        cats = {category.strip().lower()}
    countries = [country.upper()] if country else _iso2_codes()
    results: List[Dict] = []
    for cc in countries:
        for item in _entries_for_country(cc):
            if cats and item["category"] not in cats:
                continue
            if q and q.strip():
                if q.strip().lower() not in item["name"].lower():
                    continue
            results.append(item)
    return results

def find_entry_by_code(payee_code: str) -> Optional[Dict]:
    code = str(payee_code or "").strip()
    if code.startswith("RELOADLY:"):
        code = code.split(":", 1)[1]
    parts = code.split("-")
    if len(parts) < 3:
        return None
    cc = parts[0].upper()
    if cc not in _iso2_codes():
        return None
    code_upper = code.upper()
    for entry in _entries_for_country(cc):
        if entry["payee_code"].upper() == code_upper:
            return entry
    return None
