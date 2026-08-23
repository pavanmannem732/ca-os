"""Unit tests for auth endpoints."""
import pytest


@pytest.mark.asyncio
async def test_health_check(client):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_request_otp_invalid_mobile(client):
    response = await client.post("/api/v1/auth/request-otp", json={"mobile": "123"})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_request_otp_valid_mobile(client):
    # This will log the OTP in DEBUG mode; no SMS sent
    response = await client.post("/api/v1/auth/request-otp", json={"mobile": "9876543210"})
    # 404 if user doesn't exist, or 200 if OTP sent
    assert response.status_code in (200, 404)


@pytest.mark.asyncio
async def test_verify_otp_invalid_format(client):
    response = await client.post("/api/v1/auth/verify-otp", json={"mobile": "9876543210", "otp": "abc"})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_list_clients_unauthenticated(client):
    response = await client.get("/api/v1/clients/")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_gstin_validator():
    from app.utils.validators import validate_gstin
    assert validate_gstin("27AAPFU0939F1ZV") == True
    assert validate_gstin("INVALID") == False
    assert validate_gstin("99AAPFU0939F1ZV") == False


@pytest.mark.asyncio
async def test_pan_validator():
    from app.utils.validators import validate_pan
    assert validate_pan("AAPFU0939F") == True
    assert validate_pan("invalid") == False


@pytest.mark.asyncio
async def test_gst_calendar_generates_tasks():
    from app.utils.gst_calendar import generate_gst_tasks_for_client
    tasks = generate_gst_tasks_for_client(
        compliance_services=["gst_monthly"],
        gst_filing_frequency="monthly",
        start_year=2025,
        num_months=3,
    )
    assert len(tasks) > 0
    assert all("due_date" in t for t in tasks)
    assert all("task_type" in t for t in tasks)


@pytest.mark.asyncio
async def test_otp_generation():
    from app.core.security import generate_otp, hash_otp, verify_otp
    otp = generate_otp()
    assert len(otp) == 6
    assert otp.isdigit()
    hashed = hash_otp(otp)
    assert verify_otp(otp, hashed)
    assert not verify_otp("000000", hashed)
