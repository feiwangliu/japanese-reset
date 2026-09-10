# Google TTS for Japanese Reset shadowing

This Cloud Run function generates bounded, structured audio requests for Japanese Reset shadowing passages. It uses Application Default Credentials from its runtime service account, so no API key is stored in the site or repository.

The endpoint accepts one passage per request with a limited list of full-passage or sentence clips. Passage IDs, clip IDs, Japanese text, field names, request size, clip count, and text lengths are validated. CORS remains restricted to the Japanese Reset GitHub Pages origin.

Required runtime service-account permission:

* `roles/aiplatform.user`

Required project setup:

* Billing enabled
* Cloud Text-to-Speech API enabled
* Cloud Run and Cloud Build APIs enabled for source deployment

After deployment, place the public Cloud Run function URL in `../tts-config.js`.
