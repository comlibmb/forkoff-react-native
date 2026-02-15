import { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { alert } from '@/components/ui/AlertModal';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Check, Zap, Star, ArrowRight, Settings, Crown, Calendar } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { useAuthStore } from '@/stores/auth.store';
import { useUsageStore } from '@/stores/usage.store';
import { useTheme } from '@/theme/ThemeProvider';
import { colors } from '@/theme/colors';
import { subscriptionService } from '@/services/subscription.service';

type PlanId = string;

interface DisplayPlan {
  id: string;
  name: string;
  price: string;
  originalPrice?: string;
  period: string;
  icon: any;
  color: string;
  popular?: boolean;
  badge?: string;
  features: string[];
  limitations: string[];
  stripePriceId?: string;
}

export default function SubscriptionScreen() {
  const { theme } = useTheme();
  // Use specific selector to ensure component re-renders when subscription changes
  const user = useAuthStore((state) => state.user);
  const initialize = useAuthStore((state) => state.initialize);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('free');
  const [isLoading, setIsLoading] = useState(false);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const currentTier = (user?.subscription || 'free') as string;
  const isPro = currentTier === 'pro';
  const renewalDate = user?.stripeCurrentPeriodEnd ? new Date(user.stripeCurrentPeriodEnd) : null;

  const serverLimits = useUsageStore((state) => state.serverLimits);
  const freeLimits = useMemo(() => {
    if (serverLimits) {
      const f = serverLimits.free;
      const map = (v: number) => (v === -1 ? Infinity : v);
      return { messagesPerDay: map(f.messagesPerDay), maxDevices: map(f.maxDevices) };
    }
    return { messagesPerDay: 10, maxDevices: 1 };
  }, [serverLimits]);

  // Default hardcoded plans (used as fallback)
  const defaultPlans = useMemo((): DisplayPlan[] => [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: 'forever',
      icon: Star,
      color: theme.textTertiary,
      features: [
        `${freeLimits.maxDevices} connected device${freeLimits.maxDevices !== 1 ? 's' : ''}`,
        'Basic chat with AI tools',
        'View code changes',
        'Community support',
      ],
      limitations: [
        `Limited to ${freeLimits.messagesPerDay} messages/day`,
        'No priority support',
      ],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$9.99',
      period: 'per month',
      icon: Zap,
      color: theme.primary,
      popular: true,
      features: [
        'Unlimited connected devices',
        'Unlimited AI chat',
        'Code diff viewer',
        'Terminal access',
        'Push notifications',
        'Priority support',
      ],
      limitations: [],
    },
  ], [theme, freeLimits]);

  const [plans, setPlans] = useState<DisplayPlan[]>(defaultPlans);

  // Fetch server-driven plans
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const serverPlans = await subscriptionService.getPlansAsync();
        if (cancelled) return;

        const mapped = serverPlans.map((sp): DisplayPlan => {
          const isFree = sp.tier === 'free';
          return {
            id: sp.id,
            name: sp.name,
            price: isFree ? '$0' : `$${sp.price.toFixed(2)}`,
            originalPrice: sp.originalPrice ? `$${sp.originalPrice.toFixed(2)}` : undefined,
            period: isFree ? 'forever' : `per ${sp.interval}`,
            icon: isFree ? Star : Zap,
            color: isFree ? theme.textTertiary : theme.primary,
            popular: sp.popular,
            badge: sp.badge,
            features: sp.features
              .filter((f) => f.included)
              .map((f) => f.name),
            limitations: sp.features
              .filter((f) => !f.included)
              .map((f) => f.name),
            stripePriceId: sp.stripePriceId,
          };
        });
        setPlans(mapped);

        // Set selected plan to user's current plan (matched by stripePriceId)
        if (isPro && user?.stripePriceId) {
          const match = mapped.find((p) => p.stripePriceId === user.stripePriceId);
          if (match) setSelectedPlan(match.id);
        }
      } catch {
        // Keep default plans
      }
    })();

    return () => { cancelled = true; };
  }, [theme, freeLimits]);

  const handleSubscribe = async (planId: string) => {
    if (planId === 'free') return;

    setIsLoading(true);
    try {
      const selectedDisplayPlan = plans.find((p) => p.id === planId);
      const result = selectedDisplayPlan?.stripePriceId
        ? await subscriptionService.createCheckoutSession(selectedDisplayPlan.stripePriceId)
        : await subscriptionService.purchaseSubscription(planId);
      if (result.success && result.url) {
        // Open checkout in browser
        await WebBrowser.openBrowserAsync(result.url, {
          dismissButtonStyle: 'close',
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        });

        // Always refresh after browser closes (user may have completed checkout)
        setIsLoading(true);
        await initialize();

        // Check if subscription was updated and show feedback
        const updatedUser = useAuthStore.getState().user;
        if (updatedUser?.subscription !== 'free' && updatedUser?.subscription !== currentTier) {
          // Update selected plan to match new subscription
          setSelectedPlan(planId);
          await alert.success('Welcome to Pro!', 'Your subscription is now active');
        }
      } else if (result.error) {
        await alert.error('Error', result.error);
      }
    } catch (error: any) {
      await alert.error('Error', error.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsLoading(true);
    try {
      const result = await subscriptionService.createPortalSession();
      if (result.success && result.url) {
        const browserResult = await WebBrowser.openBrowserAsync(result.url, {
          dismissButtonStyle: 'close',
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        });

        // Always refresh when browser closes
        if (browserResult.type === 'cancel' || browserResult.type === 'dismiss') {
          // Force refresh user data and trigger re-render
          await initialize();

          // Force component to re-read from store
          const updatedUser = useAuthStore.getState().user;
          if (updatedUser?.subscription !== currentTier) {
            await alert.success('Subscription Updated', 'Your subscription has been updated');
          }
        }
      } else if (result.error) {
        await alert.error('Error', result.error);
      }
    } catch (error: any) {
      await alert.error('Error', error.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  function PlanCard({ children, popular = false, color = theme.cardBorder }: {
    children: React.ReactNode;
    popular?: boolean;
    color?: string;
  }) {
    return (
      <View style={[styles.section, popular && { borderColor: color, borderWidth: 2 }]}>
        <View style={styles.sectionContent}>{children}</View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={theme.textSecondary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageTitle}>{isPro ? 'Your Subscription' : 'Choose Your Plan'}</Text>
        <Text style={styles.pageSubtitle}>
          {isPro ? 'Manage your Pro subscription' : 'Unlock more features with a premium subscription'}
        </Text>

        {/* Active Subscription Status */}
        {isPro && (
          <View style={[styles.section, { borderColor: theme.primary, borderWidth: 2, marginBottom: 20 }]}>
            <View style={styles.sectionContent}>
              <View style={styles.statusHeader}>
                <View style={[styles.planIcon, { backgroundColor: theme.primary + '20' }]}>
                  <Crown size={24} color={theme.primary} />
                </View>
                <View style={styles.statusInfo}>
                  <View style={styles.planNameRow}>
                    <Text style={styles.planName}>
                      {plans.find((p) => p.stripePriceId === user?.stripePriceId)?.name || 'Pro Plan'}
                    </Text>
                    <View style={[styles.currentBadge, { backgroundColor: theme.success + '20' }]}>
                      <Text style={[styles.currentBadgeText, { color: theme.success }]}>Active</Text>
                    </View>
                  </View>
                  <Text style={styles.statusPrice}>
                    {(() => {
                      const activePlan = plans.find((p) => p.stripePriceId === user?.stripePriceId);
                      return activePlan
                        ? `${activePlan.price} / ${activePlan.period.replace('per ', '')}`
                        : '$9.99 / month';
                    })()}
                  </Text>
                </View>
              </View>

              {renewalDate && (
                <View style={styles.renewalInfo}>
                  <Calendar size={16} color={theme.textSecondary} />
                  <Text style={styles.renewalText}>
                    Renews on {renewalDate.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                onPress={handleManageSubscription}
                disabled={isLoading}
                style={[styles.manageButtonInline, isLoading && styles.subscribeButtonDisabled]}
              >
                <Settings size={16} color="#fff" />
                <Text style={styles.manageButtonInlineText}>Manage Subscription</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Plans */}
        {plans.map((plan) => {
          const Icon = plan.icon;
          // Match current plan: free users match 'free', pro users match by stripePriceId.
          // If pro user has no stripePriceId (voucher/lifetime), match the first pro plan.
          const isCurrentPlan = plan.id === 'free'
            ? currentTier === 'free'
            : isPro && (
                user?.stripePriceId
                  ? plan.stripePriceId === user.stripePriceId
                  : plan === plans.find((p) => p.id !== 'free')
              );
          const isSelected = plan.id === selectedPlan;

          return (
            <TouchableOpacity
              key={plan.id}
              onPress={() => setSelectedPlan(plan.id as PlanId)}
              activeOpacity={0.7}
            >
              <PlanCard popular={plan.popular || !!plan.badge} color={plan.color}>
                {(plan.badge || plan.popular) && (
                  <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
                    <Text style={styles.popularBadgeText}>{plan.badge || 'POPULAR'}</Text>
                  </View>
                )}
                <View style={styles.planHeader}>
                  <View style={[styles.planIcon, { backgroundColor: plan.color + '20' }]}>
                    <Icon size={24} color={plan.color} />
                  </View>
                  <View style={styles.planInfo}>
                    <View style={styles.planNameRow}>
                      <Text style={styles.planName}>{plan.name}</Text>
                      {isCurrentPlan && (
                        <View style={styles.currentBadge}>
                          <Text style={styles.currentBadgeText}>Current</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.planPricing}>
                      {plan.originalPrice && (
                        <Text style={styles.strikethroughPrice}>{plan.originalPrice} </Text>
                      )}
                      <Text style={styles.planPrice}>{plan.price}</Text> {plan.period}
                    </Text>
                  </View>

                  {isSelected && (
                    <View style={[styles.selectedCheck, { backgroundColor: plan.color }]}>
                      <Check size={14} color="#fff" />
                    </View>
                  )}
                </View>

                {/* Features */}
                <View style={styles.featuresList}>
                  {plan.features.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                      <Check size={16} color={theme.success} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}

                  {plan.limitations.map((limitation, index) => (
                    <View key={index} style={styles.featureRow}>
                      <View style={styles.limitationDot} />
                      <Text style={styles.limitationText}>{limitation}</Text>
                    </View>
                  ))}
                </View>
              </PlanCard>
            </TouchableOpacity>
          );
        })}

        {/* Subscribe Button - only show for free users */}
        {!isPro && (
          <TouchableOpacity
            onPress={() => handleSubscribe(selectedPlan)}
            disabled={selectedPlan === 'free' || isLoading}
            style={[
              styles.subscribeButton,
              (selectedPlan === 'free' || isLoading) && styles.subscribeButtonDisabled,
            ]}
          >
            <Text style={styles.subscribeButtonText}>
              {isLoading
                ? 'Processing...'
                : selectedPlan === 'free'
                ? 'Current Plan'
                : `Upgrade to ${plans.find((p) => p.id === selectedPlan)?.name || 'Pro'}`}
            </Text>
            {!isLoading && selectedPlan !== 'free' && <ArrowRight size={18} color="#fff" />}
          </TouchableOpacity>
        )}

        <Text style={styles.disclaimer}>Cancel anytime. No hidden fees.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.backgroundTertiary,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: theme.textSecondary,
    marginLeft: 8,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: theme.textTertiary,
    marginBottom: 20,
  },
  section: {
    backgroundColor: theme.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    overflow: 'hidden',
    marginBottom: 16,
  },
  popularBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 12,
  },
  popularBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  sectionContent: {
    padding: 16,
  },
  // Plan
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  planIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  planInfo: {
    flex: 1,
  },
  planNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planName: {
    color: theme.text,
    fontSize: 20,
    fontWeight: '700',
  },
  currentBadge: {
    backgroundColor: theme.success + '20',
    borderWidth: 1,
    borderColor: theme.success + '30',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentBadgeText: {
    color: theme.success,
    fontSize: 11,
    fontWeight: '700',
  },
  planPricing: {
    color: theme.textTertiary,
    fontSize: 14,
    marginTop: 2,
  },
  planPrice: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '700',
  },
  strikethroughPrice: {
    color: theme.textTertiary,
    fontSize: 14,
    textDecorationLine: 'line-through' as const,
  },
  selectedCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Features
  featuresList: {
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    color: theme.textSecondary,
    fontSize: 14,
  },
  limitationDot: {
    width: 4,
    height: 4,
    backgroundColor: theme.textTertiary,
    borderRadius: 2,
    marginLeft: 6,
  },
  limitationText: {
    color: theme.textTertiary,
    fontSize: 14,
  },
  // Subscribe button
  subscribeButton: {
    backgroundColor: theme.primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  subscribeButtonDisabled: {
    opacity: 0.5,
  },
  subscribeButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  manageButton: {
    borderWidth: 1,
    borderColor: theme.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    marginTop: 12,
  },
  manageButtonText: {
    color: theme.primary,
    fontWeight: '600' as const,
    fontSize: 15,
  },
  disclaimer: {
    color: theme.textTertiary,
    textAlign: 'center' as const,
    fontSize: 12,
    marginTop: 16,
  },
  // Subscription status
  statusHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusPrice: {
    color: theme.textTertiary,
    fontSize: 14,
    marginTop: 2,
  },
  renewalInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 8,
    marginBottom: 12,
  },
  renewalText: {
    color: theme.textSecondary,
    fontSize: 14,
  },
  manageButtonInline: {
    backgroundColor: theme.primary,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
  },
  manageButtonInlineText: {
    color: '#fff',
    fontWeight: '600' as const,
    fontSize: 15,
  },
});
