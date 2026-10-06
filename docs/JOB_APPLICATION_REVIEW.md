# Job application review

The Jobs page in Super Admin and the company workspace share the application
review panel. It shows contact information, typed skills, expected salary,
cover letter, portfolio, experience and training. Supporting documents use
the existing private download service. The printable view can be saved as PDF
using the browser's Print / Save as PDF command; document attachments remain
separate downloads.

Apply the forward migrations `20261006120000` and `20261006130000` before
releasing the updated forms and review panel. Historical application records
remain valid; missing optional values display as Not provided.

The review RPC uses the existing module/entity entitlement function and active
account check. Super Admin retains access. Assigned company or individual-job
administrators need the job_applications entitlement. Applicant withdrawal is
preserved. Hiring updates are audited; submitted answers cannot be edited by
module admins through the review endpoint.

Interview times are entered in the reviewer's browser timezone, stored in UTC
and stated explicitly in Asia/Kathmandu in notification emails. Selection,
confirmation, scheduling and rescheduling enqueue dashboard and email records
atomically with the update. The endpoint attempts email delivery through the
existing configured provider, records the result and reports failures without
rolling back the hiring decision. Resend requests use notification-specific
idempotency keys. Unchanged saves do not send another message.

## Release verification

- Submit a new application with all optional data and three documents; verify
  the assigned Jobs admin sees the answers and can download every attachment.
- Repeat without experience, training or salary.
- Confirm an unrelated Jobs admin and student cannot access the application
  review endpoint or download its attachments; confirm expiry blocks admin access.
- Screen, mark Yet to follow up, select and confirm an application.
- Schedule and reschedule a future interview; verify the applicant receives
  the correct email and dashboard notification, including date/time/location.
- Repeat an unchanged save and verify no duplicate email is generated.
- Test unavailable email configuration: the decision saves and an accurate
  delivery failure is shown. Failed notification records remain for follow-up.
- Print a long application to PDF and verify line wrapping and all answers.

Live database execution, authenticated browser journeys and actual email
delivery must be verified after migration/configuration; local build and
mocked route tests do not establish those outcomes.
