'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    getPlans,
    createSubscriptionOrder,
    createCreditOrder,
    verifyPayment,
    SubscriptionPlan,
    CreditPackage,
    PaymentOrder,
} from '@/lib/api';

declare global {
    interface Window {
        Razorpay: any;
    }
}

export default function PricingPage() {
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([]);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        // Load Razorpay script
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);

        // Fetch plans
        fetchPlans();

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    const fetchPlans = async () => {
        try {
            const response = await getPlans();
            if (response.success && response.data) {
                setPlans(response.data.subscriptions);
                setCreditPackages(response.data.creditPackages);
            }
        } catch (err) {
            setError('Failed to load pricing plans');
        } finally {
            setLoading(false);
        }
    };

    const openRazorpay = (order: PaymentOrder, type: 'subscription' | 'credits') => {
        const options = {
            key: order.keyId,
            amount: order.amount,
            currency: order.currency,
            name: 'Kalakar',
            description: type === 'subscription'
                ? `${order.planName} - ${order.billingCycle}`
                : `${order.packageName} - ${order.credits} credits`,
            order_id: order.orderId,
            handler: async function (response: any) {
                try {
                    const verifyResponse = await verifyPayment(
                        response.razorpay_order_id,
                        response.razorpay_payment_id,
                        response.razorpay_signature
                    );

                    if (verifyResponse.success) {
                        setSuccess(type === 'subscription'
                            ? 'Subscription activated successfully!'
                            : 'Credits added to your account!');
                        setTimeout(() => {
                            window.location.href = '/editor';
                        }, 2000);
                    } else {
                        setError('Payment verification failed');
                    }
                } catch (err) {
                    setError('Payment verification failed');
                }
                setProcessing(null);
            },
            prefill: {
                name: '',
                email: '',
            },
            theme: {
                color: '#8B5CF6',
            },
            modal: {
                ondismiss: function () {
                    setProcessing(null);
                },
            },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
    };

    const handleSubscribe = async (planId: string) => {
        if (planId === 'free') return;

        setProcessing(planId);
        setError(null);

        try {
            const response = await createSubscriptionOrder(planId, billingCycle);
            if (response.success && response.data) {
                openRazorpay(response.data.order, 'subscription');
            } else {
                setError(response.error || 'Failed to create order');
                setProcessing(null);
            }
        } catch (err) {
            setError('Failed to process subscription');
            setProcessing(null);
        }
    };

    const handleBuyCredits = async (packageId: string) => {
        setProcessing(packageId);
        setError(null);

        try {
            const response = await createCreditOrder(packageId);
            if (response.success && response.data) {
                openRazorpay(response.data.order, 'credits');
            } else {
                setError(response.error || 'Failed to create order');
                setProcessing(null);
            }
        } catch (err) {
            setError('Failed to process purchase');
            setProcessing(null);
        }
    };

    const formatCredits = (credits: number) => {
        const minutes = Math.floor(credits / 60);
        if (minutes >= 60) {
            const hours = Math.floor(minutes / 60);
            return `${hours} hour${hours > 1 ? 's' : ''}`;
        }
        return `${minutes} min`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
                <div className="spinner w-8 h-8" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-primary)]">
            {/* Header */}
            <header className="border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="text-xl font-bold gradient-text">
                        Kalakar
                    </Link>
                    <Link href="/editor" className="btn btn-secondary text-sm">
                        Go to Editor
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-4 py-12">
                {/* Hero */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
                    <p className="text-[var(--text-muted)] text-lg max-w-2xl mx-auto">
                        Choose a plan that works for you. All plans include our AI-powered transcription and caption styling.
                    </p>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="max-w-md mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-center">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="max-w-md mx-auto mb-8 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-center">
                        {success}
                    </div>
                )}

                {/* Billing Toggle */}
                <div className="flex items-center justify-center gap-4 mb-12">
                    <span className={billingCycle === 'monthly' ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>
                        Monthly
                    </span>
                    <button
                        onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                        className="relative w-14 h-7 bg-[var(--bg-tertiary)] rounded-full transition-colors"
                    >
                        <span
                            className={`absolute top-1 w-5 h-5 rounded-full bg-[var(--accent-primary)] transition-all ${
                                billingCycle === 'yearly' ? 'left-8' : 'left-1'
                            }`}
                        />
                    </button>
                    <span className={billingCycle === 'yearly' ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>
                        Yearly <span className="text-green-400 text-sm">(Save 15%)</span>
                    </span>
                </div>

                {/* Subscription Plans */}
                <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`p-6 rounded-2xl border ${
                                plan.id === 'creator'
                                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5'
                                    : 'border-[var(--border-primary)] bg-[var(--bg-secondary)]'
                            }`}
                        >
                            {plan.id === 'creator' && (
                                <div className="text-xs font-medium text-[var(--accent-primary)] mb-2">
                                    MOST POPULAR
                                </div>
                            )}
                            <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                            <p className="text-sm text-[var(--text-muted)] mb-4">{plan.description}</p>

                            <div className="mb-6">
                                <span className="text-3xl font-bold">
                                    ₹{billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly}
                                </span>
                                {plan.priceMonthly > 0 && (
                                    <span className="text-[var(--text-muted)]">
                                        /{billingCycle === 'yearly' ? 'year' : 'month'}
                                    </span>
                                )}
                            </div>

                            <div className="text-sm text-[var(--text-secondary)] mb-6">
                                {formatCredits(plan.credits)} of transcription
                                {billingCycle === 'monthly' && plan.priceMonthly > 0 && '/month'}
                            </div>

                            <button
                                onClick={() => handleSubscribe(plan.id)}
                                disabled={processing !== null || plan.id === 'free'}
                                className={`w-full py-3 rounded-lg font-medium transition-all ${
                                    plan.id === 'free'
                                        ? 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] cursor-default'
                                        : plan.id === 'creator'
                                        ? 'btn btn-primary'
                                        : 'btn btn-secondary'
                                }`}
                            >
                                {processing === plan.id ? (
                                    <div className="spinner w-5 h-5 mx-auto" />
                                ) : plan.id === 'free' ? (
                                    'Current Plan'
                                ) : (
                                    'Subscribe'
                                )}
                            </button>

                            <ul className="mt-6 space-y-3">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm">
                                        <svg className="w-5 h-5 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Credit Packages */}
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl font-bold text-center mb-2">Need More Credits?</h2>
                    <p className="text-[var(--text-muted)] text-center mb-8">
                        Top up your account with credit packages. No subscription required.
                    </p>

                    <div className="grid md:grid-cols-4 gap-4">
                        {creditPackages.map((pkg) => (
                            <div
                                key={pkg.id}
                                className={`p-5 rounded-xl border ${
                                    pkg.popular
                                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5'
                                        : 'border-[var(--border-primary)] bg-[var(--bg-secondary)]'
                                }`}
                            >
                                {pkg.popular && (
                                    <div className="text-xs font-medium text-[var(--accent-primary)] mb-2">
                                        BEST VALUE
                                    </div>
                                )}
                                <h3 className="font-semibold mb-1">{pkg.name}</h3>
                                <p className="text-sm text-[var(--text-muted)] mb-3">{pkg.description}</p>
                                <div className="text-2xl font-bold mb-4">₹{pkg.price}</div>

                                <button
                                    onClick={() => handleBuyCredits(pkg.id)}
                                    disabled={processing !== null}
                                    className="w-full btn btn-secondary text-sm"
                                >
                                    {processing === pkg.id ? (
                                        <div className="spinner w-4 h-4 mx-auto" />
                                    ) : (
                                        'Buy Now'
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* FAQ */}
                <div className="max-w-2xl mx-auto mt-16">
                    <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>

                    <div className="space-y-4">
                        <div className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
                            <h3 className="font-medium mb-2">What are credits?</h3>
                            <p className="text-sm text-[var(--text-muted)]">
                                1 credit = 1 second of video. So 600 credits = 10 minutes of transcription.
                                Credits are consumed when you transcribe videos.
                            </p>
                        </div>

                        <div className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
                            <h3 className="font-medium mb-2">Do credits expire?</h3>
                            <p className="text-sm text-[var(--text-muted)]">
                                Subscription credits reset monthly. One-time credit purchases never expire.
                            </p>
                        </div>

                        <div className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
                            <h3 className="font-medium mb-2">Can I cancel anytime?</h3>
                            <p className="text-sm text-[var(--text-muted)]">
                                Yes! Cancel your subscription anytime. You'll keep access until the end of your billing period.
                            </p>
                        </div>

                        <div className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
                            <h3 className="font-medium mb-2">What payment methods do you accept?</h3>
                            <p className="text-sm text-[var(--text-muted)]">
                                We accept UPI, credit/debit cards, net banking, and popular wallets through Razorpay.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
