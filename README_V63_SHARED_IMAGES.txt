V63 - Shared Visit Images

Change requested:
- Any authenticated user can VIEW images attached to any visit, including visits created by another user.
- Existing security remains unchanged for creating, editing, and deleting visits: normal users can only modify their own visits; admins retain full permissions.
- Image upload remains authenticated.

Files changed:
- Controllers/VisitsController.cs

No database migration is required for this authorization-only change.
