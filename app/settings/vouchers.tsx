import { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Gift,
  Ticket,
  Clock,
  Crown,
  Zap,
  CheckCircle,
} from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useVoucherStore } from '@/stores/voucher.store';
import { Button, Input } from '@/components/ui';
import { VoucherSuccessModal } from '@/components/voucher';
import { VoucherRedemptionResult, VoucherBenefitType } from '@/types';
import { alert } from '@/components/ui/AlertModal';

function formatDate(dateString?: string): string {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getBenefitLabel(type: VoucherBenefitType, value: number): string {
  switch (type) {
    case 'LIFETIME_PRO':
      return 'Lifetime PRO';
    case 'FREE_MONTHS':
      return `${value} month${value > 1 ? 's' : ''} PRO`;
    case 'DISCOUNT_PERCENT':
      return `${value}% discount`;
    default:
      return 'Unknown';
  }
}

export default function VouchersScreen() {
  const { theme } = useTheme();
  const inputRef = useRef<TextInput>(null);

  const {
    isRedeeming,
    isLoadingHistory,
    redemptionHistory,
    redeemVoucher,
    fetchRedemptionHistory,
  } = useVoucherStore();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<VoucherRedemptionResult | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    fetchRedemptionHistory();
  }, []);

  const handleRedeem = async () => {
    if (!code.trim()) {
      setError('Please enter a voucher code');
      return;
    }

    setError(null);
    const result = await redeemVoucher(code);

    if (result.success) {
      setCode('');
      setSuccessResult(result);
    } else {
      setError(result.message);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRedemptionHistory();
    setRefreshing(false);
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
        <Text style={styles.pageTitle}>Redeem Voucher</Text>
        <Text style={styles.pageSubtitle}>
          Enter a voucher code to unlock PRO features or special benefits
        </Text>

        {/* Voucher input section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
              <Gift size={24} color={theme.primary} />
            </View>
            <Text style={styles.sectionTitle}>Enter Voucher Code</Text>
          </View>

          <Input
            ref={inputRef}
            placeholder="Enter code (e.g., FORKOFF2024)"
            value={code}
            onChangeText={(text) => {
              setCode(text.toUpperCase());
              setError(null);
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            error={error || undefined}
            leftIcon={<Ticket size={20} color={theme.textTertiary} />}
            returnKeyType="done"
            onSubmitEditing={handleRedeem}
            editable={!isRedeeming}
          />

          <Button
            title={isRedeeming ? 'Redeeming...' : 'Redeem Voucher'}
            onPress={handleRedeem}
            fullWidth
            loading={isRedeeming}
            disabled={!code.trim() || isRedeeming}
          />

          <Text style={styles.hint}>
            Voucher codes can be found in promotional emails, partner offers, or special campaigns.
          </Text>
        </View>

        {/* Redemption History */}
        {redemptionHistory.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconContainer, { backgroundColor: theme.success + '20' }]}>
                <CheckCircle size={24} color={theme.success} />
              </View>
              <Text style={styles.sectionTitle}>Redemption History</Text>
            </View>

            <View style={styles.historyList}>
              {redemptionHistory.map((redemption) => (
                <View key={redemption.id} style={styles.historyItem}>
                  <View style={styles.historyIcon}>
                    {redemption.benefitType === 'LIFETIME_PRO' ? (
                      <Crown size={20} color={theme.warning} />
                    ) : (
                      <Zap size={20} color={theme.primary} />
                    )}
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyCode}>{redemption.code}</Text>
                    <Text style={styles.historyBenefit}>
                      {getBenefitLabel(redemption.benefitType, redemption.benefitValue)}
                    </Text>
                    {redemption.campaignName && (
                      <Text style={styles.historyCampaign}>
                        {redemption.campaignName}
                      </Text>
                    )}
                  </View>
                  <View style={styles.historyMeta}>
                    <Text style={styles.historyDate}>
                      {formatDate(redemption.redeemedAt)}
                    </Text>
                    {redemption.benefitExpiresAt && (
                      <View style={styles.expiryBadge}>
                        <Clock size={12} color={theme.textTertiary} />
                        <Text style={styles.expiryText}>
                          {formatDate(redemption.benefitExpiresAt)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Empty state */}
        {redemptionHistory.length === 0 && !isLoadingHistory && (
          <View style={styles.emptyState}>
            <Ticket size={48} color={theme.textTertiary} />
            <Text style={styles.emptyText}>No vouchers redeemed yet</Text>
            <Text style={styles.emptyHint}>
              Enter a code above to redeem your first voucher
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Success Modal */}
      <VoucherSuccessModal
        visible={!!successResult}
        onClose={() => setSuccessResult(null)}
        result={successResult}
      />
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
      marginBottom: 16,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
    },
    hint: {
      color: theme.textTertiary,
      fontSize: 12,
      marginTop: 12,
      textAlign: 'center',
    },
    historyList: {
      gap: 12,
    },
    historyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 10,
      padding: 12,
    },
    historyIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: theme.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    historyInfo: {
      flex: 1,
    },
    historyCode: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    historyBenefit: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 2,
    },
    historyCampaign: {
      fontSize: 12,
      color: theme.textTertiary,
      marginTop: 2,
    },
    historyMeta: {
      alignItems: 'flex-end',
    },
    historyDate: {
      fontSize: 12,
      color: theme.textTertiary,
    },
    expiryBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4,
    },
    expiryText: {
      fontSize: 11,
      color: theme.textTertiary,
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
  });
