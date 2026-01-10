/**
 * Kalakar - Payment Service (Razorpay)
 *
 * Handles payment processing with Razorpay:
 * - Create orders for subscriptions and credits
 * - Verify payment signatures
 * - Process webhooks
 * - Update user subscriptions
 */

import Razorpay from 'razorpay';
import crypto from 'crypto';
import config from '../config/index.js';
import { supabase } from '../database/supabase.js';
import logger from '../utils/logger.js';
import { ApiError } from '../middleware/errorHandler.js';

// Initialize Razorpay
let razorpay = null;

function getRazorpay() {
    if (!razorpay && config.razorpay.keyId && config.razorpay.keySecret) {
        razorpay = new Razorpay({
            key_id: config.razorpay.keyId,
            key_secret: config.razorpay.keySecret,
        });
    }
    return razorpay;
}

/**
 * Subscription Plans
 */
export const SUBSCRIPTION_PLANS = {
    free: {
        id: 'free',
        name: 'Free',
        description: 'Get started with basic features',
        priceMonthly: 0,
        priceYearly: 0,
        credits: 600, // 10 minutes
        features: [
            '10 minutes of transcription',
            'Basic caption styles',
            'MP4 export',
            'Standard quality',
        ],
    },
    creator: {
        id: 'creator',
        name: 'Creator',
        description: 'Perfect for growing creators',
        priceMonthly: 499, // INR
        priceYearly: 4999,
        credits: 18000, // 5 hours
        features: [
            '5 hours of transcription/month',
            'All caption styles',
            'All export formats',
            'HD quality export',
            'Priority support',
            'No watermark',
        ],
    },
    business: {
        id: 'business',
        name: 'Business',
        description: 'For teams and agencies',
        priceMonthly: 1999, // INR
        priceYearly: 19999,
        credits: 72000, // 20 hours
        features: [
            '20 hours of transcription/month',
            'All creator features',
            '4K quality export',
            'Multi-speaker detection',
            'Team collaboration',
            'API access',
            'Dedicated support',
        ],
    },
};

/**
 * Credit Packages (one-time purchase)
 */
export const CREDIT_PACKAGES = {
    starter: {
        id: 'starter',
        name: 'Starter Pack',
        credits: 3000, // 50 minutes
        price: 199, // INR
        description: '50 minutes of transcription',
    },
    standard: {
        id: 'standard',
        name: 'Standard Pack',
        credits: 9000, // 2.5 hours
        price: 499, // INR
        description: '2.5 hours of transcription',
        popular: true,
    },
    pro: {
        id: 'pro',
        name: 'Pro Pack',
        credits: 21600, // 6 hours
        price: 999, // INR
        description: '6 hours of transcription',
    },
    enterprise: {
        id: 'enterprise',
        name: 'Enterprise Pack',
        credits: 54000, // 15 hours
        price: 1999, // INR
        description: '15 hours of transcription',
    },
};

/**
 * Check if Razorpay is configured
 */
export function isRazorpayConfigured() {
    return !!(config.razorpay.keyId && config.razorpay.keySecret);
}

/**
 * Create a Razorpay order for subscription
 */
export async function createSubscriptionOrder(userId, planId, billingCycle = 'monthly') {
    const rz = getRazorpay();
    if (!rz) {
        throw new ApiError(503, 'Payment gateway not configured');
    }

    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan || planId === 'free') {
        throw new ApiError(400, 'Invalid subscription plan');
    }

    const amount = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
    const amountInPaise = amount * 100;

    try {
        const order = await rz.orders.create({
            amount: amountInPaise,
            currency: 'INR',
            receipt: `sub_${userId}_${planId}_${Date.now()}`,
            notes: {
                userId,
                planId,
                billingCycle,
                type: 'subscription',
            },
        });

        // Store order in database
        await supabase.from('payment_orders').insert({
            id: order.id,
            user_id: userId,
            type: 'subscription',
            plan_id: planId,
            billing_cycle: billingCycle,
            amount: amount,
            currency: 'INR',
            status: 'created',
            razorpay_order_id: order.id,
        });

        logger.info('Subscription order created', {
            userId,
            planId,
            orderId: order.id,
            amount,
        });

        return {
            orderId: order.id,
            amount: amountInPaise,
            currency: 'INR',
            keyId: config.razorpay.keyId,
            planName: plan.name,
            billingCycle,
        };
    } catch (error) {
        logger.error('Failed to create subscription order', {
            userId,
            planId,
            error: error.message,
        });
        throw new ApiError(500, 'Failed to create payment order');
    }
}

/**
 * Create a Razorpay order for credit purchase
 */
export async function createCreditOrder(userId, packageId) {
    const rz = getRazorpay();
    if (!rz) {
        throw new ApiError(503, 'Payment gateway not configured');
    }

    const creditPackage = CREDIT_PACKAGES[packageId];
    if (!creditPackage) {
        throw new ApiError(400, 'Invalid credit package');
    }

    const amountInPaise = creditPackage.price * 100;

    try {
        const order = await rz.orders.create({
            amount: amountInPaise,
            currency: 'INR',
            receipt: `cred_${userId}_${packageId}_${Date.now()}`,
            notes: {
                userId,
                packageId,
                credits: creditPackage.credits,
                type: 'credits',
            },
        });

        // Store order in database
        await supabase.from('payment_orders').insert({
            id: order.id,
            user_id: userId,
            type: 'credits',
            package_id: packageId,
            credits: creditPackage.credits,
            amount: creditPackage.price,
            currency: 'INR',
            status: 'created',
            razorpay_order_id: order.id,
        });

        logger.info('Credit order created', {
            userId,
            packageId,
            orderId: order.id,
            credits: creditPackage.credits,
        });

        return {
            orderId: order.id,
            amount: amountInPaise,
            currency: 'INR',
            keyId: config.razorpay.keyId,
            packageName: creditPackage.name,
            credits: creditPackage.credits,
        };
    } catch (error) {
        logger.error('Failed to create credit order', {
            userId,
            packageId,
            error: error.message,
        });
        throw new ApiError(500, 'Failed to create payment order');
    }
}

/**
 * Verify Razorpay payment signature
 */
export function verifyPaymentSignature(orderId, paymentId, signature) {
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
        .createHmac('sha256', config.razorpay.keySecret)
        .update(body)
        .digest('hex');

    return expectedSignature === signature;
}

/**
 * Process successful payment
 */
export async function processPayment(orderId, paymentId, signature) {
    // Verify signature
    if (!verifyPaymentSignature(orderId, paymentId, signature)) {
        logger.warn('Invalid payment signature', { orderId, paymentId });
        throw new ApiError(400, 'Invalid payment signature');
    }

    // Get order from database
    const { data: order, error: orderError } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('razorpay_order_id', orderId)
        .single();

    if (orderError || !order) {
        throw new ApiError(404, 'Order not found');
    }

    if (order.status === 'completed') {
        logger.warn('Order already processed', { orderId });
        return { success: true, message: 'Payment already processed' };
    }

    try {
        // Update order status
        await supabase
            .from('payment_orders')
            .update({
                status: 'completed',
                razorpay_payment_id: paymentId,
                razorpay_signature: signature,
                completed_at: new Date().toISOString(),
            })
            .eq('razorpay_order_id', orderId);

        // Process based on order type
        if (order.type === 'subscription') {
            await activateSubscription(order.user_id, order.plan_id, order.billing_cycle);
        } else if (order.type === 'credits') {
            await addCredits(order.user_id, order.credits);
        }

        logger.info('Payment processed successfully', {
            orderId,
            paymentId,
            userId: order.user_id,
            type: order.type,
        });

        return {
            success: true,
            message: 'Payment processed successfully',
            type: order.type,
            userId: order.user_id,
        };
    } catch (error) {
        logger.error('Failed to process payment', {
            orderId,
            paymentId,
            error: error.message,
        });
        throw new ApiError(500, 'Failed to process payment');
    }
}

/**
 * Activate subscription for user
 */
async function activateSubscription(userId, planId, billingCycle) {
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) {
        throw new Error('Invalid plan');
    }

    const expiresAt = new Date();
    if (billingCycle === 'yearly') {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    const { error } = await supabase
        .from('users')
        .update({
            subscription_tier: planId,
            subscription_expires_at: expiresAt.toISOString(),
            credits_remaining: plan.credits,
        })
        .eq('id', userId);

    if (error) {
        throw new Error('Failed to activate subscription');
    }

    logger.info('Subscription activated', {
        userId,
        planId,
        expiresAt,
        credits: plan.credits,
    });
}

/**
 * Add credits to user account
 */
async function addCredits(userId, credits) {
    const { data, error } = await supabase.rpc('add_user_credits', {
        user_uuid: userId,
        credits_to_add: credits,
    });

    if (error) {
        // Fallback to direct update if RPC doesn't exist
        const { data: user } = await supabase
            .from('users')
            .select('credits_remaining')
            .eq('id', userId)
            .single();

        if (user) {
            await supabase
                .from('users')
                .update({
                    credits_remaining: (user.credits_remaining || 0) + credits,
                })
                .eq('id', userId);
        }
    }

    logger.info('Credits added', { userId, credits });
}

/**
 * Process Razorpay webhook
 */
export async function processWebhook(body, signature) {
    // Verify webhook signature
    const expectedSignature = crypto
        .createHmac('sha256', config.razorpay.webhookSecret)
        .update(JSON.stringify(body))
        .digest('hex');

    if (expectedSignature !== signature) {
        logger.warn('Invalid webhook signature');
        throw new ApiError(400, 'Invalid webhook signature');
    }

    const event = body.event;
    const payload = body.payload;

    logger.info('Webhook received', { event });

    switch (event) {
        case 'payment.captured':
            await handlePaymentCaptured(payload.payment.entity);
            break;
        case 'payment.failed':
            await handlePaymentFailed(payload.payment.entity);
            break;
        case 'order.paid':
            await handleOrderPaid(payload.order.entity);
            break;
        default:
            logger.info('Unhandled webhook event', { event });
    }

    return { received: true };
}

async function handlePaymentCaptured(payment) {
    const orderId = payment.order_id;
    const paymentId = payment.id;

    logger.info('Payment captured via webhook', { orderId, paymentId });

    // Update order status
    await supabase
        .from('payment_orders')
        .update({
            status: 'captured',
            razorpay_payment_id: paymentId,
        })
        .eq('razorpay_order_id', orderId);
}

async function handlePaymentFailed(payment) {
    const orderId = payment.order_id;

    logger.warn('Payment failed via webhook', {
        orderId,
        reason: payment.error_description,
    });

    await supabase
        .from('payment_orders')
        .update({
            status: 'failed',
            error: payment.error_description,
        })
        .eq('razorpay_order_id', orderId);
}

async function handleOrderPaid(order) {
    logger.info('Order paid via webhook', { orderId: order.id });
}

/**
 * Get user's payment history
 */
export async function getPaymentHistory(userId, limit = 20) {
    const { data, error } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        throw new ApiError(500, 'Failed to fetch payment history');
    }

    return data || [];
}

/**
 * Get all plans and packages
 */
export function getPlansAndPackages() {
    return {
        subscriptions: Object.values(SUBSCRIPTION_PLANS),
        creditPackages: Object.values(CREDIT_PACKAGES),
        currency: 'INR',
        razorpayKeyId: config.razorpay.keyId,
    };
}
