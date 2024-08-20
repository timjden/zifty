This `functions/` directory contains the code for the Firebase Function that handles the AI completion of search queries that need cleaning. For example, a search query that is "buy a surfboard near me" gets converted to "surfboard".

To deploy the function run `firebase deploy --only functions:completion`.

To run locally run `firebase emulators:start`

The function URL should be: https://us-central1-zifty-4e74a.cloudfunctions.net/completion
