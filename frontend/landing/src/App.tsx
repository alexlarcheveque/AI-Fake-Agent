import React from "react";
import "./index.css";
function App() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Real Nurture
              </h1>
            </div>
            <div className="flex items-center space-x-6">
              <a
                href="#features"
                className="text-gray-700 hover:text-indigo-600 text-sm font-medium"
              >
                Features
              </a>
              <a
                href="#testimonials"
                className="text-gray-700 hover:text-indigo-600 text-sm font-medium"
              >
                Testimonials
              </a>
              <a
                href="#pricing"
                className="text-gray-700 hover:text-indigo-600 text-sm font-medium"
              >
                Pricing
              </a>
              <a
                href="https://app.realnurture.ai"
                className="ml-2 inline-flex items-center px-4 py-2 border border-gray-200 text-sm font-medium rounded-md text-indigo-600 hover:bg-gray-50"
              >
                Sign in
              </a>
              <a
                href="https://app.realnurture.ai"
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Try Now
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 py-12 sm:py-16 md:py-20 lg:py-28 xl:py-32 px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-gray-900">
              <span className="block">The AI</span>
              <span className="block mt-2 text-indigo-600">
                Real Estate Assistant
              </span>
            </h1>
            <p className="mt-6 max-w-lg mx-auto text-xl text-gray-500">
              Focus on closing deals. Let AI handle the rest.
            </p>
            <div className="mt-10 max-w-md mx-auto sm:flex sm:justify-center">
              <div className="rounded-md shadow">
                <a
                  href="https://app.realnurture.ai"
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10"
                >
                  Try for Free
                </a>
              </div>
              <div className="mt-3 sm:mt-0 sm:ml-3">
                <a
                  href="#features"
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 md:py-4 md:text-lg md:px-10"
                >
                  Learn More
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trusted by section */}
      <div className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-base font-medium text-gray-500">
            Trusted by agents at
          </p>
          <div className="mt-6 grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
            <div className="col-span-1 flex justify-center md:col-span-1 lg:col-span-1">
              <span className="text-gray-400 font-medium">Keller Williams</span>
            </div>
            <div className="col-span-1 flex justify-center md:col-span-1 lg:col-span-1">
              <span className="text-gray-400 font-medium">Century 21</span>
            </div>
            <div className="col-span-1 flex justify-center md:col-span-1 lg:col-span-1">
              <span className="text-gray-400 font-medium">RE/MAX</span>
            </div>
            <div className="col-span-1 flex justify-center md:col-span-1 lg:col-span-1">
              <span className="text-gray-400 font-medium">Coldwell Banker</span>
            </div>
            <div className="col-span-1 flex justify-center md:col-span-1 lg:col-span-1">
              <span className="text-gray-400 font-medium">Sotheby's</span>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-lg text-indigo-600 font-semibold">Features</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Client nurture, done for you
            </p>
          </div>

          {/* Feature 1 */}
          <div className="mt-20">
            <div className="lg:grid lg:grid-cols-2 lg:gap-16">
              <div className="relative mb-12 lg:mb-0">
                <div className="bg-gray-100 rounded-xl overflow-hidden h-96"></div>
              </div>
              <div className="relative lg:col-start-2">
                <h3 className="text-3xl font-bold text-gray-900">
                  Automated client chats
                </h3>
                <p className="mt-3 text-lg text-gray-500">
                  Real Nurture lets you breeze through client communications by
                  predicting responses and handling routine inquiries
                  automatically.
                </p>
                <ul className="mt-10 space-y-10">
                  <li className="flex">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h4 className="text-lg leading-6 font-medium text-gray-900">
                        24/7 Client Responses
                      </h4>
                      <p className="mt-2 text-base text-gray-500">
                        Never miss a lead again. Our AI responds to client
                        inquiries instantly, day or night.
                      </p>
                    </div>
                  </li>
                  <li className="flex">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h4 className="text-lg leading-6 font-medium text-gray-900">
                        Follow-up Automation
                      </h4>
                      <p className="mt-2 text-base text-gray-500">
                        Schedule and send personalized follow-ups that feel
                        authentic and drive engagement.
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="mt-32">
            <div className="lg:grid lg:grid-cols-2 lg:gap-16">
              <div className="relative mb-12 lg:mb-0 lg:col-start-2">
                <div className="bg-gray-100 rounded-xl overflow-hidden h-96"></div>
              </div>
              <div className="relative lg:row-start-1">
                <h3 className="text-3xl font-bold text-gray-900">
                  Knows your client's criteria
                </h3>
                <p className="mt-3 text-lg text-gray-500">
                  Generate property recommendations, market analyses, and
                  updates tailored to your client's criteria.
                </p>
                <ul className="mt-10 space-y-10">
                  <li className="flex">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h4 className="text-lg leading-6 font-medium text-gray-900">
                        Property Insights
                      </h4>
                      <p className="mt-2 text-base text-gray-500">
                        Create compelling property descriptions that highlight
                        the best features.
                      </p>
                    </div>
                  </li>
                  <li className="flex">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h4 className="text-lg leading-6 font-medium text-gray-900">
                        Market Analysis
                      </h4>
                      <p className="mt-2 text-base text-gray-500">
                        Generate detailed market reports to help clients make
                        informed decisions.
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="mt-32">
            <div className="lg:grid lg:grid-cols-2 lg:gap-16">
              <div className="relative mb-12 lg:mb-0">
                <div className="bg-gray-100 rounded-xl overflow-hidden h-96"></div>
              </div>
              <div className="relative lg:col-start-2">
                <h3 className="text-3xl font-bold text-gray-900">
                  Time-saving automation
                </h3>
                <p className="mt-3 text-lg text-gray-500">
                  Automate repetitive tasks and administrative work to focus on
                  high-value activities that grow your business.
                </p>
                <ul className="mt-10 space-y-10">
                  <li className="flex">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h4 className="text-lg leading-6 font-medium text-gray-900">
                        Save 15+ hours weekly
                      </h4>
                      <p className="mt-2 text-base text-gray-500">
                        Reclaim your time from routine tasks and focus on
                        closing more deals.
                      </p>
                    </div>
                  </li>
                  <li className="flex">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h4 className="text-lg leading-6 font-medium text-gray-900">
                        Handle more clients
                      </h4>
                      <p className="mt-2 text-base text-gray-500">
                        Scale your business by managing 3x more clients without
                        additional staff.
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div id="testimonials" className="bg-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Loved by world-class agents
            </h2>
            <p className="mt-4 text-xl text-gray-500">
              Real estate professionals choose Real Nurture to grow their
              business
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Testimonial 1 */}
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <p className="text-lg text-gray-600 mb-6">
                "Real Nurture is at least a 2x improvement over my previous
                tools. It's amazing having an AI assistant, and is an incredible
                accelerator for me and my team."
              </p>
              <div className="flex items-center">
                <img
                  className="h-10 w-10 rounded-full"
                  src="https://randomuser.me/api/portraits/women/45.jpg"
                  alt="Sarah Johnson"
                />
                <div className="ml-3">
                  <h4 className="text-base font-medium text-gray-900">
                    Sarah Johnson
                  </h4>
                  <p className="text-sm text-gray-500">
                    Luxury Real Estate, NYC
                  </p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <p className="text-lg text-gray-600 mb-6">
                "Real Nurture is hands down my biggest workflow improvement in
                years. I close more deals while spending less time on
                administrative tasks."
              </p>
              <div className="flex items-center">
                <img
                  className="h-10 w-10 rounded-full"
                  src="https://randomuser.me/api/portraits/men/32.jpg"
                  alt="David Rodriguez"
                />
                <div className="ml-3">
                  <h4 className="text-base font-medium text-gray-900">
                    David Rodriguez
                  </h4>
                  <p className="text-sm text-gray-500">
                    Residential Specialist, Miami
                  </p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <p className="text-lg text-gray-600 mb-6">
                "After many recommendations, I finally tried Real Nurture and...
                wow! It's absolutely incredible. There is no going back to my
                old way of working."
              </p>
              <div className="flex items-center">
                <img
                  className="h-10 w-10 rounded-full"
                  src="https://randomuser.me/api/portraits/women/68.jpg"
                  alt="Lisa Chen"
                />
                <div className="ml-3">
                  <h4 className="text-base font-medium text-gray-900">
                    Lisa Chen
                  </h4>
                  <p className="text-sm text-gray-500">
                    Commercial Real Estate, Chicago
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div id="pricing" className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-xl text-gray-500">
              No hidden fees, no long-term contracts. Start your 14-day free
              trial today.
            </p>
          </div>
          <div className="mt-16 flex justify-center">
            <div className="rounded-lg shadow-lg overflow-hidden w-full max-w-md">
              <div className="bg-white px-8 py-12">
                <h3 className="text-center text-2xl font-bold text-gray-900">
                  Pro Plan
                </h3>
                <div className="mt-6 flex justify-center">
                  <span className="text-5xl font-extrabold tracking-tight text-gray-900">
                    $49
                  </span>
                  <span className="ml-1 text-xl font-medium text-gray-500 self-end">
                    /month
                  </span>
                </div>
                <p className="mt-4 text-gray-500 text-center">
                  Everything you need to grow your real estate business
                </p>
                <ul className="mt-8 space-y-5">
                  <li className="flex items-center">
                    <svg
                      className="h-5 w-5 text-green-500"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="ml-3 text-gray-700">
                      Unlimited client communications
                    </span>
                  </li>
                  <li className="flex items-center">
                    <svg
                      className="h-5 w-5 text-green-500"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="ml-3 text-gray-700">
                      Property description generator
                    </span>
                  </li>
                  <li className="flex items-center">
                    <svg
                      className="h-5 w-5 text-green-500"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="ml-3 text-gray-700">
                      Market analysis reports
                    </span>
                  </li>
                  <li className="flex items-center">
                    <svg
                      className="h-5 w-5 text-green-500"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="ml-3 text-gray-700">
                      24/7 client response system
                    </span>
                  </li>
                </ul>
              </div>
              <div className="px-6 py-8 bg-gray-50 text-center">
                <a
                  href="https://app.realnurture.ai"
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10"
                >
                  Start your free trial
                </a>
                <p className="mt-4 text-sm text-gray-500">
                  No credit card required
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-indigo-600">
        <div className="max-w-2xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            <span className="block">
              Ready to transform your real estate business?
            </span>
          </h2>
          <p className="mt-4 text-xl leading-6 text-indigo-200">
            Join thousands of successful agents who are saving time and closing
            more deals.
          </p>
          <a
            href="https://app.realnurture.ai"
            className="mt-8 w-full inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50 sm:w-auto"
          >
            Try Now
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-200">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-shrink-0 flex items-center">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Real Nurture
              </h2>
            </div>
            <div className="mt-8 md:mt-0">
              <p className="text-center text-base text-gray-500 md:text-right">
                &copy; {new Date().getFullYear()} Real Nurture. All rights
                reserved.
              </p>
            </div>
          </div>
          <div className="mt-8 flex justify-center md:justify-start space-x-6">
            <a href="#" className="text-gray-400 hover:text-gray-500">
              Privacy
            </a>
            <a href="#" className="text-gray-400 hover:text-gray-500">
              Terms
            </a>
            <a href="#" className="text-gray-400 hover:text-gray-500">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
