"""
ZeptoMail email service helpers.
"""
from __future__ import annotations

import logging
from textwrap import shorten
from typing import Optional

import requests
from flask import current_app


class EmailService:
    """Wrapper for sending transactional emails via ZeptoMail."""

    BRAND_PRIMARY = "#111936"
    BRAND_GRADIENT_START = "#8F6BFF"
    BRAND_GRADIENT_END = "#0DE5A8"
    ACCENT_TEXT = "#C3D5FF"

    @staticmethod
    def is_enabled() -> bool:
        """Check if ZeptoMail config is available."""
        config = current_app.config
        return bool(
            config.get("ZEPTO_ENDPOINT")
            and config.get("ZEPTO_SEND_MAIL_TOKEN")
            and config.get("ZEPTO_SENDER_ADDRESS")
        )

    @classmethod
    def send_intro_request_notification(
        cls,
        *,
        builder: "User",
        investor: "User",
        project: "Project",
        intro_request: "IntroRequest",
        custom_message: Optional[str] = None,
    ) -> bool:
        """Send intro notification email to builder."""
        builder_email = (builder.email or "").strip() if builder else ""
        if not builder or not builder_email:
            current_app.logger.warning(
                "[EmailService] Cannot send intro request email - builder email missing"
            )
            return False

        if not cls.is_enabled():
            current_app.logger.info(
                "[EmailService] ZeptoMail disabled - intro email skipped"
            )
            return False

        config = current_app.config
        frontend_url = cls._get_frontend_intros_url(config)

        subject = f"{investor.display_name or investor.username} wants an intro to {project.title}"
        html_body = cls._build_intro_html(
            builder=builder,
            investor=investor,
            project=project,
            custom_message=custom_message,
            frontend_url=frontend_url,
        )
        text_body = cls._build_intro_text(
            builder=builder,
            investor=investor,
            project=project,
            custom_message=custom_message,
            frontend_url=frontend_url,
        )

        payload = {
            "from": {
                "address": config["ZEPTO_SENDER_ADDRESS"],
                "name": config.get("ZEPTO_SENDER_NAME", "Team Zer0"),
            },
            "to": [
                {
                    "email_address": {
                        "address": builder_email,
                        "name": builder.display_name or builder.username,
                    }
                }
            ],
            "subject": subject,
            "htmlbody": html_body,
            "textbody": text_body,
        }

        current_app.logger.info(
            "[EmailService] Sending intro email via Zepto - builder=%s (%s)",
            builder.display_name or builder.username,
            builder_email,
        )
        current_app.logger.debug("[EmailService] Payload sent to Zepto: %s", payload)

        headers = {
            "authorization": f"Zoho-enczapikey {config['ZEPTO_SEND_MAIL_TOKEN']}",
            "content-type": "application/json",
        }

        try:
            response = requests.post(
                config["ZEPTO_ENDPOINT"], json=payload, headers=headers, timeout=10
            )
            response.raise_for_status()
            return True
        except requests.RequestException as exc:
            body = getattr(exc.response, "text", "") if hasattr(exc, "response") else ""
            logging.exception(
                "[EmailService] Failed to send intro request email: %s | response=%s",
                exc,
                body[:500],
            )
            return False

    @classmethod
    def _build_intro_html(
        cls,
        *,
        builder: "User",
        investor: "User",
        project: "Project",
        custom_message: Optional[str],
        frontend_url: str,
    ) -> str:
        """Create themed HTML email for intro request."""
        investor_name = investor.display_name or investor.username
        builder_name = builder.display_name or builder.username
        project_tagline = project.tagline or "Tap in to review the full context."
        intro_message = custom_message.strip() if custom_message else None
        safe_preview = shorten(intro_message, width=220, placeholder="…") if intro_message else ""

        message_block = ""
        if intro_message:
            message_block = (
                "<div style=\"background:rgba(76,29,149,0.35);padding:20px;"
                "border-radius:16px;border:1px solid rgba(167,139,250,0.4);"
                "margin-bottom:26px;color:#E9D5FF;\">"
                "<div style=\"font-size:14px;letter-spacing:1px;text-transform:uppercase;"
                "color:#A78BFA;margin-bottom:6px;\">Message</div>"
                f"<div style=\"font-size:16px;line-height:1.6;color:#F5F3FF;\">{safe_preview}</div>"
                "<div style=\"margin-top:10px;font-size:13px;color:rgba(255,255,255,0.6);\">"
                "See the full thread plus attachments on your intro dashboard.</div>"
                "</div>"
            )

        return f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>New Intro Request</title>
  </head>
  <body style="margin:0;padding:24px;background:#050A13;font-family:'Inter','Segoe UI',system-ui,-apple-system,sans-serif;color:#F8FBFF;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:{cls.BRAND_PRIMARY};border-radius:18px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;box-shadow:0 25px 60px rgba(14,26,75,0.35);">
            <tr>
              <td style="padding:32px 32px 16px;background:linear-gradient(135deg,{cls.BRAND_GRADIENT_START}, {cls.BRAND_GRADIENT_END});color:#050A13;font-size:20px;font-weight:600;">
                <span style="text-transform:uppercase;letter-spacing:2px;font-size:13px;color:#050A13;opacity:0.8;">0x.ship intros</span>
                <div style="font-size:26px;font-weight:700;margin-top:6px;">You've got a warm intro</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 24px;">
                <p style="margin:0 0 18px;font-size:16px;color:#E2E8FF;">Hey {builder_name},</p>
                <p style="margin:0 0 22px;line-height:1.6;color:{cls.ACCENT_TEXT};">
                  {investor_name} just asked for an intro to <strong style="color:#FFFFFF;">{project.title}</strong>.
                  Hop into your intro board to respond and keep the momentum going.
                </p>
                <div style="background:rgba(15,23,42,0.7);padding:18px 20px;border-radius:14px;border:1px solid rgba(255,255,255,0.04);margin-bottom:24px;">
                  <div style="font-size:14px;letter-spacing:1px;text-transform:uppercase;color:#7DD4FC;margin-bottom:6px;">Investor</div>
                  <div style="font-size:20px;font-weight:600;color:#FFFFFF;">{investor_name}</div>
                  <div style="margin-top:4px;color:#9DB4FF;">View full profile inside 0x.ship</div>
                </div>
                <div style="background:rgba(8,12,24,0.9);padding:18px 20px;border-radius:14px;border:1px solid rgba(255,255,255,0.05);margin-bottom:24px;">
                  <div style="font-size:14px;letter-spacing:1px;text-transform:uppercase;color:#FCD34D;margin-bottom:6px;">Project</div>
                  <div style="font-size:20px;font-weight:600;color:#FFFFFF;">{project.title}</div>
                  <div style="margin-top:4px;color:#C3D5FF;">{project_tagline}</div>
                </div>
                {message_block}
                <div style="text-align:center;">
                  <a href="{frontend_url}" style="display:inline-block;padding:16px 32px;background:linear-gradient(120deg,{cls.BRAND_GRADIENT_START},{cls.BRAND_GRADIENT_END});color:#050A13;text-decoration:none;font-weight:700;border-radius:999px;border:0;font-size:16px;box-shadow:0 12px 30px rgba(13,229,168,0.35);">
                    Review & Respond
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;">
                <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:0 0 18px;" />
                <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.5);line-height:1.5;">
                  Need context later? This intro lives under <strong>/intros</strong> inside 0x.ship.<br/>
                  You can reply directly from your dashboard to start a guided DM thread.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""

    @staticmethod
    def _build_intro_text(
        *,
        builder: "User",
        investor: "User",
        project: "Project",
        custom_message: Optional[str],
        frontend_url: str,
    ) -> str:
        investor_name = investor.display_name or investor.username
        builder_name = builder.display_name or builder.username
        lines = [
            f"Hey {builder_name},",
            "",
            f"{investor_name} just sent you an intro request for {project.title}.",
            "Log in to 0x.ship to review context and keep the conversation flowing.",
            "",
        ]
        if custom_message:
            lines.extend(
                [
                    "Investor message:",
                    custom_message.strip(),
                    "",
                ]
            )
        lines.append(f"Respond now: {frontend_url}")
        return "\n".join(lines)

    @staticmethod
    def _get_frontend_intros_url(config) -> str:
        frontend_base = config.get(
            "FRONTEND_APP_URL", "https://discoveryplatform.netlify.app"
        ).rstrip("/")
        return f"{frontend_base}/intros"
