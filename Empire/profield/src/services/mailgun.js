// Email service — calls the Aqua Logic Plumbing email proxy server
// The proxy runs on the same host at /api/send-estimate
// This keeps the Mailgun API key server-side and never exposes it in browser code.

const PROXY_BASE = '/api';

/**
 * Send an estimate email via the Aqua Logic Plumbing email proxy
 * @param {Object} estimate - The estimate object
 * @param {string} subject - Email subject
 * @param {string} body - Email body text
 * @returns {Promise<{success: boolean, message: string, id?: string}>}
 */
export async function sendEstimateEmail(estimate, subject, body) {
  const to = estimate.client_email;
  if (!to) {
    return { success: false, message: 'No email address on file for this client.' };
  }

  const html = buildEstimateHtml(estimate, body);

  try {
    const resp = await fetch(`${PROXY_BASE}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        cc: estimate.cc || '',
        bcc: estimate.bcc || '',
        subject,
        text: body,
        html,
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      if (data.success) {
        return { success: true, message: data.message || 'Email sent!', id: data.id };
      }
      return { success: false, message: data.message || 'Failed to send email.' };
    }

    const errText = await resp.text();
    console.error('Email proxy error:', resp.status, errText);
    return { success: false, message: `Server error (${resp.status}). Please try again.` };
  } catch (err) {
    console.error('Email send failed:', err);
    return { success: false, message: 'Cannot reach email server. Check your connection.' };
  }
}

/**
 * Send an invoice email via the Aqua Logic Plumbing email proxy
 * @param {Object} invoice - The invoice object
 * @param {string} subject - Email subject
 * @param {string} body - Email body text
 * @returns {Promise<{success: boolean, message: string, id?: string}>}
 */
export async function sendInvoiceEmail(invoice, subject, body) {
  const to = invoice.client_email;
  if (!to) {
    return { success: false, message: 'No email address on file for this client.' };
  }

  const html = buildInvoiceHtml(invoice, body);

  try {
    const resp = await fetch(`${PROXY_BASE}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        cc: invoice.cc || '',
        bcc: invoice.bcc || '',
        subject,
        text: body,
        html,
      }),
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.success) return { success: true, message: data.message || 'Email sent!', id: data.id };
      return { success: false, message: data.message || 'Failed to send email.' };
    }
    const errText = await resp.text();
    console.error('Email proxy error:', resp.status, errText);
    return { success: false, message: `Server error (${resp.status}). Please try again.` };
  } catch (err) {
    console.error('Email send failed:', err);
    return { success: false, message: 'Cannot reach email server. Check your connection.' };
  }
}

/**
 * Send a job update email via the Aqua Logic Plumbing email proxy
 * @param {Object} job - The job object
 * @param {string} subject - Email subject
 * @param {string} body - Email body text
 * @returns {Promise<{success: boolean, message: string, id?: string}>}
 */
export async function sendJobEmail(job, subject, body) {
  const to = job.client_email;
  if (!to) {
    return { success: false, message: 'No email address on file for this client.' };
  }

  const html = buildJobHtml(job, body);

  try {
    const resp = await fetch(`${PROXY_BASE}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        cc: job.cc || '',
        bcc: job.bcc || '',
        subject,
        text: body,
        html,
      }),
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.success) return { success: true, message: data.message || 'Email sent!', id: data.id };
      return { success: false, message: data.message || 'Failed to send email.' };
    }
    const errText = await resp.text();
    console.error('Email proxy error:', resp.status, errText);
    return { success: false, message: `Server error (${resp.status}). Please try again.` };
  } catch (err) {
    console.error('Email send failed:', err);
    return { success: false, message: 'Cannot reach email server. Check your connection.' };
  }
}

function buildEstimateHtml(estimate, bodyText) {
  const lineItemsHtml = (estimate.line_items || [])
    .map(item => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;font-size:14px;">${item.description || ''}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;font-size:14px;">${item.quantity || 1}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;font-size:14px;">$${(item.unit_price || 0).toFixed(2)}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;font-size:14px;font-weight:600;">$${(item.total || 0).toFixed(2)}</td>
      </tr>
    `).join('');

  const helloLine = (bodyText || '').split('\n')[0] || '';
  const bodyRest = (bodyText || '').split('\n').slice(1).join('\n') || '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;background:#f9fafb;">
  <div style="background:#2563eb;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:-0.5px;">Estimate #${estimate.estimate_number}</h1>
    <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">${estimate.service_type || 'Field Services'}</p>
  </div>
  <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:28px;border-radius:0 0 8px 8px;">

    <p style="font-size:15px;line-height:1.6;color:#374151;">${helloLine || 'Dear Valued Client,'}</p>
    ${bodyRest ? `<p style="font-size:14px;line-height:1.7;color:#4b5563;white-space:pre-line;">${bodyRest}</p>` : ''}

    ${estimate.title ? `<h2 style="color:#2563eb;margin:20px 0 12px;font-size:18px;">${estimate.title}</h2>` : ''}
    ${estimate.service_address ? `<p style="color:#6b7280;font-size:13px;margin:0 0 16px;"><strong>Service Address:</strong> ${estimate.service_address}</p>` : ''}

    ${lineItemsHtml ? `
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:8px 0;text-align:left;border-bottom:2px solid #d1d5db;color:#374151;">Item</th>
          <th style="padding:8px 0;text-align:center;border-bottom:2px solid #d1d5db;color:#374151;width:50px;">Qty</th>
          <th style="padding:8px 0;text-align:right;border-bottom:2px solid #d1d5db;color:#374151;width:80px;">Price</th>
          <th style="padding:8px 0;text-align:right;border-bottom:2px solid #d1d5db;color:#374151;width:80px;">Total</th>
        </tr>
      </thead>
      <tbody>${lineItemsHtml}</tbody>
    </table>` : ''}

    <div style="text-align:right;margin-top:16px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:14px;line-height:2;color:#374151;">
      ${(estimate.subtotal > 0) ? `<p style="margin:0;">Subtotal: <strong>$${(estimate.subtotal || 0).toFixed(2)}</strong></p>` : ''}
      ${(estimate.tax_rate > 0) ? `<p style="margin:0;">Tax (${estimate.tax_rate}%): <strong>$${(estimate.tax_amount || 0).toFixed(2)}</strong></p>` : ''}
      ${(estimate.discount_amount > 0) ? `<p style="margin:0;">Discount: <strong>-$${(estimate.discount_amount || 0).toFixed(2)}</strong></p>` : ''}
      <p style="font-size:20px;border-top:2px solid #2563eb;padding-top:10px;margin:10px 0 0;color:#2563eb;">
        Total: <strong>$${(estimate.total_amount || 0).toFixed(2)}</strong>
      </p>
    </div>

    <div style="margin-top:28px;padding:20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;text-align:center;">
      <p style="margin:0 0 14px;font-weight:600;color:#166534;font-size:15px;">Ready to approve?</p>
      <a href="https://profield.duckdns.org/action/approve?id=${estimate.id}"
         style="display:inline-block;background:#16a34a;color:#fff;padding:10px 28px;border-radius:6px;text-decoration:none;font-weight:600;margin-right:10px;font-size:14px;">
        ✓ Approve
      </a>
      <a href="https://profield.duckdns.org/action/decline?id=${estimate.id}"
         style="display:inline-block;background:#fff;color:#dc2626;border:2px solid #dc2626;padding:8px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">
        ✗ Decline
      </a>
      <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">Or reply to this email with "Approved" or "Declined"</p>
    </div>

    ${estimate.terms ? `<p style="margin-top:20px;padding:14px;background:#f9fafb;border-radius:6px;font-size:13px;color:#6b7280;line-height:1.6;">${estimate.terms}</p>` : ''}
    ${estimate.notes ? `<p style="margin-top:12px;padding:14px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;font-size:13px;color:#92400e;line-height:1.6;"><strong>Notes:</strong> ${estimate.notes}</p>` : ''}

    <p style="margin-top:28px;font-size:12px;color:#9ca3af;text-align:center;border-top:1px solid #e5e7eb;padding-top:16px;">
      Sent via Aqua Logic Plumbing — Field Service Management
    </p>
  </div>
</body>
</html>`;
}

/**
 * Build an HTML email template for an invoice
 */
function buildInvoiceHtml(invoice, bodyText) {
  const lineItemsHtml = (invoice.line_items || [])
    .map(item => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;font-size:14px;">${item.description || ''}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;font-size:14px;">${item.quantity || 1}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;font-size:14px;">$${(item.unit_price || 0).toFixed(2)}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;font-size:14px;font-weight:600;">$${(item.total || 0).toFixed(2)}</td>
      </tr>
    `).join('');

  const helloLine = (bodyText || '').split('\n')[0] || '';
  const bodyRest = (bodyText || '').split('\n').slice(1).join('\n') || '';
  const totalAmount = invoice.total_amount || 0;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;background:#f9fafb;">
  <div style="background:#1e40af;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:-0.5px;">Invoice #${invoice.invoice_number}</h1>
    <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">${invoice.title || 'Services'}</p>
  </div>
  <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:28px;border-radius:0 0 8px 8px;">

    <p style="font-size:15px;line-height:1.6;color:#374151;">${helloLine || 'Dear Valued Client,'}</p>
    ${bodyRest ? `<p style="font-size:14px;line-height:1.7;color:#4b5563;white-space:pre-line;">${bodyRest}</p>` : ''}

    ${invoice.service_address ? `<p style="color:#6b7280;font-size:13px;margin:0 0 16px;"><strong>Service Address:</strong> ${invoice.service_address}</p>` : ''}

    ${lineItemsHtml ? `
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:8px 0;text-align:left;border-bottom:2px solid #d1d5db;color:#374151;">Item</th>
          <th style="padding:8px 0;text-align:center;border-bottom:2px solid #d1d5db;color:#374151;width:50px;">Qty</th>
          <th style="padding:8px 0;text-align:right;border-bottom:2px solid #d1d5db;color:#374151;width:80px;">Price</th>
          <th style="padding:8px 0;text-align:right;border-bottom:2px solid #d1d5db;color:#374151;width:80px;">Total</th>
        </tr>
      </thead>
      <tbody>${lineItemsHtml}</tbody>
    </table>` : ''}

    <div style="text-align:right;margin-top:16px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:14px;line-height:2;color:#374151;">
      ${(invoice.subtotal > 0) ? `<p style="margin:0;">Subtotal: <strong>$${(invoice.subtotal || 0).toFixed(2)}</strong></p>` : ''}
      ${(invoice.tax_rate > 0) ? `<p style="margin:0;">Tax (${invoice.tax_rate}%): <strong>$${(invoice.tax_amount || 0).toFixed(2)}</strong></p>` : ''}
      ${(invoice.discount_amount > 0) ? `<p style="margin:0;">Discount: <strong>-$${(invoice.discount_amount || 0).toFixed(2)}</strong></p>` : ''}
      <p style="font-size:18px;border-top:2px solid #1e40af;padding-top:10px;margin:10px 0 0;color:#1e40af;">
        Total: <strong>$${totalAmount.toFixed(2)}</strong>
      </p>
      ${invoice.due_date ? `<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Due Date: ${invoice.due_date}</p>` : ''}
      ${invoice.notes ? `<p style="margin:8px 0 0;font-size:13px;color:#374151;"><strong>Notes:</strong> ${invoice.notes}</p>` : ''}
    </div>

    <div style="margin-top:28px;padding:20px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;text-align:center;">
      <p style="margin:0 0 14px;font-weight:600;color:#1e40af;font-size:15px;">Pay Your Invoice</p>
      <p style="margin:0;font-size:13px;color:#6b7280;">Please submit payment at your earliest convenience. Contact us if you have any questions.</p>
    </div>

    <p style="margin-top:28px;font-size:12px;color:#9ca3af;text-align:center;border-top:1px solid #e5e7eb;padding-top:16px;">
      Sent via Aqua Logic Plumbing — Field Service Management
    </p>
  </div>
</body>
</html>`;
}

function buildJobHtml(job, bodyText) {
  const updatesHtml = (job.updates || [])
    .map(u => `<div style="padding:8px 0;border-bottom:1px solid #eee;"><p style="margin:0;font-size:14px;">${u.text}</p><p style="margin:2px 0 0;font-size:12px;color:#9ca3af;">${u.author} — ${new Date(u.timestamp).toLocaleString()}</p></div>`)
    .join('');

  const helloLine = (bodyText || '').split('\n')[0] || '';
  const bodyRest = (bodyText || '').split('\n').slice(1).join('\n') || '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;background:#f9fafb;">
  <div style="background:#059669;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:-0.5px;">Job Update — ${job.job_number}</h1>
    <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">${job.title || 'Field Services'}</p>
  </div>
  <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:28px;border-radius:0 0 8px 8px;">

    <p style="font-size:15px;line-height:1.6;color:#374151;">${helloLine || 'Dear Valued Client,'}</p>
    ${bodyRest ? `<p style="font-size:14px;line-height:1.7;color:#4b5563;white-space:pre-line;">${bodyRest}</p>` : ''}

    <div style="margin-top:20px;padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
      <p style="margin:0 0 8px;font-weight:600;color:#166534;">Job Status: ${job.status?.replace(/_/g, ' ')}</p>
      ${job.technician ? `<p style="margin:0;font-size:13px;color:#374151;"><strong>Technician:</strong> ${job.technician}</p>` : ''}
      ${job.service_address ? `<p style="margin:4px 0 0;font-size:13px;color:#374151;"><strong>Service Address:</strong> ${job.service_address}</p>` : ''}
    </div>

    ${updatesHtml ? `
    <div style="margin-top:20px;">
      <h3 style="font-size:14px;font-weight:600;color:#374151;margin:0 0 8px;">Updates & Activity</h3>
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;">${updatesHtml}</div>
    </div>` : ''}

    <p style="margin-top:28px;font-size:12px;color:#9ca3af;text-align:center;border-top:1px solid #e5e7eb;padding-top:16px;">
      Sent via Aqua Logic Plumbing — Field Service Management
    </p>
  </div>
</body>
</html>`;
}
