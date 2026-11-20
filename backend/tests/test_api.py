PNG_1PX = bytes.fromhex(
    "89504e470d0a1a0a0000000d4948445200000001000000010806000000"
    "1f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082"
)


def test_bootstrap_has_seeded_content(client):
    data = client.get("/api/public/bootstrap").json()
    assert len(data["divisions"]) == 4
    assert len(data["services"]) == 13
    assert len(data["plans"]) == 3
    assert data["team"][0]["name"] == "Adrian Alejandro Ruiz Carreño"
    assert data["site"]["contact"]["whatsapp"].isdigit()
    assert data["projects"][0]["image"].startswith("/assets/img/")
    assert data["team"][0]["image"].startswith("/uploads/")
    assert client.get(data["team"][0]["image"]).status_code == 200


def test_admin_requires_token(client):
    assert client.get("/api/admin/leads").status_code == 401
    assert client.get("/api/admin/leads", headers={"Authorization": "Bearer basura"}).status_code == 401


def test_login_rejects_bad_password(client):
    r = client.post("/api/auth/login", json={"email": "admin@netsurex.test", "password": "incorrecta"})
    assert r.status_code == 401


def test_quote_estimate(client):
    r = client.post("/api/public/quote/estimate", json={"mode": "cctv", "cameras": 4, "camera_type": "ip", "remote": True})
    body = r.json()
    assert r.status_code == 200
    assert 0 < body["low"] < body["high"]
    r = client.post("/api/public/quote/estimate", json={"mode": "software", "software_type": "ecommerce"})
    assert r.json()["low"] == 1500


def test_lead_flow(client, auth):
    r = client.post(
        "/api/public/leads",
        json={"kind": "contact", "profile": "B2C", "name": "Ana Pérez", "email": "ana@example.com",
              "service_id": "cctv", "message": "Quiero 4 cámaras para mi casa."},
    )
    assert r.status_code == 201, r.text
    lead_id = r.json()["id"]

    leads = client.get("/api/admin/leads", headers=auth).json()
    lead = next(x for x in leads if x["id"] == lead_id)
    assert lead["service_title"] == "Videovigilancia Inteligente (CCTV)"
    assert lead["status"] == "nuevo"

    r = client.patch(f"/api/admin/leads/{lead_id}", json={"status": "contactado"}, headers=auth)
    assert r.json()["status"] == "contactado"


def test_quote_lead_stores_server_estimate(client, auth):
    r = client.post(
        "/api/public/leads",
        json={"kind": "quote", "profile": "B2B", "name": "Empresa SAC", "email": "compras@example.com",
              "quote": {"mode": "software", "software_type": "mobileApp"}},
    )
    assert r.status_code == 201, r.text
    assert r.json()["estimate"]["low"] == 2500


def test_lead_validation_and_honeypot(client):
    base = {"name": "Bot", "email": "bot@example.com", "message": "hola hola"}
    assert client.post("/api/public/leads", json=base | {"website": "spam.com"}).status_code == 400
    assert client.post("/api/public/leads", json=base | {"email": "no-es-email"}).status_code == 422
    assert client.post("/api/public/leads", json=base | {"service_id": "no-existe"}).status_code == 422


def test_lead_rate_limit(client):
    payload = {"name": "Spam", "email": "s@example.com", "message": "mensaje de prueba"}
    codes = [client.post("/api/public/leads", json=payload).status_code for _ in range(7)]
    assert codes[:5] == [201] * 5 and codes[-1] == 429


def test_order_tracking(client, auth):
    r = client.post("/api/admin/orders", json={"kind": "Reparación", "item": "Laptop HP", "customer_name": "Luis",
                                               "customer_contact": "999", "internal_note": "pago pendiente"}, headers=auth)
    assert r.status_code == 201
    order = r.json()
    assert order["code"].startswith("NSX-")

    r = client.patch(f"/api/admin/orders/{order['id']}", json={"stage": 2, "public_note": "Cambio de pantalla"}, headers=auth)
    assert r.json()["stage"] == 2

    public = client.get(f"/api/public/orders/{order['code'].lower()}").json()
    assert public["stage"] == 2
    assert [e["stage"] for e in public["history"]] == [0, 2]
    assert "customer_name" not in public and "internal_note" not in public
    assert client.get("/api/public/orders/NSX-NOEXISTE").status_code == 404


def test_content_crud_reflects_on_site(client, auth):
    r = client.post("/api/admin/services", json={"division_id": "soporte", "title": "Recuperación de Datos Avanzada",
                                                 "audience": "B2C", "tags": ["Discos", "SSD"]}, headers=auth)
    assert r.status_code == 201, r.text
    sid = r.json()["id"]
    assert sid == "recuperacion-de-datos-avanzada"
    assert any(s["id"] == sid for s in client.get("/api/public/bootstrap").json()["services"])

    client.patch(f"/api/admin/services/{sid}", json={"published": False}, headers=auth)
    assert not any(s["id"] == sid for s in client.get("/api/public/bootstrap").json()["services"])

    assert client.delete(f"/api/admin/services/{sid}", headers=auth).status_code == 204
    # Una división con servicios no se puede borrar.
    assert client.delete("/api/admin/divisions/software", headers=auth).status_code == 409
    # Un servicio con división inexistente se rechaza.
    bad = client.post("/api/admin/services", json={"division_id": "nada", "title": "X"}, headers=auth)
    assert bad.status_code == 409


def test_settings_update(client, auth):
    site = client.get("/api/admin/settings/site", headers=auth).json()
    site["contact"]["phone_display"] = "+51 900 000 000"
    assert client.put("/api/admin/settings/site", json=site, headers=auth).status_code == 200
    assert client.get("/api/public/bootstrap").json()["site"]["contact"]["phone_display"] == "+51 900 000 000"

    site["contact"]["whatsapp"] = "+51 900"
    assert client.put("/api/admin/settings/site", json=site, headers=auth).status_code == 422

    quote = client.get("/api/admin/settings/quote", headers=auth).json()
    quote["software"]["landing"] = [400, 800]
    client.put("/api/admin/settings/quote", json=quote, headers=auth)
    r = client.post("/api/public/quote/estimate", json={"mode": "software", "software_type": "landing"})
    assert r.json()["low"] == 400
    del quote["cctv"]["recorder"]
    assert client.put("/api/admin/settings/quote", json=quote, headers=auth).status_code == 422


def test_upload_validates_images(client, auth):
    r = client.post("/api/admin/uploads", files={"file": ("x.png", PNG_1PX, "image/png")}, headers=auth)
    assert r.status_code == 200
    assert client.get(r.json()["url"]).status_code == 200
    r = client.post("/api/admin/uploads", files={"file": ("x.png", b"<svg onload=alert(1)>", "image/png")}, headers=auth)
    assert r.status_code == 415


def test_change_password(client, auth):
    r = client.post("/api/auth/password", json={"current_password": "mala", "new_password": "otra-clave-larga"}, headers=auth)
    assert r.status_code == 400


def test_lead_from_html_form(client, auth):
    r = client.post("/api/public/leads/form", data={"kind": "diagnosis", "profile": "B2C", "name": "Rosa Díaz",
                                                    "email": "rosa@example.com", "service_id": "reparacion-hardware",
                                                    "message": "La laptop no enciende."})
    assert r.status_code == 201, r.text
    lead = next(x for x in client.get("/api/admin/leads", headers=auth).json() if x["id"] == r.json()["id"])
    assert lead["kind"] == "diagnosis" and lead["service_title"] == "Reparación de Hardware"
    bad = client.post("/api/public/leads/form", data={"name": "X", "email": "no", "message": "hola hola"})
    assert bad.status_code == 422


def test_division_and_step_images(client):
    data = client.get("/api/public/bootstrap").json()
    assert all(d["image"] for d in data["divisions"])
    assert all(m["image"] for m in data["methodology"])
