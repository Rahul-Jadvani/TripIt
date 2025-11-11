/**
 * Randomized loading captions for the coffee loader animation
 * These provide better user experience during data loading
 */

export const loadingCaptions = {
  general: [
    'Brewing quality data for you...',
    'Enjoy your coffee while we load',
    'Preparing everything fresh',
    'Loading with care and precision',
    'Getting things ready just for you',
    'Percolating through the data',
    'Sit back and relax while we work',
    'Building your experience',
    'Fetching the good stuff',
    'Making magic happen behind the scenes',
    'Warming up the system',
    'Loading quality content',
    'Gathering the pieces together',
    'Getting ready to amaze you',
  ],
  validator: [
    'Gathering validation projects',
    'Loading your dashboard',
    'Retrieving assigned projects',
    'Preparing validation queue',
    'Fetching project details',
    'Loading your stats',
    'Getting projects ready for review',
    'Assembling your validation list',
    'Loading validation data',
    'Preparing projects to review',
    'Gathering assignments',
    'Retrieving your validation queue',
  ],
  admin: [
    'Loading admin dashboard',
    'Gathering system data',
    'Preparing admin controls',
    'Loading user data',
    'Retrieving analytics',
    'Preparing dashboard',
    'Loading admin tools',
    'Gathering system information',
  ],
  profile: [
    'Loading your profile',
    'Preparing your stats',
    'Gathering achievements',
    'Loading user data',
    'Preparing profile information',
    'Collecting your accomplishments',
  ],
  projects: [
    'Loading projects',
    'Gathering project data',
    'Preparing project list',
    'Fetching projects',
    'Loading project information',
    'Preparing projects for you',
  ],
};

/**
 * Get a random caption from a specific category
 */
export function getRandomCaption(
  category: keyof typeof loadingCaptions = 'general'
): string {
  const captions = loadingCaptions[category];
  return captions[Math.floor(Math.random() * captions.length)];
}

/**
 * Get a random caption from general category
 */
export function getRandomLoadingMessage(): string {
  return getRandomCaption('general');
}
