/**
 * Investor-Project Matching Algorithm
 *
 * This utility provides intelligent matching between investor profiles and projects
 * based on multiple criteria including industries, stages, geographic focus, and more.
 */

export interface InvestorProfile {
  industries?: string[];
  investment_stages?: string[];
  geographic_focus?: string[];
  investor_type?: string;
  // Add more fields as needed
}

export interface Project {
  id: string;
  title: string;
  categories?: string[];
  stage?: string;
  location?: string;
  team_location?: string;
  // Add more fields as needed
}

/**
 * Calculate match score between an investor profile and a project
 * Returns a score from 0-100
 */
export function calculateMatchScore(
  investor: InvestorProfile,
  project: Project
): number {
  let score = 0;
  let maxScore = 0;

  // 1. Industry/Category Match (40 points max)
  if (investor.industries && investor.industries.length > 0 && project.categories) {
    maxScore += 40;
    const matchingIndustries = investor.industries.filter((industry) =>
      project.categories?.some((category) =>
        category.toLowerCase().includes(industry.toLowerCase()) ||
        industry.toLowerCase().includes(category.toLowerCase())
      )
    );
    const industryMatchRatio = matchingIndustries.length / investor.industries.length;
    score += Math.round(industryMatchRatio * 40);
  }

  // 2. Stage Match (30 points max)
  if (investor.investment_stages && investor.investment_stages.length > 0 && project.stage) {
    maxScore += 30;
    const stageMatches = investor.investment_stages.some((stage) =>
      project.stage?.toLowerCase().includes(stage.toLowerCase()) ||
      stage.toLowerCase().includes(project.stage?.toLowerCase() || '')
    );
    if (stageMatches) {
      score += 30;
    }
  }

  // 3. Geographic Match (20 points max)
  if (investor.geographic_focus && investor.geographic_focus.length > 0) {
    maxScore += 20;
    const projectLocation = project.location || project.team_location || '';
    const geoMatches = investor.geographic_focus.some((region) =>
      projectLocation.toLowerCase().includes(region.toLowerCase()) ||
      region.toLowerCase().includes(projectLocation.toLowerCase())
    );
    if (geoMatches) {
      score += 20;
    }
  }

  // 4. Baseline score for any project (10 points)
  maxScore += 10;
  score += 10;

  // Normalize score to 0-100 range
  if (maxScore === 0) return 0;
  return Math.round((score / maxScore) * 100);
}

/**
 * Filter and sort projects based on match score with investor profile
 * @param investor - The investor's profile
 * @param projects - Array of projects to match against
 * @param minScore - Minimum match score (0-100) to include a project
 * @returns Array of projects with match scores, sorted by score descending
 */
export function matchProjectsToInvestor(
  investor: InvestorProfile,
  projects: Project[],
  minScore: number = 30
): Array<Project & { matchScore: number }> {
  const projectsWithScores = projects.map((project) => ({
    ...project,
    matchScore: calculateMatchScore(investor, project),
  }));

  return projectsWithScores
    .filter((p) => p.matchScore >= minScore)
    .sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Check if a project matches any of the investor's criteria
 * @param investor - The investor's profile
 * @param project - The project to check
 * @returns true if the project matches at least one criterion
 */
export function doesProjectMatch(
  investor: InvestorProfile,
  project: Project
): boolean {
  // Check industry match
  if (investor.industries && investor.industries.length > 0 && project.categories) {
    const hasIndustryMatch = investor.industries.some((industry) =>
      project.categories?.some((category) =>
        category.toLowerCase().includes(industry.toLowerCase()) ||
        industry.toLowerCase().includes(category.toLowerCase())
      )
    );
    if (hasIndustryMatch) return true;
  }

  // Check stage match
  if (investor.investment_stages && investor.investment_stages.length > 0 && project.stage) {
    const hasStageMatch = investor.investment_stages.some((stage) =>
      project.stage?.toLowerCase().includes(stage.toLowerCase()) ||
      stage.toLowerCase().includes(project.stage?.toLowerCase() || '')
    );
    if (hasStageMatch) return true;
  }

  // Check geographic match
  if (investor.geographic_focus && investor.geographic_focus.length > 0) {
    const projectLocation = project.location || project.team_location || '';
    const hasGeoMatch = investor.geographic_focus.some((region) =>
      projectLocation.toLowerCase().includes(region.toLowerCase()) ||
      region.toLowerCase().includes(projectLocation.toLowerCase())
    );
    if (hasGeoMatch) return true;
  }

  return false;
}

/**
 * Get a human-readable explanation of why a project matches
 * @param investor - The investor's profile
 * @param project - The project
 * @returns Array of match reasons
 */
export function getMatchReasons(
  investor: InvestorProfile,
  project: Project
): string[] {
  const reasons: string[] = [];

  // Industry matches
  if (investor.industries && project.categories) {
    const matchingIndustries = investor.industries.filter((industry) =>
      project.categories?.some((category) =>
        category.toLowerCase().includes(industry.toLowerCase()) ||
        industry.toLowerCase().includes(category.toLowerCase())
      )
    );
    if (matchingIndustries.length > 0) {
      reasons.push(`Matches your interest in: ${matchingIndustries.join(', ')}`);
    }
  }

  // Stage matches
  if (investor.investment_stages && project.stage) {
    const matchingStages = investor.investment_stages.filter((stage) =>
      project.stage?.toLowerCase().includes(stage.toLowerCase()) ||
      stage.toLowerCase().includes(project.stage?.toLowerCase() || '')
    );
    if (matchingStages.length > 0) {
      reasons.push(`In your preferred stage: ${matchingStages.join(', ')}`);
    }
  }

  // Geographic matches
  if (investor.geographic_focus) {
    const projectLocation = project.location || project.team_location || '';
    const matchingRegions = investor.geographic_focus.filter((region) =>
      projectLocation.toLowerCase().includes(region.toLowerCase()) ||
      region.toLowerCase().includes(projectLocation.toLowerCase())
    );
    if (matchingRegions.length > 0) {
      reasons.push(`Located in your focus region: ${matchingRegions.join(', ')}`);
    }
  }

  return reasons;
}
