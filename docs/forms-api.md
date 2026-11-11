# Forms API

Static websites submit form data to:

```text
POST /api/{tenantSlug}/forms/{formApiId}
Content-Type: application/json
```

The endpoint is public and supports cross-origin browser requests. The JSON body
must contain only fields configured for the form in YACMS. Required fields and
field types are validated before the submission is stored.

Example for a `contact` form with required `name`, `email`, and `message` fields:

```http
POST /api/unifato/forms/contact HTTP/1.1
Content-Type: application/json

{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "message": "I would like to learn more."
}
```

Successful response:

```json
{
  "data": {
    "id": "submission-id",
    "createdAt": "2026-11-11T12:00:00.000Z"
  }
}
```

Validation response (`400`):

```json
{
  "error": "Invalid submission.",
  "fields": {
    "email": "Enter a valid email address."
  }
}
```

Other responses:

- `404` when the tenant or form API ID does not exist.
- `413` when the declared request body is larger than 64 KiB.
- `415` when the request does not use `application/json`.

SMTP settings are stored for future email delivery. This version validates and
stores submissions but does not send email.
