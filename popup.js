const authButton = document.getElementById("auth-button");
const subscriptionContainer = document.getElementById("subscription-container");
const subscriptionMessage = document.getElementById("subscription-message");
const subscriptionButton = document.getElementById("subscription-button");
const signUpMessage = document.getElementById("signup-message");

function updateUI(
  response,
  handleSignIn,
  handleLogout,
  handleSubscribe,
  handleResume,
  handleCancel
) {
  if (response.isUserSignedIn) {
    authButton.textContent = "Logout";
    authButton.removeEventListener("click", handleSignIn);
    authButton.addEventListener("click", handleLogout);

    subscriptionContainer.style.display = "inline-block";
    signUpMessage.textContent = "";

    if (response.hasSubscription) {
      if (response.isSubscriptionCancelled) {
        subscriptionButton.textContent = "Resume Subscription";
        subscriptionMessage.innerHTML =
          "Your subscription has been cancelled and will expire soon.";
        subscriptionButton.removeEventListener("click", handleSubscribe);
        subscriptionButton.addEventListener("click", handleResume);
      } else {
        subscriptionButton.textContent = "Cancel Subscription 😔";
        subscriptionMessage.innerHTML =
          'Thanks for being a Zifty subscriber! 🎉 Try <a href="https://www.google.com/search?q=buy+a+kettle+near+me" target="_blank">now</a>.';
        subscriptionButton.removeEventListener("click", handleSubscribe);
        subscriptionButton.addEventListener("click", handleCancel);
      }
    } else {
      subscriptionButton.textContent = "💳 Subscribe";
      subscriptionMessage.textContent =
        "Zifty is free to use with Amazon. Subscribe for $1/week to use Zifty with Google. Cancel anytime.";
      subscriptionButton.removeEventListener("click", handleCancel);
      subscriptionButton.removeEventListener("click", handleResume);
      subscriptionButton.addEventListener("click", handleSubscribe);
    }
  } else {
    authButton.innerHTML =
      '<img src="./assets/google.svg" /> <span id="auth-button-label">Sign in with Google</span>';
    authButton.removeEventListener("click", handleLogout);
    authButton.addEventListener("click", handleSignIn);

    signUpMessage.textContent =
      "Sign up and subscribe to access premium features!";
    subscriptionContainer.style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const loadingDotsHTML =
    '<span class="loading-dots"><span>.</span><span>.</span><span>.</span></span>';

  chrome.runtime.sendMessage({ message: "getSessionDetails" }, (response) => {
    console.log("Response from background:", response);
    updateUI(
      response,
      handleSignIn,
      handleLogout,
      handleSubscribe,
      handleResume,
      handleCancel
    );
  });

  function handleSignIn() {
    authButton.innerHTML = loadingDotsHTML;

    chrome.runtime.sendMessage({ message: "signIn" }, (response) => {
      if (response.success) {
        chrome.runtime.sendMessage(
          { message: "getSessionDetails" },
          (response) => {
            updateUI(
              response,
              handleSignIn,
              handleLogout,
              handleSubscribe,
              handleResume,
              handleCancel
            );
          }
        );
      }
    });
  }

  const handleLogout = () => {
    authButton.innerHTML = loadingDotsHTML;

    chrome.runtime.sendMessage({ message: "signOut" }, (response) => {
      if (response.success) {
        chrome.runtime.sendMessage(
          { message: "getSessionDetails" },
          (response) => {
            updateUI(
              response,
              handleSignIn,
              handleLogout,
              handleSubscribe,
              handleResume,
              handleCancel
            );
          }
        );
      }
    });
  };

  const handleSubscribe = () => {
    subscriptionButton.innerHTML = loadingDotsHTML;

    chrome.runtime.sendMessage(
      { message: "createSubscription" },
      (response) => {
        if (response.success) {
          try {
            console.log("Redirecting to payment page...");
            chrome.tabs.create({
              url:
                "https://zifty.lemonsqueezy.com/buy/108ac084-c9a0-4c10-bd31-0a2f4552c7bf?checkout[custom][user_id]=" +
                response.currentUser.uid,
            });
          } catch (error) {
            console.error("Failed to subscribe:", error.message || error);
          }
        }
      }
    );
  };

  const handleResume = () => {
    subscriptionButton.innerHTML = loadingDotsHTML;

    chrome.runtime.sendMessage(
      { message: "resumeSubscription" },
      (response) => {
        if (response.success) {
          chrome.runtime.sendMessage(
            { message: "getSessionDetails" },
            (response) => {
              updateUI(
                response,
                handleSignIn,
                handleLogout,
                handleSubscribe,
                handleResume,
                handleCancel
              );
            }
          );
        }
      }
    );
  };

  const handleCancel = () => {
    subscriptionButton.innerHTML = loadingDotsHTML;

    chrome.runtime.sendMessage(
      { message: "cancelSubscription" },
      (response) => {
        if (response.success) {
          chrome.runtime.sendMessage(
            { message: "getSessionDetails" },
            (response) => {
              updateUI(
                response,
                handleSignIn,
                handleLogout,
                handleSubscribe,
                handleResume,
                handleCancel
              );
            }
          );
        }
      }
    );
  };

  // onAuthStateChanged(auth, async (user) => {
  //   if (user) {
  //     // If a user is signed in change the functionality of the button to logout
  //     // If the user is not signed in, change the functionality of the button to sign in
  //     authButton.textContent = "Logout";
  //     authButton.removeEventListener("click", handleSignIn);
  //     authButton.addEventListener("click", handleLogout);

  //     subscriptionContainer.style.display = "inline-block";
  //     signUpMessage.textContent = "";

  //     // Then check if that user is subscribed
  //     const isSubscribed = await isUserSubscribed(user.uid);

  //     if (isSubscribed) {
  //       const isCancelled = await isUserCancelled(user.uid);
  //       // If the user is subscribed but has cancelled, show the renew button, otherwise show the cancel button
  //       // If the user is not subscribed, show the subscribe button
  //       if (isCancelled) {
  //         subscriptionButton.textContent = "Resume Subscription";
  //         subscriptionMessage.innerHTML =
  //           "Your subscription has been cancelled and will expire soon.";
  //         subscriptionButton.removeEventListener("click", handleSubscribe);
  //         subscriptionButton.addEventListener("click", handleResume);
  //       } else {
  //         subscriptionButton.textContent = "Cancel Subscription 😔";
  //         subscriptionMessage.innerHTML =
  //           'Thanks for being a Zifty subscriber! 🎉 Try <a href="https://www.google.com/search?q=buy+a+kettle+near+me" target="_blank">now</a>.';
  //         subscriptionButton.removeEventListener("click", handleSubscribe);
  //         subscriptionButton.addEventListener("click", handleCancel);
  //       }
  //     } else {
  //       subscriptionButton.textContent = "💳 Subscribe";
  //       subscriptionMessage.textContent =
  //         "Zifty is free to use with Amazon. Subscribe for $1/week to use Zifty with Google. Cancel anytime.";
  //       subscriptionButton.removeEventListener("click", handleCancel);
  //       subscriptionButton.removeEventListener("click", handleResume);
  //       subscriptionButton.addEventListener("click", handleSubscribe);
  //     }
  //   } else {
  //     authButton.innerHTML =
  //       '<img src="./assets/google.svg" /> <span id="auth-button-label">Sign in with Google</span>';
  //     authButton.removeEventListener("click", handleLogout);
  //     authButton.addEventListener("click", handleSignIn);

  //     signUpMessage.textContent =
  //       "Sign up and subscribe to access premium features!";
  //     subscriptionContainer.style.display = "none";
  //   }
  // });
});
