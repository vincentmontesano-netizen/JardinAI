export type SendEmailResult = {
  delivered: boolean;
  provider: "resend" | "console";
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || "Jardinia Studio <onboarding@resend.dev>";
  const html =
    params.html ??
    `<div style="font-family:sans-serif;line-height:1.5;color:#111">${escapeHtml(params.text).replace(/\n/g, "<br/>")}</div>`;

  if (!apiKey) {
    console.log(
      `[Mail] Service non configuré — message pour ${params.to}\nSujet: ${params.subject}\n\n${params.text}`
    );
    return { delivered: false, provider: "console" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        html,
        text: params.text,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(`[Mail] Échec envoi (${response.status}): ${detail}`);
      return { delivered: false, provider: "resend" };
    }

    return { delivered: true, provider: "resend" };
  } catch (error) {
    console.warn("[Mail] Erreur réseau:", error);
    return { delivered: false, provider: "resend" };
  }
}

export function buildUserNotificationEmail(params: {
  userName: string;
  subject: string;
  message: string;
  temporaryPassword?: string;
  appName?: string;
}): { subject: string; text: string; html: string } {
  const app = params.appName ?? "Jardinia Studio";
  const lines = [`Bonjour ${params.userName},`, "", params.message];

  if (params.temporaryPassword) {
    lines.push(
      "",
      "Votre mot de passe a été réinitialisé par un administrateur.",
      `Nouveau mot de passe temporaire : ${params.temporaryPassword}`,
      "",
      "Connectez-vous puis changez-le dès que possible."
    );
  }

  lines.push("", `— L'équipe ${app}`);

  const text = lines.join("\n");
  const html = `
    <div style="font-family:sans-serif;line-height:1.6;color:#1a1a1a;max-width:560px">
      <p>Bonjour <strong>${escapeHtml(params.userName)}</strong>,</p>
      <p>${escapeHtml(params.message).replace(/\n/g, "<br/>")}</p>
      ${
        params.temporaryPassword
          ? `<p style="margin-top:1.25rem;padding:12px 16px;background:#f4f4f5;border-radius:8px">
              <strong>Mot de passe temporaire :</strong>
              <code style="font-size:15px">${escapeHtml(params.temporaryPassword)}</code>
            </p>
            <p style="color:#666;font-size:14px">Connectez-vous puis changez-le dès que possible.</p>`
          : ""
      }
      <p style="margin-top:1.5rem;color:#666;font-size:14px">— L'équipe ${escapeHtml(app)}</p>
    </div>
  `;

  return { subject: params.subject, text, html };
}
