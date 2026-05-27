async def test_summary_template(client, patient_payload):
    payload = {**patient_payload, "conditions": ["Asthma"], "allergies": ["Penicillin"]}
    pid = (await client.post("/patients", json=payload)).json()["id"]
    await client.post(f"/patients/{pid}/notes", json={"content": "Reviewed labs."})

    resp = await client.get(f"/patients/{pid}/summary")
    assert resp.status_code == 200
    data = resp.json()
    # No ANTHROPIC_API_KEY in tests => deterministic template.
    assert data["source"] == "template"
    assert "Test Patient" in data["narrative"]
    assert "Asthma" in data["narrative"]
    assert "Penicillin" in data["narrative"]
