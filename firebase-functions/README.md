This `firebase-functions/` directory contains the code for the Firebase Function that acts as an intermediary between Zifty and the OpenAI API that handles the AI completion of search queries that need cleaning. For example, a search query that is "buy a surfboard near me" gets converted to "surfboard".

This function **must be deployed** in order for Zifty to work properly. To deploy the function run `firebase deploy --only functions`. The function URL should be: https://us-central1-zifty-4e74a.cloudfunctions.net/completion.

To run locally run `firebase emulators:start --only functions`
