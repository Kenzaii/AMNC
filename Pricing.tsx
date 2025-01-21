import React from 'react';
import { Card } from '@/components/ui/card';

const PricingSlide = () => {
  return (
    <div className="w-full space-y-8">
      <Card className="p-8 bg-gradient-to-r from-orange-50 to-orange-100">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Investment in Growth</h2>
          <p className="text-lg text-gray-600">Powerful AI Reception, Affordable Results</p>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Initial Setup */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold mb-4 text-orange-600">One-Time Setup</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <span>Regular Price</span>
                <span className="text-lg line-through text-gray-500">SGD 6,000</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold">Launch Offer</span>
                <span className="text-2xl font-bold text-orange-600">SGD 3,000</span>
              </div>
              <div className="space-y-2 mt-4">
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Voice Personality Setup</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Menu Integration</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>POS System Connection</span>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Plans */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold mb-4 text-orange-600">Monthly Subscription</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <span>Regular Price</span>
                <span className="text-lg line-through text-gray-500">SGD 1,400/month</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>Annual Plan</span>
                  <span className="text-2xl font-bold text-orange-600">SGD 700/month</span>
                </div>
                <span className="text-sm text-green-600">Save SGD 8,400 yearly</span>
              </div>
              <div className="flex justify-between items-center border-t pt-2">
                <span>Monthly Plan</span>
                <span className="text-xl">SGD 1,000/month</span>
              </div>
            </div>
          </div>
        </div>

        {/* Features & Value */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold mb-4 text-center">Everything You Need Included</h3>
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-bold text-orange-600">Core Features</h4>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>100 Phone Calls/Month</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>24/7 Availability</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Multi-language Support</span>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-orange-600">Data & Analytics</h4>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Real-time Dashboard</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Performance Reports</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Business Insights</span>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-orange-600">Support</h4>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Priority Support</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Monthly Reviews</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Regular Updates</span>
              </div>
            </div>
          </div>
        </div>

        {/* ROI Highlight */}
        <div className="mt-8 text-center bg-orange-50 p-4 rounded-lg">
          <p className="text-lg font-bold">Typical ROI: 3-4X Monthly Investment</p>
          <p className="text-sm text-gray-600">Based on reduced staffing costs and increased booking conversion</p>
        </div>
      </Card>
    </div>
  );
};

export default PricingSlide;