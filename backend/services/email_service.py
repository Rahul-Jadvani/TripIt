"""
ZeptoMail email service helpers.
"""
from __future__ import annotations

import logging
from textwrap import shorten
from typing import Optional

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from flask import current_app


class EmailService:
    """Wrapper for sending transactional emails via ZeptoMail."""

    # Brand palette shifted to Zer0 black + yellow theme
    BRAND_PRIMARY = "#0B0B0B"
    BRAND_GRADIENT_START = "#FACC15"  # yellow
    BRAND_GRADIENT_END = "#F59E0B"    # amber
    ACCENT_TEXT = "#FDE68A"

    @staticmethod
    def _get_retry_session(retries=3, backoff_factor=1.0):
        """Create a requests session with retry logic for handling DNS and network issues."""
        session = requests.Session()
        retry = Retry(
            total=retries,
            read=retries,
            connect=retries,
            backoff_factor=backoff_factor,
            status_forcelist=(500, 502, 503, 504),
            allowed_methods=["POST"],
        )
        adapter = HTTPAdapter(max_retries=retry)
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        return session

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
            session = cls._get_retry_session()
            response = session.post(
                config["ZEPTO_ENDPOINT"], json=payload, headers=headers, timeout=30
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
    def send_validator_added_email(cls, *, validator: "User") -> bool:
        """Send welcome email when a user becomes a validator."""
        validator_email = (validator.email or "").strip() if validator else ""
        if not validator or not validator_email:
            current_app.logger.warning(
                "[EmailService] Cannot send validator added email - validator email missing"
            )
            return False

        if not cls.is_enabled():
            current_app.logger.info("[EmailService] ZeptoMail disabled - validator email skipped")
            return False

        config = current_app.config
        frontend_url = cls._get_frontend_validator_url(config)

        subject = "You now have validator access on Zer0"
        html_body = cls._build_validator_welcome_html(
            validator=validator,
            frontend_url=frontend_url,
        )
        text_body = cls._build_validator_welcome_text(
            validator=validator,
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
                        "address": validator_email,
                        "name": validator.display_name or validator.username,
                    }
                }
            ],
            "subject": subject,
            "htmlbody": html_body,
            "textbody": text_body,
        }

        current_app.logger.info(
            "[EmailService] Sending validator added email via Zepto - validator=%s (%s)",
            validator.display_name or validator.username,
            validator_email,
        )
        current_app.logger.debug("[EmailService] Payload sent to Zepto: %s", payload)

        headers = {
            "authorization": f"Zoho-enczapikey {config['ZEPTO_SEND_MAIL_TOKEN']}",
            "content-type": "application/json",
        }

        try:
            session = cls._get_retry_session()
            response = session.post(
                config["ZEPTO_ENDPOINT"], json=payload, headers=headers, timeout=30
            )
            response.raise_for_status()
            return True
        except requests.RequestException as exc:
            body = getattr(exc.response, "text", "") if hasattr(exc, "response") else ""
            logging.exception(
                "[EmailService] Failed to send validator added email: %s | response=%s",
                exc,
                body[:500],
            )
            return False

    @classmethod
    def send_validator_assignment_email(
        cls, *, validator: "User", project: "Project", priority: str = "normal"
    ) -> bool:
        """Send email when a project is assigned to a validator."""
        validator_email = (validator.email or "").strip() if validator else ""
        if not validator or not validator_email or not project:
            current_app.logger.warning(
                "[EmailService] Cannot send assignment email - missing validator or project"
            )
            return False

        if not cls.is_enabled():
            current_app.logger.info(
                "[EmailService] ZeptoMail disabled - assignment email skipped"
            )
            return False

        config = current_app.config
        frontend_url = cls._get_frontend_validator_url(config)
        safe_title = shorten(project.title or "A new project", width=80, placeholder="...")
        subject = f"New project assigned: {safe_title}"

        html_body = cls._build_assignment_html(
            validator=validator,
            project=project,
            priority=priority,
            frontend_url=frontend_url,
        )
        text_body = cls._build_assignment_text(
            validator=validator,
            project=project,
            priority=priority,
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
                        "address": validator_email,
                        "name": validator.display_name or validator.username,
                    }
                }
            ],
            "subject": subject,
            "htmlbody": html_body,
            "textbody": text_body,
        }

        current_app.logger.info(
            "[EmailService] Sending assignment email via Zepto - validator=%s (%s) project=%s priority=%s",
            validator.display_name or validator.username,
            validator_email,
            project.id,
            priority,
        )
        current_app.logger.debug("[EmailService] Payload sent to Zepto: %s", payload)

        headers = {
            "authorization": f"Zoho-enczapikey {config['ZEPTO_SEND_MAIL_TOKEN']}",
            "content-type": "application/json",
        }

        try:
            session = cls._get_retry_session()
            response = session.post(
                config["ZEPTO_ENDPOINT"], json=payload, headers=headers, timeout=30
            )
            response.raise_for_status()
            return True
        except requests.RequestException as exc:
            body = getattr(exc.response, "text", "") if hasattr(exc, "response") else ""
            logging.exception(
                "[EmailService] Failed to send validator assignment email: %s | response=%s",
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
              <td style="padding:32px 32px 16px;background:linear-gradient(135deg,{cls.BRAND_GRADIENT_START}, {cls.BRAND_GRADIENT_END});color:#0B0B0B;font-size:20px;font-weight:600;">
                <span style="text-transform:uppercase;letter-spacing:2px;font-size:13px;color:#0B0B0B;opacity:0.9;">ZER0 intros</span>
                <div style="font-size:26px;font-weight:700;margin-top:6px;color:#0B0B0B;">You've got a warm intro</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 24px;">
                <p style="margin:0 0 18px;font-size:16px;color:#F8FAFC;">Hey {builder_name},</p>
                <p style="margin:0 0 22px;line-height:1.6;color:{cls.ACCENT_TEXT};">
                  {investor_name} just asked for an intro to <strong style="color:#FFFFFF;">{project.title}</strong>.
                  Hop into your intro board to respond and keep the momentum going.
                </p>
                <div style="background:rgba(255,255,255,0.03);padding:18px 20px;border-radius:14px;border:1px solid rgba(255,255,255,0.08);margin-bottom:24px;">
                  <div style="font-size:14px;letter-spacing:1px;text-transform:uppercase;color:#FACC15;margin-bottom:6px;">Investor</div>
                  <div style="font-size:20px;font-weight:600;color:#FFFFFF;">{investor_name}</div>
                  <div style="margin-top:4px;color:#E5E7EB;">View full profile inside Zer0</div>
                </div>
                <div style="background:rgba(255,255,255,0.02);padding:18px 20px;border-radius:14px;border:1px solid rgba(255,255,255,0.08);margin-bottom:24px;">
                  <div style="font-size:14px;letter-spacing:1px;text-transform:uppercase;color:#F59E0B;margin-bottom:6px;">Project</div>
                  <div style="font-size:20px;font-weight:600;color:#FFFFFF;">{project.title}</div>
                  <div style="margin-top:4px;color:#C3D5FF;">{project_tagline}</div>
                </div>
                {message_block}
                <div style="text-align:center;">
                  <a href="{frontend_url}" style="display:inline-block;padding:16px 32px;background:linear-gradient(120deg,{cls.BRAND_GRADIENT_START},{cls.BRAND_GRADIENT_END});color:#0B0B0B;text-decoration:none;font-weight:700;border-radius:999px;border:0;font-size:16px;box-shadow:0 12px 30px rgba(245,158,11,0.35);">
                    Review & Respond
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;">
                <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:0 0 18px;" />
                <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.65);line-height:1.5;">
                  Need context later? This intro lives under <strong>/intros</strong> inside Zer0.<br/>
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
            "Log in to Zer0 to review context and keep the conversation flowing.",
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

    @classmethod
    def _build_validator_welcome_html(cls, *, validator: "User", frontend_url: str) -> str:
        """Branded HTML for validator onboarding."""
        name = validator.display_name or validator.username or "there"
        return f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Validator Access Granted</title>
  </head>
  <body style="margin:0;padding:24px;background:#050A13;font-family:'Inter','Segoe UI',system-ui,-apple-system,sans-serif;color:#F8FBFF;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:{cls.BRAND_PRIMARY};border-radius:18px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;box-shadow:0 25px 60px rgba(14,26,75,0.35);">
            <tr>
      <td style="padding:32px 32px 16px;background:linear-gradient(135deg,{cls.BRAND_GRADIENT_START}, {cls.BRAND_GRADIENT_END});color:#0B0B0B;font-size:20px;font-weight:600;">
                <span style="text-transform:uppercase;letter-spacing:2px;font-size:13px;color:#0B0B0B;opacity:0.9;">ZER0 validators</span>
                <div style="font-size:26px;font-weight:700;margin-top:6px;color:#0B0B0B;">Welcome aboard</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 24px;">
                <p style="margin:0 0 18px;font-size:16px;color:#F8FAFC;">Hey {name},</p>
                <p style="margin:0 0 18px;line-height:1.6;color:{cls.ACCENT_TEXT};">
                  You now have validator access on Zer0. Head to your dashboard to review projects, set badge limits,
                  and keep the pipeline moving.
                </p>
                <div style="background:rgba(255,255,255,0.03);padding:18px 20px;border-radius:14px;border:1px solid rgba(255,255,255,0.08);margin-bottom:24px;">
                  <div style="font-size:14px;letter-spacing:1px;text-transform:uppercase;color:#FACC15;margin-bottom:6px;">What to do next</div>
                  <ul style="margin:0;padding-left:18px;color:#E5E7EB;line-height:1.6;">
                    <li>Review your assigned projects</li>
                    <li>Confirm badge types you can issue</li>
                    <li>Toggle category preferences</li>
                  </ul>
                </div>
                <div style="text-align:center;">
                  <a href="{frontend_url}" style="display:inline-block;padding:16px 32px;background:linear-gradient(120deg,{cls.BRAND_GRADIENT_START},{cls.BRAND_GRADIENT_END});color:#0B0B0B;text-decoration:none;font-weight:700;border-radius:999px;border:0;font-size:16px;box-shadow:0 12px 30px rgba(245,158,11,0.35);">
                    Open Validator Dashboard
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;">
                <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:0 0 18px;" />
                <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.65);line-height:1.5;">
                  If you think this is a mistake, please contact us at <a href="mailto:zer0@z-0.io" style="color:#FACC15;text-decoration:none;">zer0@z-0.io</a>.
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
    def _build_validator_welcome_text(*, validator: "User", frontend_url: str) -> str:
        name = validator.display_name or validator.username or "there"
        lines = [
            f"Hey {name},",
            "",
            "You now have validator access on Zer0.",
            "Visit your dashboard to review assignments, confirm badge permissions, and set category preferences.",
            "",
            f"Dashboard: {frontend_url}",
            "",
            "If you think this is a mistake, please contact us at zer0@z-0.io.",
        ]
        return "\n".join(lines)

    @classmethod
    def _build_assignment_html(
        cls, *, validator: "User", project: "Project", priority: str, frontend_url: str
    ) -> str:
        """Branded HTML for assignment notification."""
        name = validator.display_name or validator.username or "there"
        title = project.title or "New project"
        tagline = project.tagline or "Ready for your review."
        priority_label = (priority or "normal").capitalize()

        return f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>New Project Assignment</title>
  </head>
  <body style="margin:0;padding:24px;background:#050A13;font-family:'Inter','Segoe UI',system-ui,-apple-system,sans-serif;color:#F8FBFF;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:{cls.BRAND_PRIMARY};border-radius:18px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;box-shadow:0 25px 60px rgba(14,26,75,0.35);">
            <tr>
              <td style="padding:32px 32px 16px;background:linear-gradient(135deg,{cls.BRAND_GRADIENT_START}, {cls.BRAND_GRADIENT_END});color:#0B0B0B;font-size:20px;font-weight:600;">
                <span style="text-transform:uppercase;letter-spacing:2px;font-size:13px;color:#0B0B0B;opacity:0.9;">ZER0 validators</span>
                <div style="font-size:26px;font-weight:700;margin-top:6px;color:#0B0B0B;">New project assigned</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 24px;">
                <p style="margin:0 0 18px;font-size:16px;color:#F8FAFC;">Hey {name},</p>
                <p style="margin:0 0 18px;line-height:1.6;color:{cls.ACCENT_TEXT};">
                  You have a new assignment. Review the project and award the right badge.
                </p>
                <div style="background:rgba(255,255,255,0.03);padding:18px 20px;border-radius:14px;border:1px solid rgba(255,255,255,0.08);margin-bottom:18px;">
                  <div style="font-size:14px;letter-spacing:1px;text-transform:uppercase;color:#F59E0B;margin-bottom:6px;">Project</div>
                  <div style="font-size:20px;font-weight:700;color:#FFFFFF;">{title}</div>
                  <div style="margin-top:6px;color:#E5E7EB;line-height:1.5;">{tagline}</div>
                </div>
                <div style="display:flex;gap:8px;align-items:center;margin:0 0 22px;">
                  <span style="display:inline-block;padding:8px 14px;border-radius:999px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);color:#C3D5FF;font-size:13px;font-weight:600;">Priority: {priority_label}</span>
                </div>
                <div style="text-align:center;">
                  <a href="{frontend_url}" style="display:inline-block;padding:16px 32px;background:linear-gradient(120deg,{cls.BRAND_GRADIENT_START},{cls.BRAND_GRADIENT_END});color:#0B0B0B;text-decoration:none;font-weight:700;border-radius:999px;border:0;font-size:16px;box-shadow:0 12px 30px rgba(245,158,11,0.35);">
                    Open Assignments
                  </a>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""

    @staticmethod
    def _build_assignment_text(
        *, validator: "User", project: "Project", priority: str, frontend_url: str
    ) -> str:
        name = validator.display_name or validator.username or "there"
        title = project.title or "New project"
        priority_label = (priority or "normal").capitalize()
        lines = [
            f"Hey {name},",
            "",
            f"You have a new project assignment: {title}.",
            f"Priority: {priority_label}",
            "",
            f"Open your validator dashboard: {frontend_url}",
        ]
        return "\n".join(lines)

    @staticmethod
    def _get_frontend_intros_url(config) -> str:
        frontend_base = config.get(
            "FRONTEND_APP_URL", "https://discoveryplatform.netlify.app"
        ).rstrip("/")
        return f"{frontend_base}/intros"

    @staticmethod
    def _get_frontend_validator_url(config) -> str:
        frontend_base = config.get(
            "FRONTEND_APP_URL", "https://discoveryplatform.netlify.app"
        ).rstrip("/")
        return f"{frontend_base}/validator"

    @classmethod
    def send_investor_approved_email(cls, *, investor: "User", investor_name: Optional[str] = None) -> bool:
        """Send approval email when investor request is approved."""
        investor_email = (investor.email or "").strip() if investor else ""
        if not investor or not investor_email:
            current_app.logger.warning(
                "[EmailService] Cannot send investor approval email - investor email missing"
            )
            return False

        if not cls.is_enabled():
            current_app.logger.info("[EmailService] ZeptoMail disabled - investor approval email skipped")
            return False

        config = current_app.config
        frontend_url = cls._get_frontend_investor_url(config)
        display_name = investor_name or investor.display_name or investor.username

        subject = "Your investor application has been approved on Zer0"
        html_body = cls._build_investor_approved_html(
            investor=investor,
            investor_name=display_name,
            frontend_url=frontend_url,
        )
        text_body = cls._build_investor_approved_text(
            investor=investor,
            investor_name=display_name,
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
                        "address": investor_email,
                        "name": display_name,
                    }
                }
            ],
            "subject": subject,
            "htmlbody": html_body,
            "textbody": text_body,
        }

        current_app.logger.info(
            "[EmailService] Sending investor approval email via Zepto - investor=%s (%s)",
            display_name,
            investor_email,
        )
        current_app.logger.debug("[EmailService] Payload sent to Zepto: %s", payload)

        headers = {
            "authorization": f"Zoho-enczapikey {config['ZEPTO_SEND_MAIL_TOKEN']}",
            "content-type": "application/json",
        }

        try:
            session = cls._get_retry_session()
            response = session.post(
                config["ZEPTO_ENDPOINT"], json=payload, headers=headers, timeout=30
            )
            response.raise_for_status()
            return True
        except requests.RequestException as exc:
            body = getattr(exc.response, "text", "") if hasattr(exc, "response") else ""
            logging.exception(
                "[EmailService] Failed to send investor approval email: %s | response=%s",
                exc,
                body[:500],
            )
            return False

    @classmethod
    def send_intro_accepted_email(
        cls, *, investor: "User", builder: "User", project: "Project"
    ) -> bool:
        """Send email when builder accepts intro request."""
        investor_email = (investor.email or "").strip() if investor else ""
        if not investor or not investor_email:
            current_app.logger.warning(
                "[EmailService] Cannot send intro accepted email - investor email missing"
            )
            return False

        if not cls.is_enabled():
            current_app.logger.info("[EmailService] ZeptoMail disabled - intro accepted email skipped")
            return False

        config = current_app.config
        frontend_url = cls._get_frontend_messages_url(config)
        builder_name = builder.display_name or builder.username
        investor_name = investor.display_name or investor.username

        subject = f"{builder_name} accepted your intro request"
        html_body = cls._build_intro_accepted_html(
            investor=investor,
            builder=builder,
            project=project,
            frontend_url=frontend_url,
        )
        text_body = cls._build_intro_accepted_text(
            investor=investor,
            builder=builder,
            project=project,
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
                        "address": investor_email,
                        "name": investor_name,
                    }
                }
            ],
            "subject": subject,
            "htmlbody": html_body,
            "textbody": text_body,
        }

        current_app.logger.info(
            "[EmailService] Sending intro accepted email via Zepto - investor=%s (%s)",
            investor_name,
            investor_email,
        )

        headers = {
            "authorization": f"Zoho-enczapikey {config['ZEPTO_SEND_MAIL_TOKEN']}",
            "content-type": "application/json",
        }

        try:
            session = cls._get_retry_session()
            response = session.post(
                config["ZEPTO_ENDPOINT"], json=payload, headers=headers, timeout=30
            )
            response.raise_for_status()
            return True
        except requests.RequestException as exc:
            body = getattr(exc.response, "text", "") if hasattr(exc, "response") else ""
            logging.exception(
                "[EmailService] Failed to send intro accepted email: %s | response=%s",
                exc,
                body[:500],
            )
            return False

    @classmethod
    def send_intro_declined_email(
        cls, *, investor: "User", builder: "User", project: "Project"
    ) -> bool:
        """Send email when builder declines intro request."""
        investor_email = (investor.email or "").strip() if investor else ""
        if not investor or not investor_email:
            current_app.logger.warning(
                "[EmailService] Cannot send intro declined email - investor email missing"
            )
            return False

        if not cls.is_enabled():
            current_app.logger.info("[EmailService] ZeptoMail disabled - intro declined email skipped")
            return False

        config = current_app.config
        frontend_url = cls._get_frontend_projects_url(config)
        builder_name = builder.display_name or builder.username
        investor_name = investor.display_name or investor.username

        subject = f"Update on your intro request to {project.title}"
        html_body = cls._build_intro_declined_html(
            investor=investor,
            builder=builder,
            project=project,
            frontend_url=frontend_url,
        )
        text_body = cls._build_intro_declined_text(
            investor=investor,
            builder=builder,
            project=project,
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
                        "address": investor_email,
                        "name": investor_name,
                    }
                }
            ],
            "subject": subject,
            "htmlbody": html_body,
            "textbody": text_body,
        }

        current_app.logger.info(
            "[EmailService] Sending intro declined email via Zepto - investor=%s (%s)",
            investor_name,
            investor_email,
        )

        headers = {
            "authorization": f"Zoho-enczapikey {config['ZEPTO_SEND_MAIL_TOKEN']}",
            "content-type": "application/json",
        }

        try:
            session = cls._get_retry_session()
            response = session.post(
                config["ZEPTO_ENDPOINT"], json=payload, headers=headers, timeout=30
            )
            response.raise_for_status()
            return True
        except requests.RequestException as exc:
            body = getattr(exc.response, "text", "") if hasattr(exc, "response") else ""
            logging.exception(
                "[EmailService] Failed to send intro declined email: %s | response=%s",
                exc,
                body[:500],
            )
            return False

    @classmethod
    def send_investor_rejected_email(
        cls, *, investor: "User", investor_name: Optional[str] = None, reason: Optional[str] = None
    ) -> bool:
        """Send email when investor request is rejected."""
        investor_email = (investor.email or "").strip() if investor else ""
        if not investor or not investor_email:
            current_app.logger.warning(
                "[EmailService] Cannot send investor rejection email - investor email missing"
            )
            return False

        if not cls.is_enabled():
            current_app.logger.info("[EmailService] ZeptoMail disabled - investor rejection email skipped")
            return False

        config = current_app.config
        display_name = investor_name or investor.display_name or investor.username

        subject = "Update on your investor application"
        html_body = cls._build_investor_rejected_html(
            investor=investor,
            investor_name=display_name,
            reason=reason,
        )
        text_body = cls._build_investor_rejected_text(
            investor=investor,
            investor_name=display_name,
            reason=reason,
        )

        payload = {
            "from": {
                "address": config["ZEPTO_SENDER_ADDRESS"],
                "name": config.get("ZEPTO_SENDER_NAME", "Team Zer0"),
            },
            "to": [
                {
                    "email_address": {
                        "address": investor_email,
                        "name": display_name,
                    }
                }
            ],
            "subject": subject,
            "htmlbody": html_body,
            "textbody": text_body,
        }

        current_app.logger.info(
            "[EmailService] Sending investor rejection email via Zepto - investor=%s (%s)",
            display_name,
            investor_email,
        )

        headers = {
            "authorization": f"Zoho-enczapikey {config['ZEPTO_SEND_MAIL_TOKEN']}",
            "content-type": "application/json",
        }

        try:
            session = cls._get_retry_session()
            response = session.post(
                config["ZEPTO_ENDPOINT"], json=payload, headers=headers, timeout=30
            )
            response.raise_for_status()
            return True
        except requests.RequestException as exc:
            body = getattr(exc.response, "text", "") if hasattr(exc, "response") else ""
            logging.exception(
                "[EmailService] Failed to send investor rejection email: %s | response=%s",
                exc,
                body[:500],
            )
            return False

    @classmethod
    def send_badge_awarded_email(
        cls, *, project_owner: "User", project: "Project", badge_type: str, validator: "User"
    ) -> bool:
        """Send email when a badge is awarded to a project."""
        owner_email = (project_owner.email or "").strip() if project_owner else ""
        if not project_owner or not owner_email:
            current_app.logger.warning(
                "[EmailService] Cannot send badge awarded email - project owner email missing"
            )
            return False

        if not cls.is_enabled():
            current_app.logger.info("[EmailService] ZeptoMail disabled - badge awarded email skipped")
            return False

        config = current_app.config
        frontend_url = cls._get_frontend_project_url(config, project.id)
        owner_name = project_owner.display_name or project_owner.username

        subject = f"Your project received a {badge_type} badge on Zer0"
        html_body = cls._build_badge_awarded_html(
            project_owner=project_owner,
            project=project,
            badge_type=badge_type,
            validator=validator,
            frontend_url=frontend_url,
        )
        text_body = cls._build_badge_awarded_text(
            project_owner=project_owner,
            project=project,
            badge_type=badge_type,
            validator=validator,
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
                        "address": owner_email,
                        "name": owner_name,
                    }
                }
            ],
            "subject": subject,
            "htmlbody": html_body,
            "textbody": text_body,
        }

        current_app.logger.info(
            "[EmailService] Sending badge awarded email via Zepto - owner=%s (%s) badge=%s",
            owner_name,
            owner_email,
            badge_type,
        )

        headers = {
            "authorization": f"Zoho-enczapikey {config['ZEPTO_SEND_MAIL_TOKEN']}",
            "content-type": "application/json",
        }

        try:
            session = cls._get_retry_session()
            response = session.post(
                config["ZEPTO_ENDPOINT"], json=payload, headers=headers, timeout=30
            )
            response.raise_for_status()
            return True
        except requests.RequestException as exc:
            body = getattr(exc.response, "text", "") if hasattr(exc, "response") else ""
            logging.exception(
                "[EmailService] Failed to send badge awarded email: %s | response=%s",
                exc,
                body[:500],
            )
            return False

    @classmethod
    def send_project_created_email(cls, *, project_owner: "User", project: "Project") -> bool:
        """Send confirmation email when a project is created."""
        owner_email = (project_owner.email or "").strip() if project_owner else ""
        if not project_owner or not owner_email:
            current_app.logger.warning(
                "[EmailService] Cannot send project created email - project owner email missing"
            )
            return False

        if not cls.is_enabled():
            current_app.logger.info("[EmailService] ZeptoMail disabled - project created email skipped")
            return False

        config = current_app.config
        frontend_url = cls._get_frontend_project_url(config, project.id)
        owner_name = project_owner.display_name or project_owner.username

        subject = f"Your project \"{project.title}\" is live on Zer0"
        html_body = cls._build_project_created_html(
            project_owner=project_owner,
            project=project,
            frontend_url=frontend_url,
        )
        text_body = cls._build_project_created_text(
            project_owner=project_owner,
            project=project,
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
                        "address": owner_email,
                        "name": owner_name,
                    }
                }
            ],
            "subject": subject,
            "htmlbody": html_body,
            "textbody": text_body,
        }

        current_app.logger.info(
            "[EmailService] Sending project created email via Zepto - owner=%s (%s) project=%s",
            owner_name,
            owner_email,
            project.title,
        )

        headers = {
            "authorization": f"Zoho-enczapikey {config['ZEPTO_SEND_MAIL_TOKEN']}",
            "content-type": "application/json",
        }

        try:
            session = cls._get_retry_session()
            response = session.post(
                config["ZEPTO_ENDPOINT"], json=payload, headers=headers, timeout=30
            )
            response.raise_for_status()
            return True
        except requests.RequestException as exc:
            body = getattr(exc.response, "text", "") if hasattr(exc, "response") else ""
            logging.exception(
                "[EmailService] Failed to send project created email: %s | response=%s",
                exc,
                body[:500],
            )
            return False

    @classmethod
    def send_welcome_email(cls, *, user: "User") -> bool:
        """Send welcome email when user registers."""
        user_email = (user.email or "").strip() if user else ""
        if not user or not user_email:
            current_app.logger.warning(
                "[EmailService] Cannot send welcome email - user email missing"
            )
            return False

        if not cls.is_enabled():
            current_app.logger.info("[EmailService] ZeptoMail disabled - welcome email skipped")
            return False

        config = current_app.config
        frontend_url = config.get("FRONTEND_APP_URL", "https://discoveryplatform.netlify.app").rstrip("/")
        user_name = user.display_name or user.username

        subject = "Welcome to Zer0 - Let's build something legendary"
        html_body = cls._build_welcome_html(user=user, frontend_url=frontend_url)
        text_body = cls._build_welcome_text(user=user, frontend_url=frontend_url)

        payload = {
            "from": {
                "address": config["ZEPTO_SENDER_ADDRESS"],
                "name": config.get("ZEPTO_SENDER_NAME", "Team Zer0"),
            },
            "to": [
                {
                    "email_address": {
                        "address": user_email,
                        "name": user_name,
                    }
                }
            ],
            "subject": subject,
            "htmlbody": html_body,
            "textbody": text_body,
        }

        current_app.logger.info(
            "[EmailService] Sending welcome email via Zepto - user=%s (%s)",
            user_name,
            user_email,
        )

        headers = {
            "authorization": f"Zoho-enczapikey {config['ZEPTO_SEND_MAIL_TOKEN']}",
            "content-type": "application/json",
        }

        try:
            session = cls._get_retry_session()
            response = session.post(
                config["ZEPTO_ENDPOINT"], json=payload, headers=headers, timeout=30
            )
            response.raise_for_status()
            return True
        except requests.RequestException as exc:
            body = getattr(exc.response, "text", "") if hasattr(exc, "response") else ""
            logging.exception(
                "[EmailService] Failed to send welcome email: %s | response=%s",
                exc,
                body[:500],
            )
            return False

    @classmethod
    def send_user_banned_email(cls, *, user: "User", reason: Optional[str] = None) -> bool:
        """Send email when user is banned."""
        user_email = (user.email or "").strip() if user else ""
        if not user or not user_email:
            current_app.logger.warning(
                "[EmailService] Cannot send user banned email - user email missing"
            )
            return False

        if not cls.is_enabled():
            current_app.logger.info("[EmailService] ZeptoMail disabled - user banned email skipped")
            return False

        config = current_app.config
        user_name = user.display_name or user.username

        subject = "Your Zer0 account has been suspended"
        html_body = cls._build_user_banned_html(user=user, reason=reason)
        text_body = cls._build_user_banned_text(user=user, reason=reason)

        payload = {
            "from": {
                "address": config["ZEPTO_SENDER_ADDRESS"],
                "name": config.get("ZEPTO_SENDER_NAME", "Team Zer0"),
            },
            "to": [
                {
                    "email_address": {
                        "address": user_email,
                        "name": user_name,
                    }
                }
            ],
            "subject": subject,
            "htmlbody": html_body,
            "textbody": text_body,
        }

        current_app.logger.info(
            "[EmailService] Sending user banned email via Zepto - user=%s (%s)",
            user_name,
            user_email,
        )

        headers = {
            "authorization": f"Zoho-enczapikey {config['ZEPTO_SEND_MAIL_TOKEN']}",
            "content-type": "application/json",
        }

        try:
            session = cls._get_retry_session()
            response = session.post(
                config["ZEPTO_ENDPOINT"], json=payload, headers=headers, timeout=30
            )
            response.raise_for_status()
            return True
        except requests.RequestException as exc:
            body = getattr(exc.response, "text", "") if hasattr(exc, "response") else ""
            logging.exception(
                "[EmailService] Failed to send user banned email: %s | response=%s",
                exc,
                body[:500],
            )
            return False

    @classmethod
    def send_user_unbanned_email(cls, *, user: "User") -> bool:
        """Send email when user is unbanned."""
        user_email = (user.email or "").strip() if user else ""
        if not user or not user_email:
            current_app.logger.warning(
                "[EmailService] Cannot send user unbanned email - user email missing"
            )
            return False

        if not cls.is_enabled():
            current_app.logger.info("[EmailService] ZeptoMail disabled - user unbanned email skipped")
            return False

        config = current_app.config
        frontend_url = config.get("FRONTEND_APP_URL", "https://discoveryplatform.netlify.app").rstrip("/")
        user_name = user.display_name or user.username

        subject = "Your Zer0 account has been reactivated"
        html_body = cls._build_user_unbanned_html(user=user, frontend_url=frontend_url)
        text_body = cls._build_user_unbanned_text(user=user, frontend_url=frontend_url)

        payload = {
            "from": {
                "address": config["ZEPTO_SENDER_ADDRESS"],
                "name": config.get("ZEPTO_SENDER_NAME", "Team Zer0"),
            },
            "to": [
                {
                    "email_address": {
                        "address": user_email,
                        "name": user_name,
                    }
                }
            ],
            "subject": subject,
            "htmlbody": html_body,
            "textbody": text_body,
        }

        current_app.logger.info(
            "[EmailService] Sending user unbanned email via Zepto - user=%s (%s)",
            user_name,
            user_email,
        )

        headers = {
            "authorization": f"Zoho-enczapikey {config['ZEPTO_SEND_MAIL_TOKEN']}",
            "content-type": "application/json",
        }

        try:
            session = cls._get_retry_session()
            response = session.post(
                config["ZEPTO_ENDPOINT"], json=payload, headers=headers, timeout=30
            )
            response.raise_for_status()
            return True
        except requests.RequestException as exc:
            body = getattr(exc.response, "text", "") if hasattr(exc, "response") else ""
            logging.exception(
                "[EmailService] Failed to send user unbanned email: %s | response=%s",
                exc,
                body[:500],
            )
            return False

    @classmethod
    def send_project_featured_email(cls, *, project_owner: "User", project: "Project") -> bool:
        """Send email when a project is featured."""
        owner_email = (project_owner.email or "").strip() if project_owner else ""
        if not project_owner or not owner_email:
            current_app.logger.warning(
                "[EmailService] Cannot send project featured email - project owner email missing"
            )
            return False

        if not cls.is_enabled():
            current_app.logger.info("[EmailService] ZeptoMail disabled - project featured email skipped")
            return False

        config = current_app.config
        frontend_url = cls._get_frontend_project_url(config, project.id)
        owner_name = project_owner.display_name or project_owner.username

        subject = f"Your project \"{project.title}\" is now featured on Zer0"
        html_body = cls._build_project_featured_html(
            project_owner=project_owner,
            project=project,
            frontend_url=frontend_url,
        )
        text_body = cls._build_project_featured_text(
            project_owner=project_owner,
            project=project,
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
                        "address": owner_email,
                        "name": owner_name,
                    }
                }
            ],
            "subject": subject,
            "htmlbody": html_body,
            "textbody": text_body,
        }

        current_app.logger.info(
            "[EmailService] Sending project featured email via Zepto - owner=%s (%s) project=%s",
            owner_name,
            owner_email,
            project.title,
        )

        headers = {
            "authorization": f"Zoho-enczapikey {config['ZEPTO_SEND_MAIL_TOKEN']}",
            "content-type": "application/json",
        }

        try:
            session = cls._get_retry_session()
            response = session.post(
                config["ZEPTO_ENDPOINT"], json=payload, headers=headers, timeout=30
            )
            response.raise_for_status()
            return True
        except requests.RequestException as exc:
            body = getattr(exc.response, "text", "") if hasattr(exc, "response") else ""
            logging.exception(
                "[EmailService] Failed to send project featured email: %s | response=%s",
                exc,
                body[:500],
            )
            return False

    @classmethod
    def send_admin_role_changed_email(cls, *, user: "User", is_admin: bool) -> bool:
        """Send email when user's admin role changes."""
        user_email = (user.email or "").strip() if user else ""
        if not user or not user_email:
            current_app.logger.warning(
                "[EmailService] Cannot send admin role changed email - user email missing"
            )
            return False

        if not cls.is_enabled():
            current_app.logger.info("[EmailService] ZeptoMail disabled - admin role changed email skipped")
            return False

        config = current_app.config
        frontend_url = config.get("FRONTEND_APP_URL", "https://discoveryplatform.netlify.app").rstrip("/")
        user_name = user.display_name or user.username

        subject = f"Admin access {'granted' if is_admin else 'removed'} on Zer0"
        html_body = cls._build_admin_role_changed_html(
            user=user,
            is_admin=is_admin,
            frontend_url=frontend_url,
        )
        text_body = cls._build_admin_role_changed_text(
            user=user,
            is_admin=is_admin,
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
                        "address": user_email,
                        "name": user_name,
                    }
                }
            ],
            "subject": subject,
            "htmlbody": html_body,
            "textbody": text_body,
        }

        current_app.logger.info(
            "[EmailService] Sending admin role changed email via Zepto - user=%s (%s) is_admin=%s",
            user_name,
            user_email,
            is_admin,
        )

        headers = {
            "authorization": f"Zoho-enczapikey {config['ZEPTO_SEND_MAIL_TOKEN']}",
            "content-type": "application/json",
        }

        try:
            session = cls._get_retry_session()
            response = session.post(
                config["ZEPTO_ENDPOINT"], json=payload, headers=headers, timeout=30
            )
            response.raise_for_status()
            return True
        except requests.RequestException as exc:
            body = getattr(exc.response, "text", "") if hasattr(exc, "response") else ""
            logging.exception(
                "[EmailService] Failed to send admin role changed email: %s | response=%s",
                exc,
                body[:500],
            )
            return False

    @classmethod
    def send_admin_otp_email(cls, *, email: str, otp_code: str) -> bool:
        """Send OTP code to admin email for authentication."""
        if not email or not otp_code:
            current_app.logger.warning(
                "[EmailService] Cannot send admin OTP email - email or OTP code missing"
            )
            return False

        if not cls.is_enabled():
            current_app.logger.info("[EmailService] ZeptoMail disabled - admin OTP email skipped")
            return False

        config = current_app.config

        subject = "Your Admin Login OTP for Zer0"
        html_body = cls._build_admin_otp_html(email=email, otp_code=otp_code)
        text_body = cls._build_admin_otp_text(otp_code=otp_code)

        payload = {
            "from": {
                "address": config["ZEPTO_SENDER_ADDRESS"],
                "name": config.get("ZEPTO_SENDER_NAME", "Team Zer0"),
            },
            "to": [
                {
                    "email_address": {
                        "address": email,
                        "name": "Admin",
                    }
                }
            ],
            "subject": subject,
            "htmlbody": html_body,
            "textbody": text_body,
        }

        current_app.logger.info(
            "[EmailService] Sending admin OTP email via Zepto - email=%s",
            email,
        )

        headers = {
            "authorization": f"Zoho-enczapikey {config['ZEPTO_SEND_MAIL_TOKEN']}",
            "content-type": "application/json",
        }

        try:
            session = cls._get_retry_session()
            response = session.post(
                config["ZEPTO_ENDPOINT"], json=payload, headers=headers, timeout=30
            )
            response.raise_for_status()
            return True
        except requests.RequestException as exc:
            body = getattr(exc.response, "text", "") if hasattr(exc, "response") else ""
            logging.exception(
                "[EmailService] Failed to send admin OTP email: %s | response=%s",
                exc,
                body[:500],
            )
            return False

    @classmethod
    def _build_admin_otp_html(cls, *, email: str, otp_code: str) -> str:
        """Branded HTML for admin OTP email."""
        return f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Admin Login OTP</title>
  </head>
  <body style="margin:0;padding:24px;background:#050A13;font-family:'Inter','Segoe UI',system-ui,-apple-system,sans-serif;color:#F8FBFF;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:{cls.BRAND_PRIMARY};border-radius:18px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;box-shadow:0 25px 60px rgba(14,26,75,0.35);">
            <tr>
              <td style="padding:32px 32px 16px;background:linear-gradient(135deg,{cls.BRAND_GRADIENT_START}, {cls.BRAND_GRADIENT_END});color:#0B0B0B;font-size:20px;font-weight:600;">
                <span style="text-transform:uppercase;letter-spacing:2px;font-size:13px;color:#0B0B0B;opacity:0.9;">ZER0 ADMIN</span>
                <div style="font-size:26px;font-weight:700;margin-top:6px;color:#0B0B0B;">Admin Login OTP</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 24px;">
                <p style="margin:0 0 18px;font-size:16px;color:#F8FAFC;">Hello,</p>
                <p style="margin:0 0 18px;line-height:1.6;color:{cls.ACCENT_TEXT};">
                  Use this OTP code to authenticate your admin session on Zer0:
                </p>
                <div style="background:rgba(255,255,255,0.03);padding:24px;border-radius:14px;border:2px solid {cls.BRAND_GRADIENT_START};margin-bottom:24px;text-align:center;">
                  <div style="font-size:14px;letter-spacing:1px;text-transform:uppercase;color:#FACC15;margin-bottom:10px;">Your OTP Code</div>
                  <div style="font-size:42px;font-weight:700;color:#FFFFFF;letter-spacing:8px;font-family:monospace;">{otp_code}</div>
                  <div style="margin-top:12px;color:#E5E7EB;font-size:14px;">Valid for 10 minutes</div>
                </div>
                <div style="background:rgba(255,255,255,0.02);padding:16px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);">
                  <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.75);line-height:1.5;">
                    <strong style="color:#FACC15;">Security Notice:</strong> This code is valid for 10 minutes and can only be used once.
                    If you didn't request this login, please ignore this email.
                  </p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;">
                <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:0 0 18px;" />
                <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.65);line-height:1.5;">
                  This is an automated security email from Zer0 Admin Authentication System.<br/>
                  For security questions, contact the development team.
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
    def _build_admin_otp_text(*, otp_code: str) -> str:
        """Plain text version of admin OTP email."""
        lines = [
            "Hello,",
            "",
            "Use this OTP code to authenticate your admin session on Zer0:",
            "",
            f"OTP Code: {otp_code}",
            "",
            "This code is valid for 10 minutes and can only be used once.",
            "If you didn't request this login, please ignore this email.",
            "",
            "---",
            "Zer0 Admin Authentication System",
        ]
        return "\n".join(lines)

    @classmethod
    def _build_investor_approved_html(
        cls, *, investor: "User", investor_name: str, frontend_url: str
    ) -> str:
        """Branded HTML for investor approval email."""
        return f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Investor Application Approved</title>
  </head>
  <body style="margin:0;padding:24px;background:#050A13;font-family:'Inter','Segoe UI',system-ui,-apple-system,sans-serif;color:#F8FBFF;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:{cls.BRAND_PRIMARY};border-radius:18px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;box-shadow:0 25px 60px rgba(14,26,75,0.35);">
            <tr>
              <td style="padding:32px 32px 16px;background:linear-gradient(135deg,{cls.BRAND_GRADIENT_START}, {cls.BRAND_GRADIENT_END});color:#0B0B0B;font-size:20px;font-weight:600;">
                <span style="text-transform:uppercase;letter-spacing:2px;font-size:13px;color:#0B0B0B;opacity:0.9;">ZER0 INVESTORS</span>
                <div style="font-size:26px;font-weight:700;margin-top:6px;color:#0B0B0B;">Welcome to the network</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 24px;">
                <p style="margin:0 0 18px;font-size:16px;color:#F8FAFC;">Hey {investor_name},</p>
                <p style="margin:0 0 18px;line-height:1.6;color:{cls.ACCENT_TEXT};">
                  Great news! Your investor application has been approved. You now have full access to the Zer0 investor network.
                </p>
                <div style="background:rgba(255,255,255,0.03);padding:18px 20px;border-radius:14px;border:1px solid rgba(255,255,255,0.08);margin-bottom:24px;">
                  <div style="font-size:14px;letter-spacing:1px;text-transform:uppercase;color:#FACC15;margin-bottom:6px;">What you can do now</div>
                  <ul style="margin:0;padding-left:18px;color:#E5E7EB;line-height:1.6;">
                    <li>Browse the project directory and discover new opportunities</li>
                    <li>Request intros to builders whose projects match your thesis</li>
                    <li>Manage your investor profile and visibility settings</li>
                    <li>Connect with other investors and validators in the ecosystem</li>
                  </ul>
                </div>
                <div style="text-align:center;">
                  <a href="{frontend_url}" style="display:inline-block;padding:16px 32px;background:linear-gradient(120deg,{cls.BRAND_GRADIENT_START},{cls.BRAND_GRADIENT_END});color:#0B0B0B;text-decoration:none;font-weight:700;border-radius:999px;border:0;font-size:16px;box-shadow:0 12px 30px rgba(245,158,11,0.35);">
                    Explore Projects
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;">
                <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:0 0 18px;" />
                <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.65);line-height:1.5;">
                  Questions about your investor account? Reach out to us at <a href="mailto:zer0@z-0.io" style="color:#FACC15;text-decoration:none;">zer0@z-0.io</a>.<br/>
                  We're excited to have you in the Zer0 community.
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
    def _build_investor_approved_text(
        *, investor: "User", investor_name: str, frontend_url: str
    ) -> str:
        """Plain text version of investor approval email."""
        lines = [
            f"Hey {investor_name},",
            "",
            "Great news! Your investor application has been approved.",
            "You now have full access to the Zer0 investor network.",
            "",
            "What you can do now:",
            "- Browse the project directory and discover new opportunities",
            "- Request intros to builders whose projects match your thesis",
            "- Manage your investor profile and visibility settings",
            "- Connect with other investors and validators in the ecosystem",
            "",
            f"Explore projects: {frontend_url}",
            "",
            "Questions about your investor account? Reach out to us at zer0@z-0.io.",
            "We're excited to have you in the Zer0 community.",
        ]
        return "\n".join(lines)

    @staticmethod
    def _get_frontend_investor_url(config) -> str:
        """Get frontend URL for investor dashboard."""
        frontend_base = config.get(
            "FRONTEND_APP_URL", "https://discoveryplatform.netlify.app"
        ).rstrip("/")
        return f"{frontend_base}/"

    @staticmethod
    def _get_frontend_messages_url(config) -> str:
        """Get frontend URL for messages/DMs."""
        frontend_base = config.get(
            "FRONTEND_APP_URL", "https://discoveryplatform.netlify.app"
        ).rstrip("/")
        return f"{frontend_base}/messages"

    @staticmethod
    def _get_frontend_projects_url(config) -> str:
        """Get frontend URL for projects page."""
        frontend_base = config.get(
            "FRONTEND_APP_URL", "https://discoveryplatform.netlify.app"
        ).rstrip("/")
        return f"{frontend_base}/projects"

    @staticmethod
    def _get_frontend_project_url(config, project_id: str) -> str:
        """Get frontend URL for a specific project."""
        frontend_base = config.get(
            "FRONTEND_APP_URL", "https://discoveryplatform.netlify.app"
        ).rstrip("/")
        return f"{frontend_base}/projects/{project_id}"

    @classmethod
    def _build_intro_accepted_html(
        cls, *, investor: "User", builder: "User", project: "Project", frontend_url: str
    ) -> str:
        investor_name = investor.display_name or investor.username
        builder_name = builder.display_name or builder.username
        return f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Intro Request Accepted</title>
  </head>
  <body style="margin:0;padding:24px;background:#050A13;font-family:\'Inter\',\'Segoe UI\',system-ui,-apple-system,sans-serif;color:#F8FBFF;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:{cls.BRAND_PRIMARY};border-radius:18px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;box-shadow:0 25px 60px rgba(14,26,75,0.35);">
            <tr>
              <td style="padding:32px 32px 16px;background:linear-gradient(135deg,{cls.BRAND_GRADIENT_START}, {cls.BRAND_GRADIENT_END});color:#0B0B0B;font-size:20px;font-weight:600;">
                <span style="text-transform:uppercase;letter-spacing:2px;font-size:13px;color:#0B0B0B;opacity:0.9;">ZER0 INTROS</span>
                <div style="font-size:26px;font-weight:700;margin-top:6px;color:#0B0B0B;">Connection accepted!</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 24px;">
                <p style="margin:0 0 18px;font-size:16px;color:#F8FAFC;">Hey {investor_name},</p>
                <p style="margin:0 0 18px;line-height:1.6;color:{cls.ACCENT_TEXT};">
                  Good news! <strong style="color:#FFFFFF;">{builder_name}</strong> accepted your intro request for <strong style="color:#FFFFFF;">{project.title}</strong>. Your conversation has started.
                </p>
                <div style="background:rgba(255,255,255,0.03);padding:18px 20px;border-radius:14px;border:1px solid rgba(255,255,255,0.08);margin-bottom:24px;">
                  <div style="font-size:14px;letter-spacing:1px;text-transform:uppercase;color:#FACC15;margin-bottom:6px;">What\'s next</div>
                  <ul style="margin:0;padding-left:18px;color:#E5E7EB;line-height:1.6;">
                    <li>Check your messages to continue the conversation</li>
                    <li>Share your investment thesis and ask questions</li>
                    <li>Schedule a call if there\'s mutual interest</li>
                  </ul>
                </div>
                <div style="text-align:center;">
                  <a href="{frontend_url}" style="display:inline-block;padding:16px 32px;background:linear-gradient(120deg,{cls.BRAND_GRADIENT_START},{cls.BRAND_GRADIENT_END});color:#0B0B0B;text-decoration:none;font-weight:700;border-radius:999px;border:0;font-size:16px;box-shadow:0 12px 30px rgba(245,158,11,0.35);">
                    Open Messages
                  </a>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""

    @staticmethod
    def _build_intro_accepted_text(
        *, investor: "User", builder: "User", project: "Project", frontend_url: str
    ) -> str:
        investor_name = investor.display_name or investor.username
        builder_name = builder.display_name or builder.username
        lines = [
            f"Hey {investor_name},",
            "",
            f"Good news! {builder_name} accepted your intro request for {project.title}.",
            "Your conversation has started.",
            "",
            "What\'s next:",
            "- Check your messages to continue the conversation",
            "- Share your investment thesis and ask questions",
            "- Schedule a call if there\'s mutual interest",
            "",
            f"Open messages: {frontend_url}",
        ]
        return "\n".join(lines)

    @classmethod
    def _build_intro_declined_html(
        cls, *, investor: "User", builder: "User", project: "Project", frontend_url: str
    ) -> str:
        investor_name = investor.display_name or investor.username
        builder_name = builder.display_name or builder.username
        return f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Intro Request Update</title>
  </head>
  <body style="margin:0;padding:24px;background:#050A13;font-family:\'Inter\',\'Segoe UI\',system-ui,-apple-system,sans-serif;color:#F8FBFF;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:{cls.BRAND_PRIMARY};border-radius:18px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;box-shadow:0 25px 60px rgba(14,26,75,0.35);">
            <tr>
              <td style="padding:32px 32px 16px;background:linear-gradient(135deg,{cls.BRAND_GRADIENT_START}, {cls.BRAND_GRADIENT_END});color:#0B0B0B;font-size:20px;font-weight:600;">
                <span style="text-transform:uppercase;letter-spacing:2px;font-size:13px;color:#0B0B0B;opacity:0.9;">ZER0 INTROS</span>
                <div style="font-size:26px;font-weight:700;margin-top:6px;color:#0B0B0B;">Update on your intro request</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 24px;">
                <p style="margin:0 0 18px;font-size:16px;color:#F8FAFC;">Hey {investor_name},</p>
                <p style="margin:0 0 18px;line-height:1.6;color:{cls.ACCENT_TEXT};">
                  {builder_name} isn\'t able to connect regarding <strong style="color:#FFFFFF;">{project.title}</strong> at this time. Don\'t let that stop you—there are plenty of other great builders to discover on Zer0.
                </p>
                <div style="text-align:center;">
                  <a href="{frontend_url}" style="display:inline-block;padding:16px 32px;background:linear-gradient(120deg,{cls.BRAND_GRADIENT_START},{cls.BRAND_GRADIENT_END});color:#0B0B0B;text-decoration:none;font-weight:700;border-radius:999px;border:0;font-size:16px;box-shadow:0 12px 30px rgba(245,158,11,0.35);">
                    Explore More Projects
                  </a>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""

    @staticmethod
    def _build_intro_declined_text(
        *, investor: "User", builder: "User", project: "Project", frontend_url: str
    ) -> str:
        investor_name = investor.display_name or investor.username
        builder_name = builder.display_name or builder.username
        lines = [
            f"Hey {investor_name},",
            "",
            f"{builder_name} isn\'t able to connect regarding {project.title} at this time.",
            "Don\'t let that stop you—there are plenty of other great builders to discover on Zer0.",
            "",
            f"Explore more projects: {frontend_url}",
        ]
        return "\n".join(lines)

    @classmethod
    def _build_investor_rejected_html(
        cls, *, investor: "User", investor_name: str, reason: str = None
    ) -> str:
        reason_block = ""
        if reason:
            reason_block = f"""
                <div style="background:rgba(255,255,255,0.03);padding:18px 20px;border-radius:14px;border:1px solid rgba(255,255,255,0.08);margin-bottom:24px;">
                  <div style="font-size:14px;letter-spacing:1px;text-transform:uppercase;color:#F59E0B;margin-bottom:6px;">Feedback</div>
                  <div style="color:#E5E7EB;line-height:1.6;">{reason}</div>
                </div>
"""
        return f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Investor Application Update</title>
  </head>
  <body style="margin:0;padding:24px;background:#050A13;font-family:'Inter','Segoe UI',system-ui,-apple-system,sans-serif;color:#F8FBFF;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:{cls.BRAND_PRIMARY};border-radius:18px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;box-shadow:0 25px 60px rgba(14,26,75,0.35);">
            <tr>
              <td style="padding:32px 32px 16px;background:linear-gradient(135deg,{cls.BRAND_GRADIENT_START}, {cls.BRAND_GRADIENT_END});color:#0B0B0B;font-size:20px;font-weight:600;">
                <span style="text-transform:uppercase;letter-spacing:2px;font-size:13px;color:#0B0B0B;opacity:0.9;">ZER0 INVESTORS</span>
                <div style="font-size:26px;font-weight:700;margin-top:6px;color:#0B0B0B;">Application update</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 24px;">
                <p style="margin:0 0 18px;font-size:16px;color:#F8FAFC;">Hey {investor_name},</p>
                <p style="margin:0 0 18px;line-height:1.6;color:{cls.ACCENT_TEXT};">
                  Thank you for applying to join the Zer0 investor network. After careful review, we're unable to approve your application at this time.
                </p>
                {reason_block}
                <p style="margin:0 0 18px;line-height:1.6;color:#E5E7EB;">
                  You're welcome to reapply in the future. In the meantime, you can still explore projects and engage with the community.
                </p>
                <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.65);">
                  Questions? Reach out to us at <a href="mailto:zer0@z-0.io" style="color:#FACC15;text-decoration:none;">zer0@z-0.io</a>.
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
    def _build_investor_rejected_text(
        *, investor: "User", investor_name: str, reason: str = None
    ) -> str:
        lines = [
            f"Hey {investor_name},",
            "",
            "Thank you for applying to join the Zer0 investor network.",
            "After careful review, we're unable to approve your application at this time.",
            "",
        ]
        if reason:
            lines.extend([
                "Feedback:",
                reason,
                "",
            ])
        lines.extend([
            "You're welcome to reapply in the future.",
            "In the meantime, you can still explore projects and engage with the community.",
            "",
            "Questions? Reach out to us at zer0@z-0.io.",
        ])
        return "\n".join(lines)

    @classmethod
    def _build_badge_awarded_html(
        cls, *, project_owner: "User", project: "Project", badge_type: str, validator: "User", frontend_url: str
    ) -> str:
        owner_name = project_owner.display_name or project_owner.username
        validator_name = validator.display_name or validator.username
        badge_colors = {
            "stone": "#A8A29E",
            "silver": "#D4D4D8",
            "gold": "#FACC15",
            "platinum": "#E0E7FF",
            "demerit": "#EF4444"
        }
        badge_color = badge_colors.get(badge_type, "#FACC15")
        return f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Badge Awarded</title>
  </head>
  <body style="margin:0;padding:24px;background:#050A13;font-family:'Inter','Segoe UI',system-ui,-apple-system,sans-serif;color:#F8FBFF;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:{cls.BRAND_PRIMARY};border-radius:18px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;box-shadow:0 25px 60px rgba(14,26,75,0.35);">
            <tr>
              <td style="padding:32px 32px 16px;background:linear-gradient(135deg,{cls.BRAND_GRADIENT_START}, {cls.BRAND_GRADIENT_END});color:#0B0B0B;font-size:20px;font-weight:600;">
                <span style="text-transform:uppercase;letter-spacing:2px;font-size:13px;color:#0B0B0B;opacity:0.9;">ZER0 VALIDATION</span>
                <div style="font-size:26px;font-weight:700;margin-top:6px;color:#0B0B0B;">Badge earned!</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 24px;">
                <p style="margin:0 0 18px;font-size:16px;color:#F8FAFC;">Hey {owner_name},</p>
                <p style="margin:0 0 18px;line-height:1.6;color:{cls.ACCENT_TEXT};">
                  Great news! Your project <strong style="color:#FFFFFF;">{project.title}</strong> has been reviewed and awarded a <strong style="color:{badge_color};">{badge_type.upper()}</strong> badge by {validator_name}.
                </p>
                <div style="background:rgba(255,255,255,0.03);padding:24px;border-radius:14px;border:2px solid {badge_color};margin-bottom:24px;text-align:center;">
                  <div style="font-size:48px;margin-bottom:12px;">🏆</div>
                  <div style="font-size:24px;font-weight:700;color:{badge_color};text-transform:uppercase;letter-spacing:2px;">{badge_type}</div>
                  <div style="font-size:14px;color:#E5E7EB;margin-top:8px;">Validation Badge</div>
                </div>
                <div style="text-align:center;">
                  <a href="{frontend_url}" style="display:inline-block;padding:16px 32px;background:linear-gradient(120deg,{cls.BRAND_GRADIENT_START},{cls.BRAND_GRADIENT_END});color:#0B0B0B;text-decoration:none;font-weight:700;border-radius:999px;border:0;font-size:16px;box-shadow:0 12px 30px rgba(245,158,11,0.35);">
                    View Project
                  </a>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""

    @staticmethod
    def _build_badge_awarded_text(
        *, project_owner: "User", project: "Project", badge_type: str, validator: "User", frontend_url: str
    ) -> str:
        owner_name = project_owner.display_name or project_owner.username
        validator_name = validator.display_name or validator.username
        lines = [
            f"Hey {owner_name},",
            "",
            f"Great news! Your project {project.title} has been reviewed and awarded a {badge_type.upper()} badge by {validator_name}.",
            "",
            f"View your project: {frontend_url}",
        ]
        return "\n".join(lines)

    @classmethod
    def _build_project_created_html(
        cls, *, project_owner: "User", project: "Project", frontend_url: str
    ) -> str:
        owner_name = project_owner.display_name or project_owner.username
        return f'''<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Project Created</title>
  </head>
  <body style="margin:0;padding:24px;background:#050A13;font-family:\'Inter\',\'Segoe UI\',system-ui,-apple-system,sans-serif;color:#F8FBFF;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:{cls.BRAND_PRIMARY};border-radius:18px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;box-shadow:0 25px 60px rgba(14,26,75,0.35);">
            <tr>
              <td style="padding:32px 32px 16px;background:linear-gradient(135deg,{cls.BRAND_GRADIENT_START}, {cls.BRAND_GRADIENT_END});color:#0B0B0B;font-size:20px;font-weight:600;">
                <span style="text-transform:uppercase;letter-spacing:2px;font-size:13px;color:#0B0B0B;opacity:0.9;">ZER0 PROJECTS</span>
                <div style="font-size:26px;font-weight:700;margin-top:6px;color:#0B0B0B;">Your project is live!</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 24px;">
                <p style="margin:0 0 18px;font-size:16px;color:#F8FAFC;">Hey {owner_name},</p>
                <p style="margin:0 0 18px;line-height:1.6;color:{cls.ACCENT_TEXT};">
                  Congrats! <strong style="color:#FFFFFF;">{project.title}</strong> is now live on Zer0. Your project is being indexed and will start appearing in search results and on the leaderboard.
                </p>
                <div style="background:rgba(255,255,255,0.03);padding:18px 20px;border-radius:14px;border:1px solid rgba(255,255,255,0.08);margin-bottom:24px;">
                  <div style="font-size:14px;letter-spacing:1px;text-transform:uppercase;color:#FACC15;margin-bottom:6px;">What happens next</div>
                  <ul style="margin:0;padding-left:18px;color:#E5E7EB;line-height:1.6;">
                    <li>Your project will be scored by our AI validation system</li>
                    <li>Validators may review and award badges</li>
                    <li>Investors can discover and request intros</li>
                    <li>Track engagement on your project dashboard</li>
                  </ul>
                </div>
                <div style="text-align:center;">
                  <a href="{frontend_url}" style="display:inline-block;padding:16px 32px;background:linear-gradient(120deg,{cls.BRAND_GRADIENT_START},{cls.BRAND_GRADIENT_END});color:#0B0B0B;text-decoration:none;font-weight:700;border-radius:999px;border:0;font-size:16px;box-shadow:0 12px 30px rgba(245,158,11,0.35);">
                    View Project
                  </a>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>'''

    @staticmethod
    def _build_project_created_text(
        *, project_owner: "User", project: "Project", frontend_url: str
    ) -> str:
        owner_name = project_owner.display_name or project_owner.username
        lines = [
            f"Hey {owner_name},",
            "",
            f"Congrats! {project.title} is now live on Zer0.",
            "Your project is being indexed and will start appearing in search results and on the leaderboard.",
            "",
            "What happens next:",
            "- Your project will be scored by our AI validation system",
            "- Validators may review and award badges",
            "- Investors can discover and request intros",
            "- Track engagement on your project dashboard",
            "",
            f"View your project: {frontend_url}",
        ]
        return "\n".join(lines)

    @classmethod
    def _build_welcome_html(cls, *, user: "User", frontend_url: str) -> str:
        user_name = user.display_name or user.username
        return f'''<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Welcome to Zer0</title>
  </head>
  <body style="margin:0;padding:24px;background:#050A13;font-family:\'Inter\',\'Segoe UI\',system-ui,-apple-system,sans-serif;color:#F8FBFF;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:{cls.BRAND_PRIMARY};border-radius:18px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;box-shadow:0 25px 60px rgba(14,26,75,0.35);">
            <tr>
              <td style="padding:32px 32px 16px;background:linear-gradient(135deg,{cls.BRAND_GRADIENT_START}, {cls.BRAND_GRADIENT_END});color:#0B0B0B;font-size:20px;font-weight:600;">
                <span style="text-transform:uppercase;letter-spacing:2px;font-size:13px;color:#0B0B0B;opacity:0.9;">WELCOME TO ZER0</span>
                <div style="font-size:26px;font-weight:700;margin-top:6px;color:#0B0B0B;">Let\'s build something legendary</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 24px;">
                <p style="margin:0 0 18px;font-size:16px;color:#F8FAFC;">Hey {user_name},</p>
                <p style="margin:0 0 18px;line-height:1.6;color:{cls.ACCENT_TEXT};">
                  Welcome to Zer0—the discovery platform where builders showcase their work, validators recognize quality, and investors find the next big thing.
                </p>
                <div style="background:rgba(255,255,255,0.03);padding:18px 20px;border-radius:14px;border:1px solid rgba(255,255,255,0.08);margin-bottom:24px;">
                  <div style="font-size:14px;letter-spacing:1px;text-transform:uppercase;color:#FACC15;margin-bottom:6px;">Get started</div>
                  <ul style="margin:0;padding-left:18px;color:#E5E7EB;line-height:1.6;">
                    <li>Submit your projects and get validated</li>
                    <li>Browse the leaderboard and discover builders</li>
                    <li>Connect with investors and validators</li>
                    <li>Apply to become an investor or validator</li>
                  </ul>
                </div>
                <div style="text-align:center;">
                  <a href="{frontend_url}" style="display:inline-block;padding:16px 32px;background:linear-gradient(120deg,{cls.BRAND_GRADIENT_START},{cls.BRAND_GRADIENT_END});color:#0B0B0B;text-decoration:none;font-weight:700;border-radius:999px;border:0;font-size:16px;box-shadow:0 12px 30px rgba(245,158,11,0.35);">
                    Explore Zer0
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;">
                <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:0 0 18px;" />
                <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.65);line-height:1.5;">
                  Questions? Reach out to us at <a href="mailto:zer0@z-0.io" style="color:#FACC15;text-decoration:none;">zer0@z-0.io</a>.<br/>
                  We\'re excited to have you in the community.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>'''

    @staticmethod
    def _build_welcome_text(*, user: "User", frontend_url: str) -> str:
        user_name = user.display_name or user.username
        lines = [
            f"Hey {user_name},",
            "",
            "Welcome to Zer0—the discovery platform where builders showcase their work, validators recognize quality, and investors find the next big thing.",
            "",
            "Get started:",
            "- Submit your projects and get validated",
            "- Browse the leaderboard and discover builders",
            "- Connect with investors and validators",
            "- Apply to become an investor or validator",
            "",
            f"Explore Zer0: {frontend_url}",
            "",
            "Questions? Reach out to us at zer0@z-0.io.",
            "We\'re excited to have you in the community.",
        ]
        return "\n".join(lines)

    @classmethod
    def _build_user_banned_html(cls, *, user: "User", reason: str = None) -> str:
        user_name = user.display_name or user.username
        reason_block = ""
        if reason:
            reason_block = f'''
                <div style="background:rgba(255,255,255,0.03);padding:18px 20px;border-radius:14px;border:1px solid rgba(255,255,255,0.08);margin-bottom:24px;">
                  <div style="font-size:14px;letter-spacing:1px;text-transform:uppercase;color:#EF4444;margin-bottom:6px;">Reason</div>
                  <div style="color:#E5E7EB;line-height:1.6;">{reason}</div>
                </div>
'''
        return f'''<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Account Suspended</title>
  </head>
  <body style="margin:0;padding:24px;background:#050A13;font-family:\'Inter\',\'Segoe UI\',system-ui,-apple-system,sans-serif;color:#F8FBFF;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:{cls.BRAND_PRIMARY};border-radius:18px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;box-shadow:0 25px 60px rgba(14,26,75,0.35);">
            <tr>
              <td style="padding:32px;background:#1F2937;">
                <span style="text-transform:uppercase;letter-spacing:2px;font-size:13px;color:#EF4444;opacity:0.9;">ACCOUNT STATUS</span>
                <div style="font-size:26px;font-weight:700;margin-top:6px;color:#F8FBFF;">Account suspended</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 24px;">
                <p style="margin:0 0 18px;font-size:16px;color:#F8FAFC;">Hey {user_name},</p>
                <p style="margin:0 0 18px;line-height:1.6;color:{cls.ACCENT_TEXT};">
                  Your Zer0 account has been suspended. You will not be able to access the platform while your account is inactive.
                </p>
                {reason_block}
                <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.65);">
                  If you believe this is a mistake, please contact us at <a href="mailto:zer0@z-0.io" style="color:#FACC15;text-decoration:none;">zer0@z-0.io</a>.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>'''

    @staticmethod
    def _build_user_banned_text(*, user: "User", reason: str = None) -> str:
        user_name = user.display_name or user.username
        lines = [
            f"Hey {user_name},",
            "",
            "Your Zer0 account has been suspended.",
            "You will not be able to access the platform while your account is inactive.",
            "",
        ]
        if reason:
            lines.extend([
                "Reason:",
                reason,
                "",
            ])
        lines.append("If you believe this is a mistake, please contact us at zer0@z-0.io.")
        return "\n".join(lines)

    @classmethod
    def _build_user_unbanned_html(cls, *, user: "User", frontend_url: str) -> str:
        user_name = user.display_name or user.username
        return f'''<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Account Reactivated</title>
  </head>
  <body style="margin:0;padding:24px;background:#050A13;font-family:\'Inter\',\'Segoe UI\',system-ui,-apple-system,sans-serif;color:#F8FBFF;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:{cls.BRAND_PRIMARY};border-radius:18px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;box-shadow:0 25px 60px rgba(14,26,75,0.35);">
            <tr>
              <td style="padding:32px 32px 16px;background:linear-gradient(135deg,{cls.BRAND_GRADIENT_START}, {cls.BRAND_GRADIENT_END});color:#0B0B0B;font-size:20px;font-weight:600;">
                <span style="text-transform:uppercase;letter-spacing:2px;font-size:13px;color:#0B0B0B;opacity:0.9;">ACCOUNT STATUS</span>
                <div style="font-size:26px;font-weight:700;margin-top:6px;color:#0B0B0B;">Welcome back!</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 24px;">
                <p style="margin:0 0 18px;font-size:16px;color:#F8FAFC;">Hey {user_name},</p>
                <p style="margin:0 0 18px;line-height:1.6;color:{cls.ACCENT_TEXT};">
                  Good news! Your Zer0 account has been reactivated. You now have full access to the platform again.
                </p>
                <div style="text-align:center;">
                  <a href="{frontend_url}" style="display:inline-block;padding:16px 32px;background:linear-gradient(120deg,{cls.BRAND_GRADIENT_START},{cls.BRAND_GRADIENT_END});color:#0B0B0B;text-decoration:none;font-weight:700;border-radius:999px;border:0;font-size:16px;box-shadow:0 12px 30px rgba(245,158,11,0.35);">
                    Back to Zer0
                  </a>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>'''

    @staticmethod
    def _build_user_unbanned_text(*, user: "User", frontend_url: str) -> str:
        user_name = user.display_name or user.username
        lines = [
            f"Hey {user_name},",
            "",
            "Good news! Your Zer0 account has been reactivated.",
            "You now have full access to the platform again.",
            "",
            f"Back to Zer0: {frontend_url}",
        ]
        return "\n".join(lines)

    @classmethod
    def _build_project_featured_html(
        cls, *, project_owner: "User", project: "Project", frontend_url: str
    ) -> str:
        owner_name = project_owner.display_name or project_owner.username
        return f'''<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Project Featured</title>
  </head>
  <body style="margin:0;padding:24px;background:#050A13;font-family:\'Inter\',\'Segoe UI\',system-ui,-apple-system,sans-serif;color:#F8FBFF;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:{cls.BRAND_PRIMARY};border-radius:18px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;box-shadow:0 25px 60px rgba(14,26,75,0.35);">
            <tr>
              <td style="padding:32px 32px 16px;background:linear-gradient(135deg,{cls.BRAND_GRADIENT_START}, {cls.BRAND_GRADIENT_END});color:#0B0B0B;font-size:20px;font-weight:600;">
                <span style="text-transform:uppercase;letter-spacing:2px;font-size:13px;color:#0B0B0B;opacity:0.9;">ZER0 FEATURED</span>
                <div style="font-size:26px;font-weight:700;margin-top:6px;color:#0B0B0B;">Your project is now featured!</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 24px;">
                <p style="margin:0 0 18px;font-size:16px;color:#F8FAFC;">Hey {owner_name},</p>
                <p style="margin:0 0 18px;line-height:1.6;color:{cls.ACCENT_TEXT};">
                  Congrats! <strong style="color:#FFFFFF;">{project.title}</strong> has been featured on Zer0. Featured projects get prime visibility on the homepage and in search results.
                </p>
                <div style="background:rgba(255,255,255,0.03);padding:18px 20px;border-radius:14px;border:1px solid rgba(255,255,255,0.08);margin-bottom:24px;">
                  <div style="font-size:14px;letter-spacing:1px;text-transform:uppercase;color:#FACC15;margin-bottom:6px;">What this means</div>
                  <ul style="margin:0;padding-left:18px;color:#E5E7EB;line-height:1.6;">
                    <li>Prime placement on the Zer0 homepage</li>
                    <li>Boosted visibility in search and filters</li>
                    <li>Increased attention from investors and validators</li>
                    <li>Recognition as a standout project</li>
                  </ul>
                </div>
                <div style="text-align:center;">
                  <a href="{frontend_url}" style="display:inline-block;padding:16px 32px;background:linear-gradient(120deg,{cls.BRAND_GRADIENT_START},{cls.BRAND_GRADIENT_END});color:#0B0B0B;text-decoration:none;font-weight:700;border-radius:999px;border:0;font-size:16px;box-shadow:0 12px 30px rgba(245,158,11,0.35);">
                    View Project
                  </a>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>'''

    @staticmethod
    def _build_project_featured_text(
        *, project_owner: "User", project: "Project", frontend_url: str
    ) -> str:
        owner_name = project_owner.display_name or project_owner.username
        lines = [
            f"Hey {owner_name},",
            "",
            f"Congrats! {project.title} has been featured on Zer0.",
            "Featured projects get prime visibility on the homepage and in search results.",
            "",
            "What this means:",
            "- Prime placement on the Zer0 homepage",
            "- Boosted visibility in search and filters",
            "- Increased attention from investors and validators",
            "- Recognition as a standout project",
            "",
            f"View your project: {frontend_url}",
        ]
        return "\n".join(lines)

    @classmethod
    def _build_admin_role_changed_html(
        cls, *, user: "User", is_admin: bool, frontend_url: str
    ) -> str:
        user_name = user.display_name or user.username
        action = "granted" if is_admin else "removed"
        title = "Admin access granted" if is_admin else "Admin access removed"
        message = "You now have admin privileges on Zer0. Use them wisely!" if is_admin else "Your admin privileges have been removed."

        admin_block = ""
        if is_admin:
            admin_block = '''
                <div style="background:rgba(255,255,255,0.03);padding:18px 20px;border-radius:14px;border:1px solid rgba(255,255,255,0.08);margin-bottom:24px;">
                  <div style="font-size:14px;letter-spacing:1px;text-transform:uppercase;color:#FACC15;margin-bottom:6px;">Admin capabilities</div>
                  <ul style="margin:0;padding-left:18px;color:#E5E7EB;line-height:1.6;">
                    <li>Manage users, validators, and investors</li>
                    <li>Feature projects and moderate content</li>
                    <li>Access analytics and platform stats</li>
                    <li>Configure system settings</li>
                  </ul>
                </div>
'''

        return f'''<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Admin Role Update</title>
  </head>
  <body style="margin:0;padding:24px;background:#050A13;font-family:\'Inter\',\'Segoe UI\',system-ui,-apple-system,sans-serif;color:#F8FBFF;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:{cls.BRAND_PRIMARY};border-radius:18px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;box-shadow:0 25px 60px rgba(14,26,75,0.35);">
            <tr>
              <td style="padding:32px 32px 16px;background:linear-gradient(135deg,{cls.BRAND_GRADIENT_START}, {cls.BRAND_GRADIENT_END});color:#0B0B0B;font-size:20px;font-weight:600;">
                <span style="text-transform:uppercase;letter-spacing:2px;font-size:13px;color:#0B0B0B;opacity:0.9;">ZER0 ADMIN</span>
                <div style="font-size:26px;font-weight:700;margin-top:6px;color:#0B0B0B;">{title}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 24px;">
                <p style="margin:0 0 18px;font-size:16px;color:#F8FAFC;">Hey {user_name},</p>
                <p style="margin:0 0 18px;line-height:1.6;color:{cls.ACCENT_TEXT};">
                  {message}
                </p>
                {admin_block}
                <div style="text-align:center;">
                  <a href="{frontend_url}" style="display:inline-block;padding:16px 32px;background:linear-gradient(120deg,{cls.BRAND_GRADIENT_START},{cls.BRAND_GRADIENT_END});color:#0B0B0B;text-decoration:none;font-weight:700;border-radius:999px;border:0;font-size:16px;box-shadow:0 12px 30px rgba(245,158,11,0.35);">
                    Go to Zer0
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;">
                <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:0 0 18px;" />
                <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.65);line-height:1.5;">
                  If you think this is a mistake, please contact us at <a href="mailto:zer0@z-0.io" style="color:#FACC15;text-decoration:none;">zer0@z-0.io</a>.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>'''

    @staticmethod
    def _build_admin_role_changed_text(
        *, user: "User", is_admin: bool, frontend_url: str
    ) -> str:
        user_name = user.display_name or user.username
        action = "granted" if is_admin else "removed"
        message = "You now have admin privileges on Zer0. Use them wisely!" if is_admin else "Your admin privileges have been removed."

        lines = [
            f"Hey {user_name},",
            "",
            message,
            "",
        ]

        if is_admin:
            lines.extend([
                "Admin capabilities:",
                "- Manage users, validators, and investors",
                "- Feature projects and moderate content",
                "- Access analytics and platform stats",
                "- Configure system settings",
                "",
            ])

        lines.extend([
            f"Go to Zer0: {frontend_url}",
            "",
            "If you think this is a mistake, please contact us at zer0@z-0.io.",
        ])
        return "\n".join(lines)
