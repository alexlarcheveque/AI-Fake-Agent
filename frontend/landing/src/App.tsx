import React, { useState } from "react";
import "./index.css";

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Real Nurture{" "}
                <span className="text-xs font-normal text-gray-500">
                  (Beta)
                </span>
              </h1>
            </div>

            {/* Desktop navigation */}
            <div className="hidden md:flex items-center space-x-6">
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

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button
                type="button"
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                aria-expanded="false"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <span className="sr-only">Open main menu</span>
                {!mobileMenuOpen ? (
                  <svg
                    className="block h-6 w-6"
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
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                ) : (
                  <svg
                    className="block h-6 w-6"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu, show/hide based on menu state */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="pt-2 pb-3 space-y-1 border-t border-gray-100">
              <a
                href="#features"
                className="block pl-3 pr-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
              >
                Features
              </a>
              <a
                href="#testimonials"
                className="block pl-3 pr-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
              >
                Testimonials
              </a>
              <a
                href="#pricing"
                className="block pl-3 pr-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
              >
                Pricing
              </a>
              <div className="mt-4 flex flex-col space-y-2 px-3">
                <a
                  href="https://app.realnurture.ai"
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-200 text-sm font-medium rounded-md text-indigo-600 hover:bg-gray-50"
                >
                  Sign in
                </a>
                <a
                  href="https://app.realnurture.ai"
                  className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Try Now
                </a>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="max-w-6xl mx-auto">
          <div className="relative z-10 py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
              <span className="block">The AI Real Estate Assistant</span>
              <span className="block mt-2 text-indigo-600">
                That Never Sleeps
              </span>
            </h2>
            <p className="mt-6 max-w-lg mx-auto text-lg text-gray-600">
              Focus on closing deals while our AI handles client nurturing,
              follow-ups, and scheduling.
            </p>
            <div className="mt-10 max-w-md mx-auto sm:flex sm:justify-center">
              <div className="rounded-md shadow">
                <a
                  href="https://app.realnurture.ai"
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10"
                >
                  Try Free
                </a>
              </div>
              <div className="mt-3 sm:mt-0 sm:ml-3">
                <a
                  href="#features"
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 md:py-4 md:text-lg md:px-10"
                >
                  See How It Works
                </a>
              </div>
            </div>
          </div>
          {/* Screenshot of the application */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
            <div className="bg-white overflow-hidden border border-gray-200 shadow-xl rounded-t-xl">
              <img
                src="/images/cover-screenshot.png"
                alt="Real Nurture application interface showing client conversation"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Trusted by section */}
      <div className="bg-white py-16 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-medium text-gray-500 uppercase tracking-wider mb-8">
            Trusted by agents from
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 items-center px-4 md:px-0">
            <div className="flex justify-center">
              <img
                src="/images/kw-logo.png"
                alt="Keller Williams"
                className="h-12 filter grayscale opacity-50 object-contain"
              />
            </div>
            <div className="flex justify-center">
              <img
                src="/images/cw-logo.png"
                alt="Coldwell Banker"
                className="h-10 filter grayscale opacity-50 object-contain"
              />
            </div>
            <div className="flex justify-center">
              <img
                src="/images/c21-logo.png"
                alt="Century 21"
                className="h-12 filter grayscale opacity-50 object-contain"
              />
            </div>
            <div className="flex justify-center">
              <img
                src="/images/remax-logo.png"
                alt="RE/MAX"
                className="h-12 filter grayscale opacity-50 object-contain"
              />
            </div>
            <div className="flex justify-center">
              <img
                src="/images/exp-logo.webp"
                alt="eXp Realty"
                className="h-10 filter grayscale opacity-50 object-contain"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div
        id="features"
        className="py-20 bg-gradient-to-br from-indigo-50 via-white to-purple-50"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">
              Features
            </span>
            <h2 className="mt-2 text-5xl font-bold text-gray-900">
              Smart solutions for busy agents
            </h2>
          </div>

          <div className="mt-16 space-y-20">
            {/* Feature 1 */}
            <div>
              <div className="text-center mb-8">
                <h3 className="text-xl font-bold text-gray-900">
                  24/7 Client Communication
                </h3>
                <p className="mt-3 max-w-2xl mx-auto text-base text-gray-600">
                  Respond to client inquiries instantly, any time of day or
                  night. Never miss an opportunity to connect with potential
                  buyers or sellers.
                </p>
              </div>
              <div className="bg-gray-100 rounded-xl overflow-hidden w-full aspect-video mx-auto shadow-md border border-gray-200">
                <video
                  src="/videos/automated-client-chats.mov"
                  className="object-cover h-full w-full"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              </div>
            </div>

            {/* Feature 2 */}
            <div>
              <div className="text-center mb-8">
                <h3 className="text-xl font-bold text-gray-900">
                  Intelligent Scheduling
                </h3>
                <p className="mt-3 max-w-2xl mx-auto text-base text-gray-600">
                  Convert casual scheduling mentions into confirmed appointments
                  automatically. Keep your calendar organized, and focus on real
                  estate tasks that actually turn into closed deals.
                </p>
              </div>
              <div className="bg-gray-100 rounded-xl overflow-hidden w-full aspect-video mx-auto shadow-md border border-gray-200">
                <video
                  src="/videos/appointment-generation.mov"
                  className="object-cover h-full w-full"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              </div>
            </div>

            {/* Feature 3 */}
            <div>
              <div className="text-center mb-8">
                <h3 className="text-xl font-bold text-gray-900">
                  Automated Lead Nurturing
                </h3>
                <p className="mt-3 max-w-2xl mx-auto text-base text-gray-600">
                  Keep leads engaged with personalized follow-ups and timely
                  information. Turn prospects into clients without constant
                  manual outreach.
                </p>
              </div>
              <div className="bg-gray-100 rounded-xl overflow-hidden w-full aspect-video mx-auto shadow-md border border-gray-200">
                <video
                  src="/videos/automated-pipeline.mov"
                  className="object-cover h-full w-full"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div
        id="testimonials"
        className="bg-white py-20 border-t border-gray-100"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">
              Testimonials
            </span>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              Trusted by top agents
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600">
              See how Real Nurture is helping agents close more deals
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Testimonial 1 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <p className="text-base text-gray-600 mb-6">
                "Real Nurture is at least a 2x improvement over my previous
                tools. It's an incredible accelerator for me and my team."
              </p>
              <div className="flex items-center">
                <img
                  className="h-10 w-10 rounded-full"
                  src="https://randomuser.me/api/portraits/women/45.jpg"
                  alt="Sarah Johnson"
                />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-gray-900">
                    Sarah Johnson
                  </h4>
                  <p className="text-xs text-gray-500">
                    Luxury Real Estate, NYC
                  </p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <p className="text-base text-gray-600 mb-6">
                "Real Nurture has allowed me to re-engage inactive leads
                automatically. Some of these follow-ups have turned into closed
                deals."
              </p>
              <div className="flex items-center">
                <img
                  className="h-10 w-10 rounded-full"
                  src="https://randomuser.me/api/portraits/women/68.jpg"
                  alt="Lisa Warner"
                />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-gray-900">
                    Lisa Warner
                  </h4>
                  <p className="text-xs text-gray-500">
                    Team Lead, Los Angeles
                  </p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <p className="text-base text-gray-600 mb-6">
                "Real Nurture is hands down my biggest workflow improvement in
                years. I close more deals while spending less time on
                follow-ups."
              </p>
              <div className="flex items-center">
                <img
                  className="h-10 w-10 rounded-full"
                  src="https://randomuser.me/api/portraits/men/32.jpg"
                  alt="David Rodriguez"
                />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-gray-900">
                    David Rodriguez
                  </h4>
                  <p className="text-xs text-gray-500">
                    Residential Specialist, Miami
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div
        id="pricing"
        className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-20 border-t border-gray-100"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">
              Pricing
            </span>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600">
              Choose the plan that works for your business
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Free Tier */}
            <div className="rounded-lg shadow-md overflow-hidden w-full border border-gray-100">
              <div className="bg-white px-6 py-8">
                <h3 className="text-center text-xl font-bold text-gray-900">
                  Free
                </h3>
                <div className="mt-4 flex justify-center items-baseline">
                  <span className="text-4xl font-bold text-gray-900">$0</span>
                </div>
                <p className="mt-4 text-gray-600 text-center text-sm">
                  Get started with basic features
                </p>
                <ul className="mt-6 space-y-4">
                  <li className="flex items-center">
                    <svg
                      className="h-5 w-5 text-green-500"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="ml-3 text-sm text-gray-700">
                      Up to 10 leads
                    </span>
                  </li>
                  <li className="flex items-center">
                    <svg
                      className="h-5 w-5 text-green-500"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="ml-3 text-sm text-gray-700">
                      24/7 client response system
                    </span>
                  </li>
                  <li className="flex items-center">
                    <svg
                      className="h-5 w-5 text-green-500"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="ml-3 text-sm text-gray-700">
                      Autodetection for client calls/showings
                    </span>
                  </li>
                </ul>
              </div>
              <div className="px-6 py-6 bg-gray-50 text-center">
                <a
                  href="https://app.realnurture.ai"
                  className="w-full flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50"
                >
                  Get started
                </a>
              </div>
            </div>

            {/* Pro Tier */}
            <div className="rounded-lg shadow-lg overflow-hidden w-full border border-indigo-100 transform scale-105 z-10">
              <div className="bg-white px-6 py-8 border-t-4 border-indigo-500">
                <div className="absolute inset-x-0 -top-px flex justify-center">
                  <span className="inline-flex px-4 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-indigo-100 text-indigo-600">
                    Most Popular
                  </span>
                </div>
                <h3 className="text-center text-xl font-bold text-gray-900 mt-4">
                  Pro
                </h3>
                <div className="mt-4 flex justify-center items-baseline">
                  <span className="text-4xl font-bold text-gray-900">$49</span>
                  <span className="ml-1 text-lg text-gray-500">/month</span>
                </div>
                <p className="mt-4 text-gray-600 text-center text-sm">
                  Everything you need to grow your business
                </p>
                <ul className="mt-6 space-y-4">
                  <li className="flex items-center">
                    <svg
                      className="h-5 w-5 text-green-500"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="ml-3 text-sm text-gray-700">
                      Up to 1,000 leads
                    </span>
                  </li>
                  <li className="flex items-center">
                    <svg
                      className="h-5 w-5 text-green-500"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="ml-3 text-sm text-gray-700">
                      Access to MLS data for enhanced follow-ups
                    </span>
                  </li>
                  <li className="flex items-center">
                    <svg
                      className="h-5 w-5 text-green-500"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="ml-3 text-sm text-gray-700">
                      Market analysis follow
                    </span>
                  </li>
                  <li className="flex items-center">
                    <svg
                      className="h-5 w-5 text-green-500"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="ml-3 text-sm text-gray-700">
                      Bulk lead uploads
                    </span>
                  </li>
                </ul>
              </div>
              <div className="px-6 py-6 bg-gray-50 text-center">
                <a
                  href="https://app.realnurture.ai"
                  className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Start your free trial
                </a>
                <p className="mt-4 text-xs text-gray-500">
                  No credit card required for trial
                </p>
              </div>
            </div>

            {/* Unlimited Tier */}
            <div className="rounded-lg shadow-md overflow-hidden w-full border border-gray-100">
              <div className="bg-white px-6 py-8">
                <h3 className="text-center text-xl font-bold text-gray-900">
                  Unlimited
                </h3>
                <div className="mt-4 flex justify-center items-baseline">
                  <span className="text-4xl font-bold text-gray-900">$99</span>
                  <span className="ml-1 text-lg text-gray-500">/month</span>
                </div>
                <p className="mt-4 text-gray-600 text-center text-sm">
                  Premium features for power users
                </p>
                <ul className="mt-6 space-y-4">
                  <li className="flex items-center">
                    <svg
                      className="h-5 w-5 text-green-500"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="ml-3 text-sm text-gray-700">
                      Everything in Pro plan
                    </span>
                  </li>
                  <li className="flex items-center">
                    <svg
                      className="h-5 w-5 text-green-500"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="ml-3 text-sm text-gray-700">
                      Unlimited leads
                    </span>
                  </li>
                  <li className="flex items-center">
                    <svg
                      className="h-5 w-5 text-green-500"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="ml-3 text-sm text-gray-700">
                      Priority support
                    </span>
                  </li>
                </ul>
              </div>
              <div className="px-6 py-6 bg-gray-50 text-center">
                <a
                  href="https://app.realnurture.ai"
                  className="w-full flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50"
                >
                  Start your free trial
                </a>
                <p className="mt-4 text-xs text-gray-500">
                  No credit card required for trial
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-indigo-600 border-t border-indigo-700">
        <div className="max-w-4xl mx-auto text-center py-12 px-4 sm:py-16 sm:px-6">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Ready to transform your real estate business?
          </h2>
          <p className="mt-4 text-lg leading-6 text-indigo-200">
            Join thousands of successful agents who are saving time and closing
            more deals.
          </p>
          <a
            href="https://app.realnurture.ai"
            className="mt-8 inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50"
          >
            Try Now
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-shrink-0 flex items-center">
              <h2 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Real Nurture
              </h2>
            </div>
            <div className="mt-6 md:mt-0">
              <p className="text-center text-sm text-gray-500 md:text-right">
                &copy; {new Date().getFullYear()} Real Nurture. All rights
                reserved.
              </p>
            </div>
          </div>
          <div className="mt-6 flex justify-center md:justify-start space-x-6">
            <a href="#" className="text-sm text-gray-500 hover:text-gray-700">
              Privacy
            </a>
            <a href="#" className="text-sm text-gray-500 hover:text-gray-700">
              Terms
            </a>
            <a href="#" className="text-sm text-gray-500 hover:text-gray-700">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
