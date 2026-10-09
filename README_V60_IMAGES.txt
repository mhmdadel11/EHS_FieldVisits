V60 image persistence/display fix.
- Visit images are inserted explicitly with VisitId into VisitImages.
- Added authenticated GET /api/visits/{id}/images.
- Details page loads SQL image rows directly and serves them through authenticated image endpoint.
- Legacy IndexedDB images remain supported.
