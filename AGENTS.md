<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Before deploying

Bump the service worker cache version in `public/sw.js` before every deploy:

```js
const CACHE_NAME = 'umc-vN'        // increment N
const STATIC_CACHE = 'umc-static-vN'  // increment N
```

This ensures devices with the PWA installed clear stale caches when the new service worker activates.
