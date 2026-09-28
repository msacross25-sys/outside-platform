# Media

OUTSiiDE media uses direct uploads so large photo and video files do not pass through the application server.

Current application limits:
- Images: 15 MB
- Videos: 500 MB

Production flow:
1. A signed-in user selects media.
2. OUTSiiDE validates the requested media type and size.
3. The configured media service authorizes a direct upload.
4. The client uploads the file directly.
5. Processing creates playback assets and metadata.
6. OUTSiiDE stores the resulting media record on the post.
7. Delivery is handled through a CDN.

Production media must support upload authorization, video processing, deletion, delivery, and event callbacks. Deployment credentials belong in environment configuration and are not committed to this repository.
