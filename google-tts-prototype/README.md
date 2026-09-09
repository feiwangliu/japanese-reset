# Google TTS prototype

This Cloud Run function generates only the fixed `real-breakfast` passage. It uses Application Default Credentials from its runtime service account, so no API key is stored in the site or repository.

Required runtime service-account permission:

* `roles/aiplatform.user`

Required project setup:

* Billing enabled
* Cloud Text-to-Speech API enabled
* Cloud Run and Cloud Build APIs enabled for source deployment

After deployment, place the public Cloud Run function URL in `../tts-config.js`.
