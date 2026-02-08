import { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { alert } from '@/components/ui/AlertModal';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Check, Zap, Star, Users, ArrowRight, Settings } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { useAuthStore } from '@/stores/auth.store';
import { useTheme } from '@/theme/ThemeProvider';
import { colors } from '@/theme/colors';
import { subscriptionService } from '@/services/subscription.service';

type PlanId = 'free' | 'pro' | 'team';

export default function SubscriptionScreen() {
  const { theme } = useTheme();
  const { user, initialize } = useAuthStore();
  const { checkout } = useLocalSearchParams<{ checkout?: string }>();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>((user?.subscription as PlanId) || 'free');
  const [isLoading, setIsLoading] = useState(false);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const currentPlan = user?.subscription || 'free';

  // Handle checkout return from Stripe
  useEffect(() => {
    if (checkout === 'success') {
      initialize().then(() => {
        alert.success('Subscription Updated', 'Your subscription has been activated!');
      });
    }
  }, [checkout]);

  const plans = useMemo(() => [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: 'forever',
      icon: Star,
      color: theme.textTertiary,
      features: [
        '1 connected device',
        'Basic chat with AI tools',
        'View code changes',
        'Community support',
      ],
      limitations: [
        'Limited to 100 messages/day',
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
        '5 connected devices',
        'Unlimited AI chat',
        'Code diff viewer',
        'Terminal access',
        'Push notifications',
        'Priority support',
      ],
      limitations: [],
    },
    {
      id: 'team',
      name: 'Team',
      price: '$29.99',
      period: 'per month',
      icon: Users,
      color: theme.warning,
      features: [
        'Unlimited devices',
        'Everything in Pro',
        'Team collaboration',
        'Shared projects',
        'Admin dashboard',
        'SSO support',
        'Dedicated support',
      ],
      limitations: [],
    },
  ], [theme]);

  const handleSubscribe = async (planId: string) => {
    if (planId === currentPlan) return;

    setIsLoading(true);
    try {
      const result = await subscriptionService.purchaseSubscription(`${planId}_monthly`);
      if (result.success && result.url) {
        await WebBrowser.openBrowserAsync(result.url);
        // Refresh user data after returning from browser
        await initialize();
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
        await WebBrowser.openBrowserAsync(result.url);
        // Refresh user data after returning from portal
        await initialize();
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
        <Text style={styles.pageTitle}>Choose Your Plan</Text>
        <Text style={styles.pageSubtitle}>Unlock more features with a premium subscription</Text>

        {/* Plans */}
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrentPlan = plan.id === currentPlan;
          const isSelected = plan.id === selectedPlan;

          return (
            <TouchableOpacity
              key={plan.id}
              onPress={() => setSelectedPlan(plan.id as PlanId)}
              activeOpacity={0.7}
            >
              <PlanCard popular={plan.popular} color={plan.color}>
                {plan.popular && (
                  <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
                    <Text style={styles.popularBadgeText}>POPULAR</Text>
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

        {/* Subscribe Button */}
        <TouchableOpacity
          onPress={() => handleSubscribe(selectedPlan)}
          disabled={selectedPlan === currentPlan || isLoading}
          style={[
            styles.subscribeButton,
            (selectedPlan === currentPlan || isLoading) && styles.subscribeButtonDisabled,
          ]}
        >
          <Text style={styles.subscribeButtonText}>
            {isLoading
              ? 'Processing...'
              : selectedPlan === currentPlan
              ? 'Current Plan'
              : `Upgrade to ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}`}
          </Text>
          {!isLoading && selectedPlan !== currentPlan && <ArrowRight size={18} color="#fff" />}
        </TouchableOpacity>

        {/* Manage Subscription Button */}
        {currentPlan !== 'free' && (
          <TouchableOpacity
            onPress={handleManageSubscription}
            disabled={isLoading}
            style={[styles.manageButton, isLoading && styles.subscribeButtonDisabled]}
          >
            <Settings size={18} color={theme.primary} />
            <Text style={styles.manageButtonText}>Manage Subscription</Text>
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
});
