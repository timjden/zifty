This `firebase-hosting/` directory contains static pages required by Google to publish Zifty to the Chrome Web Store e.g. privacy policy, terms of service. These pages are hosted on Firebase Hosting.

To deploy the pages run `firebase deploy --only hosting`.

To run locally run `firebase emulators:start --only hosting`

The function URL should be: https://us-central1-zifty-4e74a.cloudfunctions.net/completion
