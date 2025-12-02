/**
 * Combined export file for all Travel Features hooks
 *
 * This file provides a single import point for all travel-related hooks:
 * - Travel Groups hooks
 * - Women's Safety hooks
 *
 * Usage:
 * ```typescript
 * import { useTravelGroups, useWomenGuides } from '@/hooks/useTravelFeatures';
 * ```
 */

// Re-export all Travel Groups hooks
export {
  useTravelGroups,
  useInfiniteTravelGroups,
  useTravelGroup,
  useTravelGroupMembers,
  useMatchingTravelGroups,
  useCreateTravelGroup,
  useUpdateTravelGroup,
  useDeleteTravelGroup,
  useJoinTravelGroup,
  useLeaveTravelGroup,
  useInviteToTravelGroup,
} from './useTravelGroups';

// Re-export all Women's Safety hooks
export {
  useWomenGuides,
  useInfiniteWomenGuides,
  useWomenGuide,
  useBookGuide,
  useGuideReview,
  useSafetyResources,
  useMarkResourceHelpful,
  useWomenSafetySettings,
  useUpdateWomenSafetySettings,
} from './useWomenSafety';

// Re-export types for convenience
export type {
  TravelGroupFilters,
  TravelGroup,
  TravelGroupMember,
  CreateTravelGroupData,
  UpdateTravelGroupData,
} from './useTravelGroups';

export type {
  WomenGuideFilters,
  WomenGuide,
  GuideReview,
  GuideBooking,
  BookGuideData,
  SubmitGuideReviewData,
  SafetyResourceFilters,
  SafetyResource,
  WomenSafetySettings,
  UpdateWomenSafetySettingsData,
} from './useWomenSafety';
