async def _create_patient(client, payload) -> str:
    return (await client.post("/patients", json=payload)).json()["id"]


async def test_add_list_delete_note(client, patient_payload):
    pid = await _create_patient(client, patient_payload)
    resp = await client.post(f"/patients/{pid}/notes", json={"content": "First note"})
    assert resp.status_code == 201
    note_id = resp.json()["id"]

    resp = await client.get(f"/patients/{pid}/notes")
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    assert (await client.delete(f"/patients/{pid}/notes/{note_id}")).status_code == 204
    assert len((await client.get(f"/patients/{pid}/notes")).json()) == 0


async def test_note_with_explicit_timestamp(client, patient_payload):
    pid = await _create_patient(client, patient_payload)
    resp = await client.post(
        f"/patients/{pid}/notes",
        json={"content": "Backdated", "timestamp": "2025-03-01T09:00:00Z"},
    )
    assert resp.status_code == 201
    assert resp.json()["created_at"].startswith("2025-03-01")


async def test_note_on_missing_patient_404(client):
    resp = await client.post(
        "/patients/00000000-0000-0000-0000-000000000000/notes", json={"content": "x"}
    )
    assert resp.status_code == 404


async def test_empty_note_422(client, patient_payload):
    pid = await _create_patient(client, patient_payload)
    resp = await client.post(f"/patients/{pid}/notes", json={"content": ""})
    assert resp.status_code == 422


async def test_delete_patient_cascades_notes(client, patient_payload):
    pid = await _create_patient(client, patient_payload)
    await client.post(f"/patients/{pid}/notes", json={"content": "note"})
    assert (await client.delete(f"/patients/{pid}")).status_code == 204
    # The patient (and its cascaded notes) are gone.
    assert (await client.get(f"/patients/{pid}/notes")).status_code == 404
