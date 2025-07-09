import React from "react";
import {
  CurrentSubscription,
  SubscriptionPlans,
} from "../../api/subscriptionApi";

interface SubscriptionSettingsProps {
  subscription: CurrentSubscription | null;
  subscriptionPlans: SubscriptionPlans | null;
  isLoadingSubscription: boolean;
  handleUpgrade: (planType: "PRO" | "UNLIMITED") => Promise<void>;
  handleManageSubscription: () => Promise<void>;
  error: string | null;
}

const SubscriptionSettings: React.FC<SubscriptionSettingsProps> = ({
  subscription,
  subscriptionPlans,
  isLoadingSubscription,
  handleUpgrade,
  handleManageSubscription,
  error,
}) => {
  console.log("🔍 SubscriptionSettings render:", {
    isLoadingSubscription,
    handleUpgrade: typeof handleUpgrade,
    subscription,
  });

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          Subscription Settings
        </h2>
        <p className="text-gray-600 mt-2">
          Manage your subscription plan and billing information.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 p-4 rounded-md">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Current Plan */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900">Current Plan</h3>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {subscription?.plan?.toLowerCase() || "Free Plan"}
              </p>
              {subscription && subscription.plan !== "FREE" && (
                <p className="text-gray-600">Annual billing</p>
              )}
            </div>
          </div>
        </div>

        {/* Upgrade Options */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              Upgrade Your Plan
            </h3>
            <p className="text-gray-500">
              Choose a plan that fits your business needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pro Plan */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="mb-4">
                <h4 className="text-lg font-semibold text-gray-900">
                  Pro Plan
                </h4>
                <p className="text-2xl font-bold text-gray-900">
                  $588
                  <span className="text-base font-normal text-gray-500">
                    /year
                  </span>
                </p>
                <p className="text-sm text-gray-500">
                  $49/month, billed annually
                </p>
              </div>

              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-sm text-gray-600">
                  <svg
                    className="h-4 w-4 text-green-500 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Unlimited leads
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <svg
                    className="h-4 w-4 text-green-500 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Voice calling
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <svg
                    className="h-4 w-4 text-green-500 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Advanced analytics
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <svg
                    className="h-4 w-4 text-green-500 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Priority support
                </li>
              </ul>

              <button
                onClick={async () => {
                  try {
                    console.log("🔵 PRO button clicked - DIRECT API TEST!");

                    // Direct API call bypassing handleUpgrade
                    const response = await fetch(
                      "/api/subscriptions/checkout",
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${localStorage.getItem(
                            "token"
                          )}`,
                        },
                        body: JSON.stringify({ planType: "PRO" }),
                      }
                    );

                    const data = await response.json();
                    console.log("🔵 Direct API response:", data);

                    if (data.url) {
                      console.log("🔵 Redirecting to:", data.url);
                      window.location.href = data.url;
                    } else {
                      console.error("🔴 No URL in response:", data);
                    }
                  } catch (error) {
                    console.error("🔴 Error in direct API call:", error);
                  }
                }}
                disabled={isLoadingSubscription}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoadingSubscription ? "Processing..." : "Upgrade to Pro"}
              </button>
            </div>

            {/* Unlimited Plan */}
            <div className="border border-blue-500 rounded-lg p-6 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-600 text-white px-3 py-1 text-xs font-medium rounded-full">
                  Most Popular
                </span>
              </div>

              <div className="mb-4">
                <h4 className="text-lg font-semibold text-gray-900">
                  Unlimited Plan
                </h4>
                <p className="text-2xl font-bold text-gray-900">
                  $1,188
                  <span className="text-base font-normal text-gray-500">
                    /year
                  </span>
                </p>
                <p className="text-sm text-gray-500">
                  $99/month, billed annually
                </p>
              </div>

              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-sm text-gray-600">
                  <svg
                    className="h-4 w-4 text-green-500 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Everything in Pro
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <svg
                    className="h-4 w-4 text-green-500 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Unlimited voice calls
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <svg
                    className="h-4 w-4 text-green-500 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Custom integrations
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <svg
                    className="h-4 w-4 text-green-500 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  24/7 dedicated support
                </li>
              </ul>

              <button
                onClick={async () => {
                  try {
                    console.log(
                      "🟠 UNLIMITED button clicked - DIRECT API TEST!"
                    );

                    // Direct API call bypassing handleUpgrade
                    const response = await fetch(
                      "/api/subscriptions/checkout",
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${localStorage.getItem(
                            "token"
                          )}`,
                        },
                        body: JSON.stringify({ planType: "UNLIMITED" }),
                      }
                    );

                    const data = await response.json();
                    console.log("🟠 Direct API response:", data);

                    if (data.url) {
                      console.log("🟠 Redirecting to:", data.url);
                      window.location.href = data.url;
                    } else {
                      console.error("🔴 No URL in UNLIMITED response:", data);
                    }
                  } catch (error) {
                    console.error(
                      "🔴 Error in UNLIMITED direct API call:",
                      error
                    );
                  }
                }}
                disabled={isLoadingSubscription}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoadingSubscription
                  ? "Processing..."
                  : "Upgrade to Unlimited"}
              </button>
            </div>
          </div>
        </div>

        {/* Billing Management */}
        {subscription && subscription.plan !== "FREE" && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Billing Management
                </h3>
                <p className="text-gray-500">
                  Manage your subscription, payment methods, and billing history
                </p>
              </div>
              <button
                onClick={handleManageSubscription}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Manage Billing
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionSettings;
