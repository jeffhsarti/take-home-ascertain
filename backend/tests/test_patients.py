async def test_create_and_get_patient(client, patient_payload):
    resp = await client.post("/patients", json=patient_payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["age"] >= 0
    assert data["email"] == patient_payload["email"]

    resp = await client.get(f"/patients/{data['id']}")
    assert resp.status_code == 200


async def test_get_missing_returns_404(client):
    resp = await client.get("/patients/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


async def test_create_invalid_email_returns_422(client, patient_payload):
    resp = await client.post("/patients", json={**patient_payload, "email": "not-an-email"})
    assert resp.status_code == 422


async def test_future_dob_returns_422(client, patient_payload):
    resp = await client.post("/patients", json={**patient_payload, "date_of_birth": "2999-01-01"})
    assert resp.status_code == 422


async def test_list_pagination(client, patient_payload):
    for i in range(3):
        await client.post("/patients", json={**patient_payload, "email": f"p{i}@example.com"})
    resp = await client.get("/patients", params={"page": 1, "page_size": 2})
    body = resp.json()
    assert resp.status_code == 200
    assert body["total"] == 3
    assert len(body["items"]) == 2
    assert body["total_pages"] == 2


async def test_list_search_and_status_filter(client, patient_payload):
    await client.post(
        "/patients",
        json={
            **patient_payload,
            "first_name": "Alice",
            "email": "a@example.com",
            "status": "active",
        },
    )
    await client.post(
        "/patients",
        json={
            **patient_payload,
            "first_name": "Bob",
            "email": "b@example.com",
            "status": "inactive",
        },
    )
    assert (await client.get("/patients", params={"search": "Alice"})).json()["total"] == 1
    assert (await client.get("/patients", params={"status": "inactive"})).json()["total"] == 1


async def test_update_patient(client, patient_payload):
    pid = (await client.post("/patients", json=patient_payload)).json()["id"]
    resp = await client.put(f"/patients/{pid}", json={**patient_payload, "status": "discharged"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "discharged"


async def test_delete_patient(client, patient_payload):
    pid = (await client.post("/patients", json=patient_payload)).json()["id"]
    assert (await client.delete(f"/patients/{pid}")).status_code == 204
    assert (await client.get(f"/patients/{pid}")).status_code == 404
