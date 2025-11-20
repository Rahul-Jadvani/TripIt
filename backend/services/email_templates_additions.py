"""
Email template builders to be added to email_service.py
Copy and paste these methods into the EmailService class
"""

# These templates follow the same structure as existing templates in email_service.py
# Using Zer0 black + yellow branding

TEMPLATES = """
    @classmethod
    def _build_intro_accepted_html(
        cls, *, investor: "User", builder: "User", project: "Project", frontend_url: str
    ) -> str:
        investor_name = investor.display_name or investor.username
        builder_name = builder.display_name or builder.username
        return f'''<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Intro Request Accepted</title>
  </head>
  <body style="margin:0;padding:24px;background:#050A13;font-family:'Inter','Segoe UI',system-ui,-apple-system,sans-serif;color:#F8FBFF;">
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
                  <div style="font-size:14px;letter-spacing:1px;text-transform:uppercase;color:#FACC15;margin-bottom:6px;">What's next</div>
                  <ul style="margin:0;padding-left:18px;color:#E5E7EB;line-height:1.6;">
                    <li>Check your messages to continue the conversation</li>
                    <li>Share your investment thesis and ask questions</li>
                    <li>Schedule a call if there's mutual interest</li>
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
</html>'''

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
            "What's next:",
            "- Check your messages to continue the conversation",
            "- Share your investment thesis and ask questions",
            "- Schedule a call if there's mutual interest",
            "",
            f"Open messages: {frontend_url}",
        ]
        return "\\n".join(lines)

    @classmethod
    def _build_intro_declined_html(
        cls, *, investor: "User", builder: "User", project: "Project", frontend_url: str
    ) -> str:
        investor_name = investor.display_name or investor.username
        builder_name = builder.display_name or builder.username
        return f'''<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Intro Request Update</title>
  </head>
  <body style="margin:0;padding:24px;background:#050A13;font-family:'Inter','Segoe UI',system-ui,-apple-system,sans-serif;color:#F8FBFF;">
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
                  {builder_name} isn't able to connect regarding <strong style="color:#FFFFFF;">{project.title}</strong> at this time. Don't let that stop you—there are plenty of other great builders to discover on Zer0.
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
</html>'''

    @staticmethod
    def _build_intro_declined_text(
        *, investor: "User", builder: "User", project: "Project", frontend_url: str
    ) -> str:
        investor_name = investor.display_name or investor.username
        builder_name = builder.display_name or builder.username
        lines = [
            f"Hey {investor_name},",
            "",
            f"{builder_name} isn't able to connect regarding {project.title} at this time.",
            "Don't let that stop you—there are plenty of other great builders to discover on Zer0.",
            "",
            f"Explore more projects: {frontend_url}",
        ]
        return "\\n".join(lines)
"""

print("Copy these templates into email_service.py")
print(TEMPLATES)
