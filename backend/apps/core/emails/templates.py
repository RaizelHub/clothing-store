"""
Studio Atelier — Editorial Transactional Email Templates
Styled with minimal luxury aesthetics: monospaced accents, charcoal typography, clean borders.
"""
from typing import Optional
from .base import EmailMessage


def _wrap_html(content: str, preheader: str = "") -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body {{
      margin: 0;
      padding: 0;
      background-color: #f7f6f3;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1a1a1a;
      -webkit-font-smoothing: antialiased;
    }}
    .wrapper {{
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border: 1px solid #e7e5e4;
      border-radius: 2px;
      overflow: hidden;
    }}
    .header {{
      padding: 32px 36px 24px;
      border-bottom: 1px solid #f0eeeb;
      text-align: center;
    }}
    .wordmark {{
      font-size: 24px;
      letter-spacing: 0.12em;
      text-transform: lowercase;
      font-weight: 500;
      margin: 0;
      color: #111111;
    }}
    .tagline {{
      font-size: 9px;
      letter-spacing: 0.35em;
      text-transform: uppercase;
      color: #78716c;
      margin-top: 4px;
    }}
    .body {{
      padding: 36px;
    }}
    h1 {{
      font-size: 20px;
      font-weight: 400;
      letter-spacing: -0.01em;
      margin: 0 0 16px;
      color: #111111;
    }}
    p {{
      font-size: 13px;
      line-height: 1.6;
      color: #44403c;
      margin: 0 0 16px;
    }}
    .table {{
      width: 100%;
      border-collapse: collapse;
      margin: 24px 0;
      font-size: 13px;
    }}
    .table th {{
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: #78716c;
      padding-bottom: 10px;
      border-bottom: 1px solid #e7e5e4;
    }}
    .table td {{
      padding: 12px 0;
      border-bottom: 1px solid #f5f5f4;
      color: #292524;
    }}
    .totals-row td {{
      border-bottom: none;
      padding: 6px 0;
    }}
    .totals-final td {{
      border-top: 1px solid #111111;
      padding: 12px 0 0;
      font-weight: 600;
      font-size: 14px;
    }}
    .badge {{
      display: inline-block;
      padding: 4px 10px;
      background-color: #f5f5f4;
      border: 1px solid #e7e5e4;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: #292524;
      margin-bottom: 16px;
    }}
    .footer {{
      padding: 24px 36px;
      background-color: #fafaf9;
      border-top: 1px solid #f0eeeb;
      text-align: center;
      font-size: 11px;
      color: #a8a29e;
      line-height: 1.5;
    }}
    .footer a {{
      color: #78716c;
      text-decoration: underline;
    }}
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    {preheader}
  </div>
  <div class="wrapper">
    <div class="header">
      <div class="wordmark">studio</div>
      <div class="tagline">Atelier &bull; Manila</div>
    </div>
    <div class="body">
      {content}
    </div>
    <div class="footer">
      <p style="margin-bottom: 6px;">Studio Atelier Manila &bull; 118 Legaspi St., Legaspi Village, Makati City, Philippines</p>
      <p style="margin: 0;">Inquiries: <a href="mailto:concierge@studio-atelier.ph">concierge@studio-atelier.ph</a> &bull; +63 (2) 8812-7890</p>
    </div>
  </div>
</body>
</html>"""


def build_order_confirmation_email(order) -> EmailMessage:
    """Builds order placement confirmation email."""
    subject = f"Order Confirmation #{order.order_number} — Studio Atelier"
    recipient_name = order.customer_name or "Valued Client"
    
    items_html = ""
    items_text = ""
    for item in order.items.all():
        var_text = f"{item.color_name} / {item.size_name}"
        price_text = f"₱{item.unit_price:,.2f}"
        line_total = f"₱{(item.unit_price * item.quantity):,.2f}"
        items_html += f"""
        <tr>
          <td>
            <strong>{item.product_name}</strong><br />
            <span style="font-size:11px;color:#78716c;">{var_text} &bull; Qty: {item.quantity}</span>
          </td>
          <td style="text-align:right;">{line_total}</td>
        </tr>
        """
        items_text += f"- {item.product_name} ({var_text}) x{item.quantity} @ {price_text} = {line_total}\n"

    ship_addr = order.shipping_address or {}
    addr_line = ", ".join(filter(None, [
        ship_addr.get("street1"),
        ship_addr.get("city"),
        ship_addr.get("province"),
        ship_addr.get("postal_code"),
        ship_addr.get("country", "PH"),
    ]))

    content = f"""
    <div class="badge">Order Confirmed</div>
    <h1>Thank you for your order, {recipient_name}.</h1>
    <p>Your order <strong>#{order.order_number}</strong> has been received by our atelier. We are preparing your pieces with exceptional attention to craft and detail.</p>
    
    <table class="table">
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        {items_html}
        <tr class="totals-row">
          <td style="padding-top:16px;color:#78716c;">Subtotal</td>
          <td style="padding-top:16px;text-align:right;">₱{order.subtotal:,.2f}</td>
        </tr>
        <tr class="totals-row">
          <td style="color:#78716c;">Shipping ({order.shipping_method})</td>
          <td style="text-align:right;">{"Complimentary" if order.shipping == 0 else f"₱{order.shipping:,.2f}"}</td>
        </tr>
        {"<tr class='totals-row'><td style='color:#78716c;'>Discount</td><td style='text-align:right;color:#059669;'>-₱" + f"{order.discount:,.2f}</td></tr>" if order.discount > 0 else ""}
        <tr class="totals-row">
          <td style="color:#78716c;">Estimated Taxes</td>
          <td style="text-align:right;">₱{order.tax:,.2f}</td>
        </tr>
        <tr class="totals-final">
          <td>Total</td>
          <td style="text-align:right;">₱{order.total:,.2f}</td>
        </tr>
      </tbody>
    </table>

    <div style="background-color:#fafaf9;border:1px solid #f0eeeb;padding:16px;margin-top:24px;">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.15em;color:#78716c;margin-bottom:6px;">Delivery Address</div>
      <div style="font-size:12px;color:#1c1917;line-height:1.5;">
        <strong>{ship_addr.get('recipient', recipient_name)}</strong><br />
        {addr_line}
      </div>
    </div>
    """

    plain_text = f"""STUDIO ATELIER — ORDER CONFIRMATION #{order.order_number}

Dear {recipient_name},

Thank you for your order. We are preparing your selection with care.

ORDER DETAILS:
Order Number: #{order.order_number}
Date: {order.created_at.strftime('%B %d, %Y')}

ITEMS:
{items_text}
Subtotal: ₱{order.subtotal:,.2f}
Shipping: {"Complimentary" if order.shipping == 0 else f"₱{order.shipping:,.2f}"}
Total: ₱{order.total:,.2f}

DELIVERY DESTINATION:
{ship_addr.get('recipient', recipient_name)}
{addr_line}

Inquiries: concierge@studio-atelier.ph | +63 (2) 8812-7890
Studio Atelier Manila
"""

    return EmailMessage(
        to_email=order.customer_email,
        subject=subject,
        html_body=_wrap_html(content, preheader=f"Order #{order.order_number} confirmed with Studio Atelier"),
        text_body=plain_text,
        metadata={"order_number": order.order_number, "type": "order_confirmation"},
    )


def build_payment_receipt_email(order, transaction_id: Optional[str] = None, method_label: Optional[str] = None) -> EmailMessage:
    """Builds payment verified receipt email."""
    subject = f"Payment Receipt for Order #{order.order_number} — Studio Atelier"
    recipient_name = order.customer_name or "Valued Client"
    ref_id = transaction_id or order.payment_transaction_id or order.payment_reference or "N/A"
    method = method_label or order.payment_method or "Online Payment"

    content = f"""
    <div class="badge" style="background-color:#ecfdf5;border-color:#a7f3d0;color:#065f46;">Payment Verified</div>
    <h1>Payment Received</h1>
    <p>Dear {recipient_name}, your payment for order <strong>#{order.order_number}</strong> has been successfully verified.</p>
    
    <div style="background-color:#fafaf9;border:1px solid #f0eeeb;padding:18px;margin:20px 0;">
      <table style="width:100%;font-size:12px;color:#292524;">
        <tr>
          <td style="color:#78716c;padding:4px 0;">Order Reference:</td>
          <td style="text-align:right;font-weight:600;">#{order.order_number}</td>
        </tr>
        <tr>
          <td style="color:#78716c;padding:4px 0;">Payment Provider:</td>
          <td style="text-align:right;">{order.payment_provider.title()}</td>
        </tr>
        <tr>
          <td style="color:#78716c;padding:4px 0;">Payment Method:</td>
          <td style="text-align:right;">{method}</td>
        </tr>
        <tr>
          <td style="color:#78716c;padding:4px 0;">Transaction Ref:</td>
          <td style="text-align:right;font-family:monospace;">{ref_id}</td>
        </tr>
        <tr style="border-top:1px solid #e7e5e4;">
          <td style="padding:10px 0 0;font-weight:600;font-size:14px;">Total Amount Paid:</td>
          <td style="padding:10px 0 0;text-align:right;font-weight:600;font-size:14px;">₱{order.total:,.2f}</td>
        </tr>
      </table>
    </div>

    <p style="font-size:12px;color:#78716c;">Your order is now being processed by our packaging team. You will receive an additional notification with courier tracking details once dispatched.</p>
    """

    plain_text = f"""STUDIO ATELIER — PAYMENT RECEIPT

Dear {recipient_name},

Payment has been successfully verified for Order #{order.order_number}.

Payment Details:
- Order Number: #{order.order_number}
- Amount Paid: ₱{order.total:,.2f}
- Method: {method}
- Transaction Reference: {ref_id}

Our atelier is currently preparing your order.
Inquiries: concierge@studio-atelier.ph
"""

    return EmailMessage(
        to_email=order.customer_email,
        subject=subject,
        html_body=_wrap_html(content, preheader=f"Receipt for Order #{order.order_number} - Payment Verified"),
        text_body=plain_text,
        metadata={"order_number": order.order_number, "type": "payment_receipt"},
    )


def build_order_shipped_email(order, tracking_number: Optional[str] = None, carrier: Optional[str] = None) -> EmailMessage:
    """Builds order dispatch & tracking notification email."""
    subject = f"Your Studio Atelier Order #{order.order_number} Has Shipped"
    recipient_name = order.customer_name or "Valued Client"
    track_no = tracking_number or order.tracking_number or "Tracking will update shortly"
    courier_name = carrier or order.carrier or "LBC Express"

    content = f"""
    <div class="badge" style="background-color:#eff6ff;border-color:#bfdbfe;color:#1e40af;">Dispatched</div>
    <h1>Your Pieces Are on the Way</h1>
    <p>Dear {recipient_name}, your order <strong>#{order.order_number}</strong> has departed our studio and is in transit with our logistics partner.</p>
    
    <div style="background-color:#fafaf9;border:1px solid #f0eeeb;padding:18px;margin:20px 0;">
      <table style="width:100%;font-size:12px;color:#292524;">
        <tr>
          <td style="color:#78716c;padding:4px 0;">Courier Partner:</td>
          <td style="text-align:right;font-weight:600;">{courier_name}</td>
        </tr>
        <tr>
          <td style="color:#78716c;padding:4px 0;">Tracking Number:</td>
          <td style="text-align:right;font-family:monospace;font-weight:600;">{track_no}</td>
        </tr>
        <tr>
          <td style="color:#78716c;padding:4px 0;">Estimated Delivery:</td>
          <td style="text-align:right;">1–3 business days (Metro Manila) / 3–5 business days (Provincial)</td>
        </tr>
      </table>
    </div>

    <p style="font-size:12px;color:#78716c;">Each piece is sealed in our dust-resistant garment bags. Please ensure someone is available at the delivery destination to accept the parcel.</p>
    """

    plain_text = f"""STUDIO ATELIER — ORDER DISPATCHED

Dear {recipient_name},

Your order #{order.order_number} has shipped.

Courier: {courier_name}
Tracking Number: {track_no}
Estimated Transit: 1-3 business days (Metro Manila) / 3-5 business days (Provincial)

Inquiries: concierge@studio-atelier.ph
"""

    return EmailMessage(
        to_email=order.customer_email,
        subject=subject,
        html_body=_wrap_html(content, preheader=f"Order #{order.order_number} has shipped via {courier_name}"),
        text_body=plain_text,
        metadata={"order_number": order.order_number, "type": "order_shipped"},
    )


def build_contact_acknowledgement_email(name: str, email: str, subject_text: str, message: str) -> EmailMessage:
    """Builds customer confirmation for concierge contact submissions."""
    subject = f"We have received your message — Studio Atelier Concierge"
    
    content = f"""
    <div class="badge">Concierge Inquiry</div>
    <h1>Thank you for reaching out, {name}.</h1>
    <p>Our client services team has received your message regarding <strong>{subject_text}</strong>. A concierge specialist will review your request and get back to you within 24 business hours.</p>
    
    <div style="background-color:#fafaf9;border:1px solid #f0eeeb;padding:16px;margin:20px 0;font-size:12px;color:#57534e;font-style:italic;">
      "{message}"
    </div>

    <p style="font-size:12px;color:#78716c;">If this inquiry is urgent regarding a pending delivery, you may also reach our studio directly at +63 (2) 8812-7890 (Monday–Saturday, 9:00 AM – 6:00 PM PHT).</p>
    """

    plain_text = f"""STUDIO ATELIER — CONCIERGE INQUIRY CONFIRMATION

Dear {name},

Thank you for reaching out to Studio Atelier Concierge. We have received your inquiry regarding: "{subject_text}".

Our team will respond to you within 24 hours.
Direct studio telephone: +63 (2) 8812-7890
"""

    return EmailMessage(
        to_email=email,
        subject=subject,
        html_body=_wrap_html(content, preheader="Your message has been received by Studio Atelier Concierge"),
        text_body=plain_text,
        metadata={"type": "contact_acknowledgement"},
    )
