# Guest college application verification

Guest applicants enter their name, email, and a required WhatsApp-enabled number. The app asks for a six-digit code on each channel, then accepts the application only after both codes have been checked. The server and the `submit_guest_college_application` database RPC bind proof to the guest token, college, email, and WhatsApp number. A browser flag or a successful provider API call alone is not proof.

## MeroTalent-only OpenWA

Use a **fresh OpenWA installation and WhatsApp session for MeroTalent**. Do not connect this app to the CTMS OpenWA instance, session, credentials, or phone number.

1. Provision a persistent Docker host with HTTPS, backups for the OpenWA data volume, and access restricted to administrators and the MeroTalent server. Follow the upstream [production deployment guide](https://github.com/rmyndharis/OpenWA#-production-deployment). Vercel's stateless app runtime is not the OpenWA host.
2. Install/pin upstream `rmyndharis/OpenWA`. Create a session named for MeroTalent, start it, and pair a **dedicated WhatsApp number** using the QR code. The phone's owner must perform the pairing. Record the session UUID, not just its name.
3. Create an OpenWA **operator API key scoped only to that MeroTalent session**. Do not use the admin key for application traffic. Validate that `GET /api/sessions/{sessionId}` shows `ready` and that a controlled test message arrives before enabling guest applications.
4. Set server-only deployment variables (never `NEXT_PUBLIC_`):
   - `OPENWA_BASE_URL`: HTTPS origin of the dedicated gateway.
   - `OPENWA_SESSION_ID`: MeroTalent session UUID.
   - `OPENWA_API_KEY`: session-scoped operator key.
   - `GUEST_VERIFICATION_HMAC_KEY`: 32 random bytes encoded as canonical Base64; do not reuse another app's key.
5. Configure the existing transactional email provider (an enabled Resend Provider Center configuration or the existing server-side `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM` variables). If email or WhatsApp delivery is unavailable, the verification request fails closed and the application is not submitted.
6. Apply `20261006110000_verify_guest_college_email_and_whatsapp.sql` before releasing the application route. Verify the two codes and a guest application on staging, including a wrong code, expired code, destination change, duplicate request, and a direct submit without proof.

OpenWA is an unofficial WhatsApp client. Its upstream documentation warns of account restrictions and recommends a dedicated number and a fallback for critical flows. An accepted send request is not delivery evidence; only the applicant's returned code is accepted as possession proof. The application does not claim delivery on a `200` response.

## Data handling

Verification codes are never stored in plaintext. HMAC hashes, short expiry windows, per-destination/token request limits, and attempt limits are enforced in the database. The application stores the verified WhatsApp number and timestamps with the private college application. The challenge and send-rate records are private service-role data. Production operations should prune expired challenges and old send-rate records under the platform's retention policy.
