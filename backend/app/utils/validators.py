"""Indian input validators — GSTIN, PAN, mobile, ICAI number."""
import re
from typing import Optional

GSTIN_RE = re.compile(r"^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$")
PAN_RE = re.compile(r"^[A-Z]{5}\d{4}[A-Z]$")
TAN_RE = re.compile(r"^[A-Z]{4}\d{5}[A-Z]$")
MOBILE_RE = re.compile(r"^[6-9]\d{9}$")
ICAI_RE = re.compile(r"^[A-Z]{3}\d{6}$")
CIN_RE = re.compile(r"^[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$")
PINCODE_RE = re.compile(r"^\d{6}$")


def validate_gstin(gstin: str) -> bool:
    """Validate GSTIN format (15 chars). Skips checksum for now — verified at filing time."""
    gstin = gstin.strip().upper()
    return bool(GSTIN_RE.match(gstin))


def validate_pan(pan: str) -> bool:
    return bool(PAN_RE.match(pan.strip().upper()))


def validate_tan(tan: str) -> bool:
    return bool(TAN_RE.match(tan.strip().upper()))


def validate_mobile(mobile: str) -> bool:
    """Validate Indian mobile — accept 10-digit numbers starting 6-9 or prefixed with +91/91."""
    mobile = mobile.strip().lstrip("+").removeprefix("91")
    if len(mobile) == 10:
        return bool(MOBILE_RE.match(mobile))
    return bool(re.match(r"^[6-9]\d{9}$", mobile))


def normalize_mobile(mobile: str) -> str:
    return mobile.strip().lstrip("+91").lstrip("91")


def validate_icai_number(number: str) -> bool:
    return bool(ICAI_RE.match(number.strip().upper()))


def validate_cin(cin: str) -> bool:
    return bool(CIN_RE.match(cin.strip().upper()))


def validate_pincode(pincode: str) -> bool:
    return bool(PINCODE_RE.match(pincode.strip()))
