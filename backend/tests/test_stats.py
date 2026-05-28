async def _create(client, payload, **overrides):
    resp = await client.post("/patients", json={**payload, **overrides})
    assert resp.status_code == 201
    return resp.json()


async def test_stats_empty(client):
    body = (await client.get("/patients/stats")).json()
    assert body["total"] == 0
    # Every category is zero-filled even with no data.
    assert set(body["by_status"]) == {"active", "inactive", "discharged"}
    assert all(v == 0 for v in body["by_status"].values())
    assert len(body["by_blood_type"]) == 8
    assert [b["label"] for b in body["by_age_group"]] == [
        "0-17",
        "18-34",
        "35-49",
        "50-64",
        "65+",
    ]
    assert body["top_conditions"] == []


async def test_stats_aggregates(client, patient_payload):
    await _create(client, patient_payload, email="a@example.com", status="active",
                  date_of_birth="1990-05-15", blood_type="O+",
                  conditions=["Asthma", "Hypertension"])
    await _create(client, patient_payload, email="b@example.com", status="inactive",
                  date_of_birth="2015-01-01", blood_type="A+", conditions=["Asthma"])
    await _create(client, patient_payload, email="c@example.com", status="discharged",
                  date_of_birth="1945-01-01", blood_type="O+", conditions=[])

    body = (await client.get("/patients/stats")).json()

    assert body["total"] == 3
    assert sum(body["by_status"].values()) == body["total"]
    assert body["by_status"] == {"active": 1, "inactive": 1, "discharged": 1}
    assert body["by_blood_type"]["O+"] == 2
    assert body["by_blood_type"]["A+"] == 1

    age_counts = {b["label"]: b["count"] for b in body["by_age_group"]}
    assert age_counts["0-17"] == 1  # born 2015
    assert age_counts["65+"] == 1  # born 1945

    # Ordered by descending count, deduplicated across patients.
    top = body["top_conditions"]
    assert top[0] == {"condition": "Asthma", "count": 2}
    assert {"condition": "Hypertension", "count": 1} in top
