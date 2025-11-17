"""
GitHub Repository and Team Analysis
Uses GitHub API to analyze code quality and team experience
"""
from github import Github, GithubException
from datetime import datetime, timedelta
import re


class GitHubAnalyzer:
    """Analyzes GitHub repositories and team members"""

    def __init__(self, access_token=None):
        """
        Initialize GitHub analyzer

        Args:
            access_token: GitHub personal access token
        """
        self.github = Github(access_token) if access_token else Github()

    def analyze(self, repo_url, team_members=None):
        """
        Analyze GitHub repo and team

        Args:
            repo_url: GitHub repository URL
            team_members: List of team member dicts with github_username

        Returns:
            Dict with repo_quality_score, team_quality_score, and details
        """
        try:
            # Extract owner/repo from URL
            owner_repo = self._extract_owner_repo(repo_url)
            if not owner_repo:
                return self._error_result("Invalid GitHub URL")

            # Analyze repository
            repo_result = self.analyze_repo(owner_repo)

            # Analyze team if provided
            team_result = {'score': 50, 'details': 'No team data'}
            if team_members:
                team_result = self.analyze_team(team_members, owner_repo)

            # Combine scores (50-50 split)
            final_score = (repo_result['score'] * 0.5 + team_result['score'] * 0.5)

            return {
                'score': round(final_score, 2),
                'repo_quality': repo_result,
                'team_quality': team_result
            }

        except Exception as e:
            return self._error_result(str(e))

    def analyze_repo(self, owner_repo):
        """
        Analyze repository quality

        Args:
            owner_repo: "owner/repo" string

        Returns:
            Dict with score and analysis details
        """
        try:
            repo = self.github.get_repo(owner_repo)

            scores = {
                'repo_structure': self._analyze_repo_structure(repo),
                'readme_quality': self._analyze_readme(repo),
                'file_organization': self._analyze_file_organization(repo),
                'code_patterns': self._analyze_code_patterns(repo)
            }

            # Average score
            avg_score = sum(scores.values()) / len(scores)

            return {
                'score': round(avg_score, 2),
                'details': scores,
                'stars': repo.stargazers_count,
                'forks': repo.forks_count,
                'open_issues': repo.open_issues_count,
                'last_updated': repo.updated_at.isoformat() if repo.updated_at else None
            }

        except GithubException as e:
            return self._error_result(f"GitHub API error: {e.status}")

    def analyze_team(self, team_members, owner_repo):
        """
        Analyze team member GitHub profiles

        Args:
            team_members: List of dicts with github_username
            owner_repo: "owner/repo" string for contribution analysis

        Returns:
            Dict with team quality score and details
        """
        try:
            team_scores = []

            for member in team_members:
                username = member.get('github_username')
                if not username:
                    continue

                try:
                    user = self.github.get_user(username)
                    score = self._analyze_user_profile(user)
                    team_scores.append(score)
                except:
                    continue

            if not team_scores:
                return {'score': 50, 'details': 'No valid GitHub profiles'}

            avg_score = sum(team_scores) / len(team_scores)

            return {
                'score': round(avg_score, 2),
                'team_size': len(team_scores),
                'details': 'Team analysis complete'
            }

        except Exception as e:
            return {'score': 50, 'details': f'Team analysis error: {str(e)}'}

    def _analyze_repo_structure(self, repo):
        """Analyze repository file structure (0-100)"""
        score = 50  # Base score

        try:
            # Check for common project files
            contents = repo.get_contents("")

            has_readme = any(f.name.lower() == 'readme.md' for f in contents)
            has_license = any('license' in f.name.lower() for f in contents)
            has_gitignore = any(f.name == '.gitignore' for f in contents)

            if has_readme:
                score += 20
            if has_license:
                score += 15
            if has_gitignore:
                score += 15

            return min(score, 100)

        except:
            return 50

    def _analyze_readme(self, repo):
        """Analyze README quality (0-100)"""
        try:
            readme = repo.get_readme()
            content = readme.decoded_content.decode('utf-8')

            score = 30  # Base score for having README

            # Check length
            if len(content) > 500:
                score += 20
            if len(content) > 1500:
                score += 10

            # Check for sections
            if re.search(r'#+\s*(install|setup|usage)', content, re.I):
                score += 20
            if re.search(r'#+\s*(example|demo)', content, re.I):
                score += 10
            if re.search(r'#+\s*(contributing|license)', content, re.I):
                score += 10

            return min(score, 100)

        except:
            return 0  # No README

    def _analyze_file_organization(self, repo):
        """Analyze file organization (0-100)"""
        try:
            contents = repo.get_contents("")
            file_names = [f.name for f in contents]

            score = 50

            # Check for organized structure
            has_src = any(f in file_names for f in ['src', 'lib', 'app'])
            has_tests = any(f in file_names for f in ['tests', 'test', '__tests__'])
            has_docs = any(f in file_names for f in ['docs', 'documentation'])
            has_config = any(f in file_names for f in ['config', 'configs', '.env.example'])

            if has_src:
                score += 15
            if has_tests:
                score += 20
            if has_docs:
                score += 10
            if has_config:
                score += 5

            return min(score, 100)

        except:
            return 50

    def _analyze_code_patterns(self, repo):
        """Analyze code patterns and quality indicators (0-100)"""
        score = 50  # Base score

        try:
            # Check commit frequency
            commits = list(repo.get_commits()[:10])
            if len(commits) >= 5:
                score += 20

            # Check branch protection
            if repo.default_branch:
                score += 10

            # Check for continuous integration
            try:
                workflows = repo.get_workflows()
                if workflows.totalCount > 0:
                    score += 20
            except:
                pass

            return min(score, 100)

        except:
            return 50

    def _analyze_user_profile(self, user):
        """Analyze individual user GitHub profile (0-100)"""
        score = 40  # Base score

        try:
            # Public repos count
            if user.public_repos > 5:
                score += 15
            if user.public_repos > 15:
                score += 10

            # Followers
            if user.followers > 10:
                score += 10
            if user.followers > 50:
                score += 10

            # Contributions
            if user.public_gists > 0:
                score += 5

            # Account age
            if user.created_at:
                days_old = (datetime.utcnow() - user.created_at).days
                if days_old > 365:
                    score += 10

            return min(score, 100)

        except:
            return 40

    def _extract_owner_repo(self, repo_url):
        """Extract owner/repo from GitHub URL"""
        # Handle different URL formats
        patterns = [
            r'github\.com/([^/]+)/([^/]+)',
            r'github\.com:([^/]+)/([^/]+)',
        ]

        for pattern in patterns:
            match = re.search(pattern, repo_url)
            if match:
                owner, repo = match.groups()
                # Remove .git suffix if present
                repo = repo.replace('.git', '')
                return f"{owner}/{repo}"

        return None

    def _error_result(self, error_msg):
        """Return error result structure"""
        return {
            'score': 0,
            'error': error_msg,
            'repo_quality': {'score': 0, 'error': error_msg},
            'team_quality': {'score': 0, 'error': error_msg}
        }
