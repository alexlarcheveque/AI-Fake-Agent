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
            <p className="text-gray-500">Your active subscription details</p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {subscription?.plan?.toLowerCase() || "Free Plan"}
              </p>
              <p className="text-gray-600">
                {subscription?.status === "active" ? "Active" : "Inactive"} •
                {subscription?.billing_cycle === "monthly"
                  ? " Monthly"
                  : " Annual"}{" "}
                billing
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Status</p>
              <span
                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  subscription?.status === "active"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {subscription?.status || "inactive"}
              </span>
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
                  $99
                  <span className="text-base font-normal text-gray-500">
                    /month
                  </span>
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
                onClick={() => handleUpgrade("pro")}
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
                  $199
                  <span className="text-base font-normal text-gray-500">
                    /month
                  </span>
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
                onClick={() => handleUpgrade("unlimited")}
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

        {/* Billing Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Billing Information
            </h3>
            <p className="text-gray-500">
              Manage your payment method and billing details
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </p>
              <p className="text-gray-600">
                {subscription?.payment_method
                  ? `•••• •••• •••• ${subscription.payment_method.last4}`
                  : "No payment method on file"}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                Next Billing Date
              </p>
              <p className="text-gray-600">
                {subscription?.next_billing_date
                  ? new Date(
                      subscription.next_billing_date
                    ).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric"
                    })
                  : "N/A"}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={handleManageSubscription}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Manage Billing
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <svg
              className="h-5 w-5 text-blue-400 mt-0.5 mr-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-blue-900">
                Subscription Management
              </h3>
              <p className="mt-1 text-sm text-blue-700">
                You can upgrade or downgrade your plan at any time. Changes will
                be prorated based on your billing cycle.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSettings;
