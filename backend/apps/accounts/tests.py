from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class AccountSystemTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="tester@example.com",
            password="testpassword123",
            first_name="Test",
            last_name="User",
        )

    def test_register_success(self):
        payload = {
            "email": "newuser@example.com",
            "password": "securepassword123",
            "first_name": "New",
            "last_name": "Shopper",
        }
        res = self.client.post("/api/auth/register/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)
        self.assertEqual(res.data["user"]["email"], "newuser@example.com")

    def test_login_success_and_failure(self):
        # Valid login
        res = self.client.post(
            "/api/auth/token/",
            {"email": "tester@example.com", "password": "testpassword123"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("access", res.data)

        # Invalid login
        res_fail = self.client.post(
            "/api/auth/token/",
            {"email": "tester@example.com", "password": "wrongpassword"},
            format="json",
        )
        self.assertEqual(res_fail.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_address_lifecycle(self):
        self.client.force_authenticate(user=self.user)
        # Create address
        payload = {
            "label": "Home",
            "recipient": "Test User",
            "line1": "789 Pine Street",
            "city": "Seattle",
            "postal_code": "98101",
            "country": "US",
            "is_default": True,
        }
        create_res = self.client.post("/api/addresses/", payload, format="json")
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        addr_id = create_res.data["id"]

        # List addresses
        list_res = self.client.get("/api/addresses/")
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_res.data), 1)

        # Delete address
        del_res = self.client.delete(f"/api/addresses/{addr_id}/")
        self.assertEqual(del_res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(self.user.addresses.count(), 0)
