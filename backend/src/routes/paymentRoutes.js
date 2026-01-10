/**
 * Kalakar - Payment Routes
 *
 * API endpoints for payment processing with Razorpay
 */

import { Router } from 'express';
import {
    createSubscriptionOrder,
    createCreditOrder,
    processPayment,
    processWebhook,
    getPaymentHistory,
    getPlansAndPackages,
    isRazorpayConfigured,
    SUBSCRIPTION_PLANS,
    CREDIT_PACKAGES,
} from '../services/paymentService.js';
import { asyncHandler, Errors } from '../middleware/errorHandler.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * GET /api/payments/plans
 * Get all subscription plans and credit packages
 */
router.get(
    '/plans',
    asyncHandler(async (req, res) => {
        const plans = getPlansAndPackages();

        res.json({
            success: true,
            data: plans,
        });
    })
);

/**
 * GET /api/payments/status
 * Check if payment gateway is configured
 */
router.get(
    '/status',
    asyncHandler(async (req, res) => {
        res.json({
            success: true,
            data: {
                configured: isRazorpayConfigured(),
                gateway: 'razorpay',
            },
        });
    })
);

/**
 * POST /api/payments/subscribe
 * Create order for subscription purchase
 */
router.post(
    '/subscribe',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { planId, billingCycle = 'monthly' } = req.body;
        const userId = req.user.id;

        if (!planId) {
            throw Errors.badRequest('Plan ID is required');
        }

        if (!['monthly', 'yearly'].includes(billingCycle)) {
            throw Errors.badRequest('Invalid billing cycle');
        }

        if (!SUBSCRIPTION_PLANS[planId]) {
            throw Errors.badRequest('Invalid plan');
        }

        const order = await createSubscriptionOrder(userId, planId, billingCycle);

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            data: { order },
        });
    })
);

/**
 * POST /api/payments/credits
 * Create order for credit package purchase
 */
router.post(
    '/credits',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { packageId } = req.body;
        const userId = req.user.id;

        if (!packageId) {
            throw Errors.badRequest('Package ID is required');
        }

        if (!CREDIT_PACKAGES[packageId]) {
            throw Errors.badRequest('Invalid credit package');
        }

        const order = await createCreditOrder(userId, packageId);

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            data: { order },
        });
    })
);

/**
 * POST /api/payments/verify
 * Verify payment and activate subscription/credits
 */
router.post(
    '/verify',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            throw Errors.badRequest('Missing payment verification details');
        }

        const result = await processPayment(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        );

        res.json({
            success: true,
            message: result.message,
            data: result,
        });
    })
);

/**
 * POST /api/payments/webhook
 * Handle Razorpay webhooks
 */
router.post(
    '/webhook',
    asyncHandler(async (req, res) => {
        const signature = req.headers['x-razorpay-signature'];

        if (!signature) {
            throw Errors.badRequest('Missing webhook signature');
        }

        const result = await processWebhook(req.body, signature);

        res.json({
            success: true,
            data: result,
        });
    })
);

/**
 * GET /api/payments/history
 * Get user's payment history
 */
router.get(
    '/history',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 20;

        const history = await getPaymentHistory(userId, limit);

        res.json({
            success: true,
            data: { payments: history },
        });
    })
);

/**
 * GET /api/payments/subscription
 * Get current user's subscription status
 */
router.get(
    '/subscription',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const user = req.user;

        const plan = SUBSCRIPTION_PLANS[user.subscriptionTier] || SUBSCRIPTION_PLANS.free;
        const isExpired = user.subscriptionExpiresAt
            ? new Date(user.subscriptionExpiresAt) < new Date()
            : false;

        res.json({
            success: true,
            data: {
                currentPlan: user.subscriptionTier,
                planDetails: plan,
                expiresAt: user.subscriptionExpiresAt,
                isExpired,
                creditsRemaining: user.creditsRemaining,
            },
        });
    })
);

export default router;
