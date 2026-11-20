from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import User
from apps.catalog.models import Category, Product, ProductVariant, Color, Size
from apps.core.emails import (
    get_email_provider,
    MockEmailProvider,
    ResendEmailProvider,
    SmtpEmailProvider,
    build_order_confirmation_email,
    build_payment_receipt_email,
    build_order_shipped_email,
    build_contact_acknowledgement_email,
)
from apps.orders.models import Cart, CartItem, Order, OrderItem


class TransactionalEmailTests(TestCase):
    def setUp(self):
        MockEmailProvider.reset_outbox()
        self.client = APIClient()

        self.category = Category.objects.create(name="Apparel", slug="apparel")
        self.color = Color.objects.create(name="Onyx", hex="#000000")
        self.size = Size.objects.create(name="M", sort_order=1)
        self.product = Product.objects.create(
            name="Tailored Wool Blazer",
            slug="tailored-wool-blazer",
            category=self.category,
            base_price=4500.00,
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            color=self.color,
            size=self.size,
            sku="TWB-BLK-M",
            price_override=4500.00,
            stock=10,
        )
        self.customer = User.objects.create_user(
            email="client@example.ph",
            password="testpassword123",
            first_name="Camila",
            last_name="Reyes",
        )
        self.staff_user = User.objects.create_superuser(
            email="atelier.manager@studio.test",
            password="testpassword123",
            first_name="Admin",
            last_name="Staff",
        )

    def test_email_provider_factory(self):
        """Provider factory resolves mock, resend, and smtp cleanly."""
        mock_p = get_email_provider("mock")
        self.assertIsInstance(mock_p, MockEmailProvider)

        resend_p = get_email_provider("resend")
        self.assertIsInstance(resend_p, ResendEmailProvider)

        smtp_p = get_email_provider("smtp")
        self.assertIsInstance(smtp_p, SmtpEmailProvider)

    def test_template_builders_render_correctly(self):
        """Email templates format headers, amounts, and recipient text."""
        order = Order.objects.create(
            order_number="STU-99001",
            customer_email="camila@example.ph",
            customer_name="Camila Reyes",
            status=Order.STATUS_PAID,
            total=4500.00,
            subtotal=4500.00,
            shipping=0.00,
            tax=0.00,
            shipping_method="standard",
            shipping_address={"recipient": "Camila Reyes", "city": "Makati"},
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            product_name=self.product.name,
            sku=self.variant.sku,
            color_name=self.color.name,
            size_name=self.size.name,
            unit_price=4500.00,
            quantity=1,
        )

        # 1. Order confirmation
        conf = build_order_confirmation_email(order)
        self.assertEqual(conf.to_email, "camila@example.ph")
        self.assertIn("STU-99001", conf.subject)
        self.assertIn("Tailored Wool Blazer", conf.html_body)

        # 2. Payment receipt
        rec = build_payment_receipt_email(order, transaction_id="pay_tx_123")
        self.assertEqual(rec.to_email, "camila@example.ph")
        self.assertIn("Payment Receipt", rec.subject)
        self.assertIn("pay_tx_123", rec.html_body)

        # 3. Order shipped
        shipped = build_order_shipped_email(order, tracking_number="LBC99887766", carrier="LBC Express")
        self.assertEqual(shipped.to_email, "camila@example.ph")
        self.assertIn("Has Shipped", shipped.subject)
        self.assertIn("LBC99887766", shipped.html_body)

        # 4. Contact acknowledgment
        ack = build_contact_acknowledgement_email("Camila", "camila@example.ph", "Sizing Advice", "Inquiry content")
        self.assertEqual(ack.to_email, "camila@example.ph")
        self.assertIn("Sizing Advice", ack.html_body)

    def test_checkout_dispatches_order_confirmation(self):
        """Placing an order triggers email dispatch to the buyer's email."""
        MockEmailProvider.reset_outbox()
        cart = Cart.objects.create(user=self.customer)
        CartItem.objects.create(cart=cart, variant=self.variant, quantity=1)

        self.client.force_authenticate(user=self.customer)
        res = self.client.post(
            "/api/checkout/place-order/",
            {
                "customer_email": "camila@example.ph",
                "customer_name": "Camila Reyes",
                "shipping_method": "standard",
                "shipping_address": {
                    "recipient": "Camila Reyes",
                    "street1": "Salcedo Village",
                    "city": "Makati",
                    "country": "PH",
                },
                "payment": {
                    "provider": "mock",
                    "method": "card",
                    "number": "4242 4242 4242 4242",
                },
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # Verify MockEmailProvider caught the outbox emails
        sent_emails = MockEmailProvider.outbox
        self.assertGreaterEqual(len(sent_emails), 1)
        recipients = [m["to"] for m in sent_emails]
        self.assertIn("camila@example.ph", recipients)

    def test_admin_shipping_status_triggers_email(self):
        """Updating status to shipped in admin triggers customer dispatch notification."""
        order = Order.objects.create(
            order_number="STU-99002",
            customer_email="buyer@example.ph",
            customer_name="Buyer Client",
            status=Order.STATUS_PAID,
            total=4500.00,
            subtotal=4500.00,
            shipping=0.00,
            tax=0.00,
        )
        MockEmailProvider.reset_outbox()

        self.client.force_authenticate(user=self.staff_user)
        res = self.client.patch(
            f"/api/admin/orders/{order.order_number}/",
            {
                "status": "shipped",
                "tracking_number": "LBC-55443322",
                "carrier": "LBC Express",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        shipped_emails = [m for m in MockEmailProvider.outbox if "Has Shipped" in m["subject"]]
        self.assertEqual(len(shipped_emails), 1)
        self.assertEqual(shipped_emails[0]["to"], "buyer@example.ph")
        self.assertIn("LBC-55443322", shipped_emails[0]["html"])

    def test_public_contact_endpoint(self):
        """POST /api/contact/ validates input and dispatches confirmation email."""
        MockEmailProvider.reset_outbox()

        # 1. Validation failure on invalid email
        res_bad = self.client.post(
            "/api/contact/",
            {"name": "Client", "email": "bad-email", "message": "Hello studio"},
            format="json",
        )
        self.assertEqual(res_bad.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", res_bad.data["errors"])

        # 2. Success submission
        res_ok = self.client.post(
            "/api/contact/",
            {
                "name": "Isabel Santos",
                "email": "isabel@atelier.test",
                "subject": "Order Inquiries",
                "message": "Looking forward to hearing about custom sizing options.",
                "order_number": "STU-10024",
            },
            format="json",
        )
        self.assertEqual(res_ok.status_code, status.HTTP_200_OK)
        self.assertTrue(res_ok.data["ok"])

        # Both the client acknowledgment and concierge notification should be sent
        outbox = MockEmailProvider.outbox
        self.assertEqual(len(outbox), 2)
        client_mail = next(m for m in outbox if m["to"] == "isabel@atelier.test")
        self.assertIn("We have received your message", client_mail["subject"])
