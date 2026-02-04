import { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Users,
  UserPlus,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useReferralStore } from '@/stores/referral.store';
import { ReferralCard } from '@/components/referral';
import { alert } from '@/components/ui/AlertModal';

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function ReferralsScreen() {
  const { theme } = useTheme();

  const {
    referralCode,
    shareUrl,
    stats,
    referrals,
    isLoading,
    isClaiming,
    fetchStats,
    fetchReferrals,
    claimReward,
  } = useReferralStore();

  const [refreshing, setRefreshing] = useState(false);

  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    fetchStats();
    fetchReferrals();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchReferrals()]);
    setRefreshing(false);
  };

  const handleClaimReward = async () => {
    const result = await claimReward();

    if (result.success) {
      await alert.success(
        'Reward Claimed!',
        result.message
      );
    } else {
      await alert.error(
        'Claim Failed',
        result.message
      );
    }
  };

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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={styles.pageTitle}>Refer Friends</Text>
        <Text style={styles.pageSubtitle}>
          Earn free PRO months by inviting friends to ForkOff
        </Text>

        {/* Main referral card */}
        {referralCode && shareUrl && stats && (
          <ReferralCard
            referralCode={referralCode}
            shareUrl={shareUrl}
            stats={stats}
            onClaimReward={handleClaimReward}
            isClaiming={isClaiming}
          />
        )}

        {/* How it works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.stepsContainer}>
            {[
              {
                icon: Users,
                title: 'Share Your Code',
                description: 'Send your unique referral code to friends',
              },
              {
                icon: UserPlus,
                title: 'Friends Sign Up',
                description: 'They create a ForkOff account with your code',
              },
              {
                icon: CheckCircle,
                title: 'They Subscribe',
                description: 'When they upgrade to PRO, you both win',
              },
            ].map((step, index) => (
              <View key={index} style={styles.step}>
                <View
                  style={[
                    styles.stepIcon,
                    { backgroundColor: theme.primary + '20' },
                  ]}
                >
                  <step.icon size={24} color={theme.primary} />
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
                {index < 2 && <View style={styles.stepConnector} />}
              </View>
            ))}
          </View>
        </View>

        {/* Recent referrals */}
        {referrals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Referrals</Text>
            <View style={styles.referralsList}>
              {referrals.map((referral) => (
                <View key={referral.id} style={styles.referralItem}>
                  <View style={styles.referralIcon}>
                    {referral.isConverted ? (
                      <CheckCircle size={20} color={theme.success} />
                    ) : (
                      <Clock size={20} color={theme.textTertiary} />
                    )}
                  </View>
                  <View style={styles.referralInfo}>
                    <Text style={styles.referralEmail}>
                      {referral.referredUserEmail || 'Anonymous'}
                    </Text>
                    <Text style={styles.referralDate}>
                      Signed up {formatDate(referral.signedUpAt)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.referralStatus,
                      {
                        backgroundColor: referral.isConverted
                          ? theme.success + '20'
                          : theme.backgroundTertiary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.referralStatusText,
                        {
                          color: referral.isConverted
                            ? theme.success
                            : theme.textTertiary,
                        },
                      ]}
                    >
                      {referral.isConverted ? 'Converted' : 'Pending'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Empty state */}
        {referrals.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <UserPlus size={48} color={theme.textTertiary} />
            <Text style={styles.emptyText}>No referrals yet</Text>
            <Text style={styles.emptyHint}>
              Share your code to start earning rewards
            </Text>
          </View>
        )}

        {/* Terms */}
        <View style={styles.termsContainer}>
          <AlertCircle size={16} color={theme.textTertiary} />
          <Text style={styles.termsText}>
            Rewards are granted when referred users subscribe to PRO. You earn 1 free month for every 3 conversions.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
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
      padding: 16,
      marginTop: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 16,
    },
    stepsContainer: {
      gap: 16,
    },
    step: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    stepIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    stepContent: {
      flex: 1,
    },
    stepTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    stepDescription: {
      fontSize: 14,
      color: theme.textTertiary,
      marginTop: 2,
    },
    stepConnector: {
      position: 'absolute',
      left: 23,
      top: 48,
      width: 2,
      height: 16,
      backgroundColor: theme.primary + '30',
    },
    referralsList: {
      gap: 12,
    },
    referralItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 10,
      padding: 12,
    },
    referralIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: theme.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    referralInfo: {
      flex: 1,
    },
    referralEmail: {
      fontSize: 15,
      fontWeight: '500',
      color: theme.text,
    },
    referralDate: {
      fontSize: 13,
      color: theme.textTertiary,
      marginTop: 2,
    },
    referralStatus: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    referralStatusText: {
      fontSize: 12,
      fontWeight: '600',
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 48,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.textSecondary,
      marginTop: 16,
    },
    emptyHint: {
      fontSize: 14,
      color: theme.textTertiary,
      marginTop: 4,
    },
    termsContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginTop: 24,
      paddingHorizontal: 8,
    },
    termsText: {
      flex: 1,
      fontSize: 12,
      color: theme.textTertiary,
      lineHeight: 18,
    },
  });
